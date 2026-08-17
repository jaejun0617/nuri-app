// 파일: src/screens/Main/components/LoggedInHome/CommunitySection.tsx
// 목적:
// - Home 개인 기록 흐름 뒤에 서버가 선별한 Community category 결과를 최대 3개만 보여준다.
// - 목록 store의 filter/category/page 상태를 건드리지 않고, Home 전용 cache를 사용한다.
// - Community 장애가 Home의 다른 섹션을 차단하지 않도록 상태 경계를 분리한다.

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../../app/ui/AppText';
import type { CommunityPost } from '../../../../types/community';
import {
  HOME_COMMUNITY_TAB_OPTIONS,
  type HomeCommunityTab,
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

function resolveCommunityPostCategoryLabel(post: CommunityPost) {
  switch (post.category) {
    case 'question':
      return '질문';
    case 'info':
      return '정보';
    case 'daily':
      return '일상';
    case 'free':
      return '자유';
    default:
      return null;
  }
}

function getPostAccessibilityLabel(post: CommunityPost, position: number) {
  const title = resolveCommunityPostTitle(post);
  const category = resolveCommunityPostCategoryLabel(post);
  const categoryText = category ? `${category}, ` : '';
  return `표시 순서 ${position}, ${title}, ${categoryText}좋아요 ${post.likeCount}개, 댓글 ${post.commentCount}개`;
}

type PostCardProps = {
  post: CommunityPost;
  accentColor: string;
  accentBorder: string;
  position: number;
  featured: boolean;
  onPress: (postId: string) => void;
};

const PostRow = memo(function PostRow({
  post,
  accentColor,
  accentBorder,
  position,
  featured,
  onPress,
}: PostCardProps) {
  const theme = useTheme();
  const title = useMemo(() => resolveCommunityPostTitle(post), [post]);
  const category = resolveCommunityPostCategoryLabel(post);

  const handlePress = useCallback(() => {
    onPress(post.id);
  }, [onPress, post.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={getPostAccessibilityLabel(post, position)}
      android_ripple={{ color: `${accentColor}12` }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.postRow,
        {
          backgroundColor: pressed ? `${accentColor}08` : 'transparent',
          borderColor: accentBorder || theme.colors.border,
        },
      ]}
    >
      <AppText
        preset="titleMd"
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.position, { color: accentColor }]}
      >
        {position}
      </AppText>

      <View style={styles.postBody} pointerEvents="none">
        <AppText
          preset="cardTitle"
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
          {category ? (
            <AppText
              preset="caption"
              numberOfLines={1}
              style={[styles.category, { color: accentColor }]}
            >
              {category}
            </AppText>
          ) : null}
          <AppText
            preset="caption"
            numberOfLines={1}
            style={[styles.metadataText, { color: theme.colors.textMuted }]}
          >
            좋아요 {post.likeCount}
          </AppText>
          <AppText
            preset="caption"
            numberOfLines={1}
            style={[styles.metadataText, { color: theme.colors.textMuted }]}
          >
            댓글 {post.commentCount}
          </AppText>
        </View>
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
      <View style={styles.skeletonList}>
        {[0, 1, 2].map(index => (
          <React.Fragment key={`community-skeleton-${index}`}>
            <View style={styles.skeletonRow}>
              <View style={[styles.skeletonNumber, { backgroundColor: borderColor }]} />
              <View style={styles.skeletonText}>
                <View style={[styles.skeletonLine, { backgroundColor: fillColor }]} />
                <View style={[styles.skeletonShortLine, { backgroundColor: fillColor }]} />
              </View>
            </View>
            {index < 2 ? (
              <View style={[styles.separator, { backgroundColor: borderColor }]} />
            ) : null}
          </React.Fragment>
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
      <AppText preset="bodySm" style={[styles.stateText, { color: textColor }]}>
        {title}
      </AppText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="커뮤니티 다시 시도"
          style={[styles.retryButton, { backgroundColor: buttonColor ?? textColor }]}
          onPress={onRetry}
        >
          <AppText preset="button" style={[styles.retryText, { color: '#FFFFFF' }]}>
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
  const [activeTab, setActiveTab] = useState<HomeCommunityTab>('popular');
  const [state, setState] = useState<CommunitySectionState>(() => {
    const cached = getHomeCommunityHighlightsCache('popular');
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

  const load = useCallback((tab: HomeCommunityTab, force: boolean) => {
    const requestId = ++requestSequenceRef.current;
    const cached = getHomeCommunityHighlightsCache(tab);

    setState({
      status: cached?.items.length ? 'ready' : 'loading',
      items: cached?.items ?? [],
    });

    fetchHomeCommunityHighlights(tab, { force })
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

    const cached = getHomeCommunityHighlightsCache(activeTab);
    if (cached?.isFresh) {
      setState({ status: 'ready', items: cached.items });
      return;
    }

    // Existing stale rows remain visible during background refresh. A new
    // response can only update the active request sequence.
    load(activeTab, Boolean(cached));
  }, [activeTab, isFocused, load]);

  const handleTabPress = useCallback((tab: HomeCommunityTab) => {
    if (tab === activeTab) return;

    requestSequenceRef.current += 1;
    const cached = getHomeCommunityHighlightsCache(tab);
    setActiveTab(tab);
    setState({
      status: cached?.items.length ? 'ready' : 'loading',
      items: cached?.items ?? [],
    });
  }, [activeTab]);

  const handleRetry = useCallback(() => {
    load(activeTab, true);
  }, [activeTab, load]);

  const borderColor = accentBorder || theme.colors.border;
  const showErrorState = state.status === 'error' && state.items.length === 0;
  const showInlineError = state.status === 'error' && state.items.length > 0;

  return (
    <View style={styles.section} accessibilityLabel="반려인들이 주목한 이야기">
      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor,
          },
        ]}
      >
        <View
          style={styles.titleRow}
          accessible
          accessibilityRole="header"
          accessibilityLabel="커뮤니티, 반려인들이 주목한 이야기"
        >
          <Feather
            name="message-circle"
            size={20}
            color={theme.colors.brand}
            accessible={false}
            importantForAccessibility="no"
          />
          <AppText preset="unifiedTitle" style={[styles.title, { color: theme.colors.textPrimary }]}>
            반려인들이 주목한 이야기
          </AppText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillContent}
          accessibilityLabel="커뮤니티 카테고리 선택"
        >
          {HOME_COMMUNITY_TAB_OPTIONS.map(option => {
            const isActive = activeTab === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="tab"
                accessibilityLabel={`${option.label} 탭`}
                accessibilityState={{ selected: isActive }}
                onPress={() => handleTabPress(option.key)}
                style={styles.pillTouch}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.pillVisual,
                      {
                        backgroundColor: isActive
                          ? pressed
                            ? `${accentColor}E6`
                            : accentColor
                          : pressed
                            ? accentTint
                            : theme.colors.surfaceElevated,
                        borderColor: isActive ? accentColor : borderColor,
                      },
                    ]}
                  >
                    <AppText
                      preset="tab"
                      style={[
                        styles.pillText,
                        { color: isActive ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {option.label}
                    </AppText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

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
            <View style={styles.postList}>
              {state.items.slice(0, 3).map((post, index, posts) => (
                <React.Fragment key={post.id}>
                  <PostRow
                    post={post}
                    accentColor={accentColor}
                    accentBorder={borderColor}
                    position={index + 1}
                    featured={index === 0}
                    onPress={onPressPost}
                  />
                  {index < posts.length - 1 ? (
                    <View
                      style={[styles.separator, { backgroundColor: borderColor }]}
                      pointerEvents="none"
                    />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          )}
          {showInlineError ? (
            <StateBox
              title="커뮤니티를 불러오지 못했어요"
              borderColor={borderColor}
              textColor={theme.colors.textSecondary}
              buttonColor={accentColor}
              onRetry={handleRetry}
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="커뮤니티 전체 보기"
          onPress={onPressAll}
          style={({ pressed }) => [
            styles.allButton,
            {
              borderColor,
              backgroundColor: pressed ? `${accentColor}08` : 'transparent',
            },
          ]}
        >
          <AppText preset="button" style={[styles.allButtonText, { color: accentColor }]}>
            전체 보기
          </AppText>
          <Feather name="chevron-right" size={17} color={accentColor} />
        </Pressable>
      </View>
    </View>
  );
});

export default CommunitySection;
