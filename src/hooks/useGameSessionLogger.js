import { useCallback, useEffect, useRef } from 'react';
import { createGameSessionId, saveGameSession } from '../utils/gameStatsStorage';

function createEmptyMetrics() {
  return {
    totalAttempts: 0,
    correctAttempts: 0,
    completedRounds: 0,
    responseTimesMs: [],
    mistakeTimesMs: [],
  };
}

function buildPersistedMetrics(activeSession, endedAtMs) {
  const durationMs = Math.max(1, endedAtMs - activeSession.startedAtMs);
  const halfPointMs = durationMs / 2;

  return {
    totalAttempts: activeSession.metrics.totalAttempts,
    correctAttempts: activeSession.metrics.correctAttempts,
    completedRounds: activeSession.metrics.completedRounds,
    totalResponseTimeMs: activeSession.metrics.responseTimesMs.reduce((sum, value) => sum + value, 0),
    responseTimeCount: activeSession.metrics.responseTimesMs.length,
    firstHalfMistakes: activeSession.metrics.mistakeTimesMs.filter((value) => value <= halfPointMs).length,
    secondHalfMistakes: activeSession.metrics.mistakeTimesMs.filter((value) => value > halfPointMs).length,
  };
}

export function useGameSessionLogger({ gameId, getSnapshot }) {
  const activeSessionRef = useRef(null);
  const getSnapshotRef = useRef(getSnapshot);
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  const flushSession = useCallback((endReason) => {
    const activeSession = activeSessionRef.current;

    if (!activeSession) {
      return Promise.resolve(false);
    }

    activeSessionRef.current = null;

    const endedAtMs = Date.now();
    const snapshot = getSnapshotRef.current ? getSnapshotRef.current() : {};
    const metrics = buildPersistedMetrics(activeSession, endedAtMs);

    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(() => saveGameSession({
        sessionId: activeSession.sessionId,
        gameId,
        score: snapshot.score ?? 0,
        levelReached: snapshot.levelReached ?? null,
        mistakesCount: activeSession.mistakesCount,
        metrics,
        startedAtMs: activeSession.startedAtMs,
        endedAtMs,
        endReason,
      }))
      .catch((error) => {
        console.error(`Unable to save session for ${gameId}.`, error);
      });

    return saveQueueRef.current.then(() => true);
  }, [gameId]);

  const startSession = useCallback(() => {
    if (activeSessionRef.current) {
      void flushSession('manual_stop');
    }

    activeSessionRef.current = {
      sessionId: createGameSessionId(),
      startedAtMs: Date.now(),
      mistakesCount: 0,
      roundStartedAtMs: null,
      metrics: createEmptyMetrics(),
    };
  }, [flushSession]);

  const stopSession = useCallback((endReason = 'manual_stop') => {
    return flushSession(endReason);
  }, [flushSession]);

  const recordRoundStart = useCallback(() => {
    if (!activeSessionRef.current) {
      return;
    }

    activeSessionRef.current.roundStartedAtMs = Date.now();
  }, []);

  const recordResponseTime = useCallback(() => {
    const activeSession = activeSessionRef.current;

    if (!activeSession?.roundStartedAtMs) {
      return;
    }

    activeSession.metrics.responseTimesMs.push(
      Math.max(0, Date.now() - activeSession.roundStartedAtMs),
    );
    activeSession.roundStartedAtMs = null;
  }, []);

  const recordCorrect = useCallback(({ completedRound = false } = {}) => {
    const activeSession = activeSessionRef.current;

    if (!activeSession) {
      return;
    }

    activeSession.metrics.totalAttempts += 1;
    activeSession.metrics.correctAttempts += 1;

    if (completedRound) {
      activeSession.metrics.completedRounds += 1;
      recordResponseTime();
    }
  }, [recordResponseTime]);

  const recordMistake = useCallback(() => {
    const activeSession = activeSessionRef.current;

    if (!activeSession) {
      return;
    }

    activeSession.mistakesCount += 1;
    activeSession.metrics.totalAttempts += 1;
    activeSession.metrics.mistakeTimesMs.push(Math.max(0, Date.now() - activeSession.startedAtMs));
  }, []);

  useEffect(() => {
    return () => {
      void flushSession('manual_stop');
    };
  }, [flushSession]);

  return {
    startSession,
    stopSession,
    recordRoundStart,
    recordCorrect,
    recordMistake,
  };
}
