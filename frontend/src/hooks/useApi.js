/**
 * useApi.js — Custom hook for managing API call state.
 *
 * Wraps any async API call with consistent: data, loading, error state.
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi(tasks.list);
 *   useEffect(() => { execute({ type: 'academic' }); }, []);
 */

import { useState, useCallback } from "react";

export function useApi(apiFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFn(...args);
        setData(res?.data ?? res);
        return res;
      } catch (err) {
        setError(err.message || "Something went wrong.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset, setData };
}
