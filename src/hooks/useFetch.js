import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getErrorMessage } from '../services/api';

/**
 * GET a URL and track loading / error state. Pages never fall back to made-up data:
 * they show a spinner, then the real data, or the real error with a Retry button.
 */
export function useFetch(url, { enabled = true, pollMs = 0 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!enabled) return;
    const mine = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const res = await api.get(url);
      if (mine === seq.current) { setData(res.data); setError(''); }
    } catch (err) {
      if (mine === seq.current) setError(getErrorMessage(err, 'Could not load this page.'));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!pollMs || !enabled) return undefined;
    const t = setInterval(() => load(true), pollMs);
    return () => clearInterval(t);
  }, [pollMs, enabled, load]);

  return { data, loading, error, reload: load, setData };
}
