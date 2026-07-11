import { useCallback, useEffect, useRef, useState } from 'react';
import { loadModel, embedQuery, rankBySimilarity, type ModelStatus } from '../lib/semantic';

interface Result {
  /** product indices + cosine scores ordered by similarity (best first), or null when inactive */
  ranked: { index: number; score: number }[] | null;
  status: ModelStatus;
  progress: number;
  querying: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Runs semantic ranking entirely on-device. Loads the model lazily the first
 * time it's enabled, then re-ranks (debounced) whenever the query changes.
 */
export function useSemantic(
  embeddings: Float32Array | null,
  productCount: number,
  query: string,
  enabled: boolean,
): Result {
  const [status, setStatus] = useState<ModelStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [ranked, setRanked] = useState<{ index: number; score: number }[] | null>(null);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const active = enabled && !!embeddings && productCount > 0;
  const q = query.trim();

  // Kick off model load as soon as semantic search is enabled.
  useEffect(() => {
    if (!active) return;
    if (status !== 'idle') return;
    setStatus('loading');
    setError(null);
    loadModel((p) => setProgress(p))
      .then(() => setStatus('ready'))
      .catch((e) => {
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [active, status]);

  const retry = useCallback(() => {
    setStatus('idle');
    setError(null);
    setProgress(0);
  }, []);

  // Re-rank when the (debounced) query changes.
  useEffect(() => {
    if (!active || !q || status === 'error') {
      setRanked(null);
      setQuerying(false);
      return;
    }
    const id = ++reqId.current;
    setQuerying(true);
    const timer = setTimeout(async () => {
      try {
        const vec = await embedQuery(q);
        if (id !== reqId.current) return;
        const scored = rankBySimilarity(vec, embeddings!, productCount);
        if (id !== reqId.current) return;
        setRanked(scored);
      } catch (e) {
        setRanked(null);
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (id === reqId.current) setQuerying(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [active, q, status, embeddings, productCount]);

  return { ranked: active && q ? ranked : null, status, progress, querying, error, retry };
}
