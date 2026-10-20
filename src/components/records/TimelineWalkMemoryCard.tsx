import React from 'react';
import { MemoryCard } from '../MemoryCard/MemoryCard';
import type { WalkMemorySourceSummary } from '../../services/walk/server/recordRepository';
import { walkSourceCopy } from '../../services/walk/product/presentation';

export default function TimelineWalkMemoryCard({
  source,
  ...props
}: React.ComponentProps<typeof MemoryCard> & {
  source?: WalkMemorySourceSummary;
}) {
  const bound =
    source?.memoryId === props.item.id && source.petId === props.item.petId;
  return (
    <MemoryCard
      {...props}
      metaTextOverride={bound ? walkSourceCopy(source) : props.metaTextOverride}
    />
  );
}
