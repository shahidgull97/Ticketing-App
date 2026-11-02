import { useCallback, useRef, useState } from 'react';

/**
 * Wraps an async submit handler so it can never run twice concurrently (a ref flips synchronously,
 * unlike state, so double-clicks within the same frame are also ignored).
 */
export default function useSubmitGuard(handler) {
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const run = useCallback(
    async (...args) => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setSubmitting(true);
      try {
        return await handler(...args);
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [handler],
  );
  return [run, submitting];
}

