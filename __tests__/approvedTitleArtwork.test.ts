import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  APPROVED_TITLE_ART,
  isApprovedTitleArtworkId,
} from '../src/services/activity/approvedTitleArtwork';
import {
  ACHIEVEMENT_ART,
  LEGACY_TITLE_ARTWORK_IDS,
  SERVER_TITLE_ART,
  getTitleArtwork,
} from '../src/services/activity/titleArtwork';
import manifest from '../src/assets/activity/titles-v2/manifest.json';

it('registers all 332 approved unique images without granting new titles', () => {
  expect(Object.keys(APPROVED_TITLE_ART)).toHaveLength(332);
  expect(manifest.assets).toHaveLength(332);
  expect(new Set(manifest.assets.map(a => a.sourceSha256)).size).toBe(332);
  expect(new Set(manifest.assets.map(a => a.runtimeSha256)).size).toBe(332);
  expect(manifest.awardsChanged).toBe(false);
  expect(Object.keys(ACHIEVEMENT_ART)).toHaveLength(15);
  expect(Object.keys(SERVER_TITLE_ART)).toHaveLength(11);
});

it.each(manifest.assets)('$id has an intact transparent 384px runtime asset', asset => {
  expect(isApprovedTitleArtworkId(asset.id)).toBe(true);
  const buffer = fs.readFileSync(path.join(__dirname, '..', asset.file));
  expect(createHash('sha256').update(buffer).digest('hex')).toBe(asset.runtimeSha256);
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buffer.readUInt32BE(16)).toBe(384);
  expect(buffer.readUInt32BE(20)).toBe(384);
  expect(buffer[25]).toBe(6);
  expect(asset.visibleEdgePixels).toBe(0);
  expect(getTitleArtwork(asset.id)).toBeDefined();
});

it('keeps explicit legacy aliases unique between distinct dashboard titles', () => {
  expect(new Set(Object.values(LEGACY_TITLE_ARTWORK_IDS)).size).toBe(15);
  for (const [legacy, id] of Object.entries(LEGACY_TITLE_ARTWORK_IDS)) {
    expect(getTitleArtwork(legacy)).toBe(APPROVED_TITLE_ART[id]);
  }
  expect(SERVER_TITLE_ART.first_walk_friend).toBe(ACHIEVEMENT_ART.pet_first_walk_friend);
  expect(SERVER_TITLE_ART.neighborhood_walker).toBe(APPROVED_TITLE_ART.WK07);
  expect(SERVER_TITLE_ART.walk_king).toBe(APPROVED_TITLE_ART.WK10);
  expect(SERVER_TITLE_ART.record_master).toBe(APPROVED_TITLE_ART.MR08);
});

it.each([null, undefined, '', 'constructor', '__proto__', 'WK00', 'WK21', 'x01'])(
  'does not guess artwork for an unavailable identifier %s', id => {
    expect(getTitleArtwork(id)).toBeUndefined();
  },
);
