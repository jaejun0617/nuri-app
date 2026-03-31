import { LEGAL_DOCUMENTS } from '../src/services/legal/documents';

describe('legal document source of truth', () => {
  it('draft 문서는 draftPath를 가지고 external 문서는 url을 가진다', () => {
    Object.values(LEGAL_DOCUMENTS).forEach(document => {
      if (document.status === 'external') {
        expect(document.url?.trim()).toBeTruthy();
        return;
      }

      if (document.status === 'draft') {
        expect(document.draftPath?.trim()).toBeTruthy();
      }
    });
  });

  it('마케팅 수신 안내도 draft source를 가진다', () => {
    expect(LEGAL_DOCUMENTS.marketing.status).toBe('draft');
    expect(LEGAL_DOCUMENTS.marketing.draftPath).toBe(
      'docs/policies/마케팅-수신-안내-초안.md',
    );
  });
});
