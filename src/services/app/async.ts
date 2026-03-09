export type LatestRequestController = {
  begin: () => number;
  isCurrent: (requestId: number) => boolean;
  cancel: () => void;
};

export function createLatestRequestController(): LatestRequestController {
  let currentRequestId = 0;
  let active = true;

  return {
    begin() {
      currentRequestId += 1;
      return currentRequestId;
    },
    isCurrent(requestId) {
      return active && requestId === currentRequestId;
    },
    cancel() {
      active = false;
      currentRequestId += 1;
    },
  };
}
