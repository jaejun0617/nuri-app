// 파일: src/screens/Main/components/LoggedInHome/CommunitySection.tsx
// 목적:
// - Home 개인 기록 흐름 뒤에 서버가 선별한 Community 인기글을 최대 3개만 보여준다.
// - 목록 store의 filter/category/page 상태를 건드리지 않고, Home 전용 cache를 사용한다.
// - Community 장애가 Home의 다른 섹션을 차단하지 않도록 상태 경계를 분리한다.

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import AppText from '../../../../app/ui/AppText';
import { getCommunityCategoryLabel } from '../../../../screens/Community/communityListPresentation';
import type { CommunityPost } from '../../../../types/community';
import {
  fetchHomeCommunityHighlights,
  getHomeCommunityHighlightsCache,
} from '../../../../services/home/communityHighlights';
import { styles } from './CommunitySection.styles';

type CommunitySectionProps = {
  isFocused: boolean;
  accentColor: string;
  accentTint: string;
  accentBorder: string;
  onPressPost: (postId: string) => void;
  onPressAll: () => void;
};

type CommunitySectionState = {
  status: 'loading' | 'ready' | 'error';
  items: CommunityPost[];
};

function resolveCommunityPostTitle(post: CommunityPost) {
  const explicitTitle = `${post.title ?? ''}`.trim();
  if (explicitTitle) return explicitTitle;

  const firstContentLine = post.content
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean);

  return firstContentLine || '내용이 없는 게시글';
}

function getPostAccessibilityLabel(post: CommunityPost) {
  const title = resolveCommunityPostTitle(post);
  const category = getCommunityCategoryLabel(post.category);
  return `${title}, ${category}, 좋아요 ${post.likeCount}개, 댓글 ${post.commentCount}개`;
}

type PostCardProps = {
  post: CommunityPost;
  accentColor: string;
  accentTint: string;
  accentBorder: string;
  featured: boolean;
  onPress: (postId: string) => void;
};

