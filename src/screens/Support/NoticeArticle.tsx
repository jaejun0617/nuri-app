import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { Copy, ui } from './PreviewPrimitives';
import ReferenceArtwork from './ReferenceArtwork';
import { inquiryDate } from './InquiryPresentation';

export default function NoticeArticle({
  title,
  category,
  publishedAt,
  body,
  summary,
  pinned,
}: {
  title: string;
  category: string;
  publishedAt: string;
  body: string;
  summary?: string;
  pinned?: boolean;
}) {
  const theme = useTheme();
  const date = inquiryDate(publishedAt, true);
  return (
    <View style={styles.article}>
      <View style={styles.header}>
        <View style={ui.grow}>
          <Copy muted>{pinned ? `주요 공지 · ${category}` : category}</Copy>
          <Copy title>{title}</Copy>
          {date ? <Copy muted>{date}</Copy> : null}
        </View>
        <ReferenceArtwork kind="notice" size={80} />
      </View>
      {summary ? <Copy muted>{summary}</Copy> : null}
      <View
        style={[styles.divider, { backgroundColor: theme.colors.border }]}
      />
      {body
        .trim()
        .split(/\n\s*\n/)
        .map((paragraph, index) => (
          <Copy key={index}>{paragraph}</Copy>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  article: { gap: 18, paddingVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { height: StyleSheet.hairlineWidth },
});
