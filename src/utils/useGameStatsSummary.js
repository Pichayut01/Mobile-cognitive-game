import { useCallback, useEffect, useState } from 'react';
import { buildEmptyGameStatsSummary, getGameStatsSummary } from './gameStatsStorage';

export function useGameStatsSummary(enabled = true) {
  const [summary, setSummary] = useState(() => buildEmptyGameStatsSummary());
  const [isLoading, setIsLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setSummary(buildEmptyGameStatsSummary());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const nextSummary = await getGameStatsSummary();
      setSummary(nextSummary);
    } catch (error) {
      console.error('Unable to load game stats summary.', error);
      setSummary(buildEmptyGameStatsSummary());
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void refresh();
  }, [enabled, refresh]);

  return { summary, isLoading, refresh };
}
