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

  it('필수 공개 정책 문서는 external URL을 가진다', () => {
    expect(LEGAL_DOCUMENTS.terms.status).toBe('external');
    expect(LEGAL_DOCUMENTS.terms.url).toBe(
      'https://amazing-quesadilla-9a8.notion.site/NURI-3364a8f4e2ee8077a3ffc1d5968ddac7',
    );

    expect(LEGAL_DOCUMENTS.privacy.status).toBe('external');
    expect(LEGAL_DOCUMENTS.privacy.url).toBe(
      'https://amazing-quesadilla-9a8.notion.site/NURI-3364a8f4e2ee8045ba30d9ac3c0f3417',
    );

    expect(LEGAL_DOCUMENTS.accountDeletion.status).toBe('external');
    expect(LEGAL_DOCUMENTS.accountDeletion.url).toBe(
      'https://amazing-quesadilla-9a8.notion.site/NURI-3364a8f4e2ee8080abbaf670c1e24ae1',
    );
  });

  it('마케팅 수신 안내도 draft source를 가진다', () => {
    expect(LEGAL_DOCUMENTS.marketing.status).toBe('draft');
    expect(LEGAL_DOCUMENTS.marketing.draftPath).toBe(
      'docs/policies/마케팅-수신-안내-초안.md',
    );
  });

  it('필수 정책 문서는 repo 최종본 경로를 가리킨다', () => {
    expect(LEGAL_DOCUMENTS.terms.draftPath).toBe('docs/policies/이용약관.md');
    expect(LEGAL_DOCUMENTS.privacy.draftPath).toBe(
      'docs/policies/개인정보처리방침.md',
    );
    expect(LEGAL_DOCUMENTS.accountDeletion.draftPath).toBe(
      'docs/policies/계정-삭제-탈퇴-안내.md',
    );
  });
});
