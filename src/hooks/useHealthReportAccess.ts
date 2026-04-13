export function useHealthReportAccess() {
  return {
    records: 'enabled' as const,
    weight: 'enabled' as const,
    report: 'teaser' as const,
  };
}

