import { useEffect, useRef, useState } from 'react';
import { loadModel, embedQuery, rankBySimilarity, type ModelStatus } from '../lib/semantic';

interface Result {
  /** product indices + cosine scores ordered by similarity (best first), or null when inactive */
  ranked: { index: number; score: number }[] | null;
  status: ModelStatus;
  progress: number;
  querying: boolean;
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
  const reqId = useRef(0);

  const active = enabled && !!embeddings && productCount > 0;
  const q = query.trim();

  // Kick off model load as soon as semantic search is enabled.
  useEffect(() => {
    if (!active) return;
    if (status !== 'idle') return;
    setStatus('loading');
    loadModel((p) => setProgress(p))
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'));
  }, [active, status]);

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
      } catch {
        setRanked(null);
      } finally {
        if (id === reqId.current) setQuerying(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [active, q, status, embeddings, productCount]);

  return { ranked: active && q ? ranked : null, status, progress, querying };
}
