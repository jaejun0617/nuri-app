import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useNavigationMotion() {
  // Prefer reduced motion until the OS setting is known; never block navigation on it.
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    let receivedChange = false;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        receivedChange = true;
        if (mounted) setReduceMotion(enabled);
      },
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted && !receivedChange) setReduceMotion(enabled);
      })
      .catch(() => {
        // An unavailable accessibility setting keeps the conservative initial policy.
      });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduceMotion;
}