const PostHighlightCard = memo(function PostHighlightCard({
  post,
  accentColor,
  accentTint,
  accentBorder,
  featured,
  onPress,
}: PostCardProps) {
  const theme = useTheme();
  const title = useMemo(() => resolveCommunityPostTitle(post), [post]);
  const category = getCommunityCategoryLabel(post.category);

  const handlePress = useCallback(() => {
    onPress(post.id);
  }, [onPress, post.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={getPostAccessibilityLabel(post)}
      android_ripple={{ color: `${accentColor}12` }}
      onPress={handlePress}
      style={({ pressed }) => [
        featured ? styles.featuredCard : styles.supportRow,
        {
          backgroundColor: pressed ? `${accentColor}08` : theme.colors.surfaceElevated,
          borderColor: accentBorder || theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          featured ? styles.featuredIconWrap : styles.supportIconWrap,
          { backgroundColor: accentTint },
        ]}
        pointerEvents="none"
      >
        <MaterialCommunityIcons
          name={featured ? 'message-text-outline' : 'message-processing-outline'}
          size={featured ? 21 : 18}
          color={accentColor}
        />
      </View>

      <View style={styles.postBody} pointerEvents="none">
        <AppText
          preset="unifiedMicro"
          numberOfLines={1}
          style={[styles.category, { color: accentColor }]}
        >
          {category}
        </AppText>
        <AppText
          preset={featured ? 'unifiedTitle' : 'unifiedBody'}
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[
            featured ? styles.featuredTitle : styles.supportTitle,
            { color: theme.colors.textPrimary },
          ]}
        >
          {title}
        </AppText>
        <View style={styles.metadata}>
          <AppText
            preset="unifiedMicro"
            numberOfLines={1}
            style={[styles.metadataText, { color: theme.colors.textMuted }]}
          >
            좋아요 {post.likeCount}
          </AppText>
          <AppText
            preset="unifiedMicro"
            style={[styles.metadataSeparator, { color: theme.colors.textMuted }]}
          >
            ·
          </AppText>
          <AppText
            preset="unifiedMicro"
            numberOfLines={1}
            style={[styles.metadataText, { color: theme.colors.textMuted }]}
          >
            댓글 {post.commentCount}
          </AppText>
        </View>
      </View>

      <View style={styles.arrowSlot} pointerEvents="none">
        <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
});

const LoadingState = memo(function LoadingState({
  borderColor,
  fillColor,
}: {
  borderColor: string;
  fillColor: string;
}) {
  return (
    <View accessibilityLabel="커뮤니티를 불러오는 중이에요." accessibilityRole="progressbar">
      <View style={[styles.skeletonFeatured, { borderColor, backgroundColor: fillColor }]}>
        <View style={[styles.skeletonIcon, { backgroundColor: borderColor }]} />
        <View style={styles.skeletonText}>
          <View style={[styles.skeletonShortLine, { backgroundColor: borderColor }]} />
          <View style={[styles.skeletonLine, { backgroundColor: borderColor }]} />
          <View style={[styles.skeletonShortLine, { backgroundColor: borderColor }]} />
        </View>
      </View>
      <View style={styles.skeletonSupportList}>
        {[0, 1].map(index => (
          <View
            key={`community-skeleton-${index}`}
            style={[styles.skeletonSupport, { borderColor, backgroundColor: fillColor }]}
          >
            <View style={[styles.skeletonSupportIcon, { backgroundColor: borderColor }]} />
            <View style={styles.skeletonText}>
              <View style={[styles.skeletonLine, { backgroundColor: borderColor }]} />
              <View style={[styles.skeletonShortLine, { backgroundColor: borderColor }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

function StateBox({
  title,
  borderColor,
  textColor,
  buttonColor,
  onRetry,
}: {
  title: string;
  borderColor: string;
  textColor: string;
  buttonColor?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={[styles.stateBox, { borderColor }]}>
      <AppText preset="unifiedBody" style={[styles.stateText, { color: textColor }]}>
        {title}
      </AppText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="커뮤니티 다시 시도"
          style={[styles.retryButton, { backgroundColor: buttonColor ?? textColor }]}
          onPress={onRetry}
        >
          <AppText preset="unifiedLabel" style={[styles.retryText, { color: '#FFFFFF' }]}>
            다시 시도
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const CommunitySection = memo(function CommunitySection({
  isFocused,
  accentColor,
  accentTint,
  accentBorder,
  onPressPost,
  onPressAll,
}: CommunitySectionProps) {
  const theme = useTheme();
  const [state, setState] = useState<CommunitySectionState>(() => {
    const cached = getHomeCommunityHighlightsCache();
    return cached
      ? { status: 'ready', items: cached.items }
      : { status: 'loading', items: [] };
  });
  const requestSequenceRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback((force: boolean) => {
    const requestId = ++requestSequenceRef.current;
    const cached = getHomeCommunityHighlightsCache();

    setState({
      status: cached?.items.length ? 'ready' : 'loading',
      items: cached?.items ?? [],
    });

    fetchHomeCommunityHighlights({ force })
      .then(items => {
        if (!mountedRef.current || requestId !== requestSequenceRef.current) return;
        setState({ status: 'ready', items });
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestSequenceRef.current) return;
        setState(previous => ({ ...previous, status: 'error' }));
      });
  }, []);

  useEffect(() => {
    if (!isFocused) return;

    const cached = getHomeCommunityHighlightsCache();
    if (cached?.isFresh) {
      setState({ status: 'ready', items: cached.items });
      return;
    }

    // Existing stale rows remain visible during background refresh. A new
    // response can only update the active request sequence.
    load(Boolean(cached));
  }, [isFocused, load]);

  const handleRetry = useCallback(() => {
    load(true);
  }, [load]);

  const borderColor = accentBorder || theme.colors.border;
  const showErrorState = state.status === 'error' && state.items.length === 0;
  const showInlineError = state.status === 'error' && state.items.length > 0;

  return (
    <View
      style={styles.section}
      accessibilityLabel="반려인들이 주목한 이야기"
    >
      <View style={styles.header}>
        <AppText preset="unifiedTitle" style={[styles.title, { color: theme.colors.textPrimary }]}>
          반려인들이 주목한 이야기
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="커뮤니티 전체 보기"
          style={({ pressed }) => [
            styles.allButton,
            {
              borderColor,
              backgroundColor: pressed ? `${accentColor}08` : 'transparent',
            },
          ]}
          onPress={onPressAll}
        >
          <AppText preset="unifiedMicro" style={[styles.allButtonText, { color: accentColor }]}>
            전체 보기
          </AppText>
          <Feather name="chevron-right" size={14} color={accentColor} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {state.status === 'loading' && state.items.length === 0 ? (
          <LoadingState borderColor={`${accentColor}20`} fillColor={theme.colors.surface} />
        ) : showErrorState ? (
          <StateBox
            title="커뮤니티를 불러오지 못했어요"
            borderColor={borderColor}
            textColor={theme.colors.textSecondary}
            buttonColor={accentColor}
            onRetry={handleRetry}
          />
        ) : state.items.length === 0 ? (
          <StateBox
            title="아직 보여드릴 이야기가 없어요"
            borderColor={borderColor}
            textColor={theme.colors.textSecondary}
          />
        ) : (
          <>
            <PostHighlightCard
              post={state.items[0]}
              accentColor={accentColor}
              accentTint={accentTint}
              accentBorder={borderColor}
              featured
              onPress={onPressPost}
            />
            {state.items.length > 1 ? (
              <View style={styles.supportList}>
                {state.items.slice(1, 3).map(post => (
                  <PostHighlightCard
                    key={post.id}
                    post={post}
                    accentColor={accentColor}
                    accentTint={accentTint}
                    accentBorder={borderColor}
                    featured={false}
                    onPress={onPressPost}
                  />
                ))}
              </View>
            ) : null}
            {showInlineError ? (
              <StateBox
                title="커뮤니티를 불러오지 못했어요"
                borderColor={borderColor}
                textColor={theme.colors.textSecondary}
                buttonColor={accentColor}
                onRetry={handleRetry}
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
});

export default CommunitySection;
