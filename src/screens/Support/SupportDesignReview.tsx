import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import SupportPreviewScreen, {
  type PreviewNavigation,
  type SupportScreenHandle,
} from './SupportPreviewScreen';
import { isAdminDesignPage, type PreviewPage } from './previewModel';

type Review = {
  session: object | null;
  role: string | null;
  stack: PreviewNavigation[];
};

/** Development-only session-bound views; isolated notices own a separate local API session. */
export default function SupportDesignReview({
  ownerSession,
  ownerRole,
  initialPage,
  onDismiss,
  subscription,
  onSubscriptionChange,
}: {
  ownerSession: object | null;
  ownerRole: string | null;
  initialPage: PreviewPage;
  onDismiss: () => void;
  subscription?: React.ComponentProps<
    typeof SupportPreviewScreen
  >['subscription'];
  onSubscriptionChange?: React.ComponentProps<
    typeof SupportPreviewScreen
  >['onSubscriptionChange'];
}) {
  const screenRef = useRef<SupportScreenHandle>(null);
  const canReviewAdmin = ownerRole === 'admin' || ownerRole === 'super_admin';
  const [review, setReview] = useState<Review | null>(() => ({
    session: ownerSession,
    role: ownerRole,
    stack: [{ page: initialPage }],
  }));
  const boundaryLost =
    review !== null &&
    (review.session !== ownerSession || review.role !== ownerRole);
  useEffect(() => {
    if (boundaryLost) onDismiss();
  }, [boundaryLost, onDismiss]);
  if (
    !__DEV__ ||
    ((isAdminDesignPage(initialPage) || initialPage === 'isolatedFaqAdmin') &&
      !canReviewAdmin)
  )
    return null;
  const current =
    review?.session === ownerSession && review?.role === ownerRole
      ? review
      : null;
  const close = () => {
    setReview(null);
    onDismiss();
  };
  const back = () => {
    if (!current || current.stack.length <= 1) {
      close();
      return;
    }
    setReview(previous =>
      previous ? { ...previous, stack: previous.stack.slice(0, -1) } : null,
    );
  };
  return current ? (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => screenRef.current?.back()}
    >
      <SupportPreviewScreen
        ref={screenRef}
        subscription={subscription}
        onSubscriptionChange={onSubscriptionChange}
        stack={current.stack}
        onClose={close}
        onBack={back}
        onNavigate={target => {
          if (
            (isAdminDesignPage(target.page) ||
              target.page === 'isolatedFaqAdmin') &&
            !canReviewAdmin
          )
            return;
          setReview(previous =>
            previous &&
            previous.session === ownerSession &&
            previous.role === ownerRole
              ? { ...previous, stack: [...previous.stack, target] }
              : null,
          );
        }}
      />
    </Modal>
  ) : null;
}
