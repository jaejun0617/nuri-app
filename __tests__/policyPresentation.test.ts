import {
  POLICY_DOCUMENT_ORDER,
  POLICY_PRESENTATION_DOCUMENTS,
  getPolicyPresentationDocument,
} from '../src/services/legal/presentation';

describe('policy presentation model', () => {
  it('resolves every approved user-facing policy identity', () => {
    expect(POLICY_DOCUMENT_ORDER).toEqual([
      'terms',
      'privacy',
      'community',
      'accountDeletion',
      'marketing',
    ]);

    for (const documentId of POLICY_DOCUMENT_ORDER) {
      const document = getPolicyPresentationDocument(documentId);

      expect(document).toBe(POLICY_PRESENTATION_DOCUMENTS[documentId]);
      expect(document).toEqual(
        expect.objectContaining({
          id: documentId,
          contentStatus: 'draft_not_final',
          contentStatusLabel: '내용 검토 중',
          version: null,
          effectiveDate: null,
        }),
      );
      expect(document?.sourcePath).toMatch(/^docs\//);
      expect(document?.sections.length).toBeGreaterThan(0);
      expect(document?.sections.at(-1)?.paragraphs.length).toBeGreaterThan(0);
    }
  });

  it('returns a safe fallback result for an unknown policy identity', () => {
    expect(getPolicyPresentationDocument('unknown-policy')).toBeNull();
    expect(getPolicyPresentationDocument(undefined)).toBeNull();
  });
});
