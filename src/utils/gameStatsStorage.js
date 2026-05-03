import { isTauri } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { getStoredUser } from './authStorage';
import { GAME_CATALOG, GAME_META_MAP } from './gameCatalog';
import { buildCognitiveDomainScores, calculateGameScore } from './cognitiveDomainScoring';

const DB_PATH = 'sqlite:game_stats.db';
const FALLBACK_STORAGE_KEY = 'mobile-app-game-sessions-fallback';
const MANUAL_STOP = 'manual_stop';
const TIME_UP = 'time_up';

let databasePromise = null;

function canUseTauriSql() {
  return typeof window !== 'undefined' && isTauri();
}

function getCurrentPlayerId() {
  return getStoredUser()?.avatarSeed ?? 'guest-player';
}

function createEmptyGameSummary(gameId) {
  const meta = GAME_META_MAP[gameId];

  return {
    ...meta,
    playCount: 0,
    bestScore: 0,
    averageScore: 0,
    totalScore: 0,
    totalDurationSec: 0,
    totalMistakes: 0,
    totalAttempts: 0,
    totalCorrectAttempts: 0,
    completedRounds: 0,
    totalResponseTimeMs: 0,
    responseTimeCount: 0,
    firstHalfMistakes: 0,
    secondHalfMistakes: 0,
    timeUpCount: 0,
    manualStopCount: 0,
    highestLevel: 0,
    lastPlayedAt: null,
    lastScore: 0,
    gameScore: 0,
    gameScoreParts: {
      accuracy: 0,
      responseTime: 0,
      errorPattern: 0,
      completion: 0,
    },
  };
}

export function buildEmptyGameStatsSummary() {
  const perGame = Object.fromEntries(
    GAME_CATALOG.map((game) => [game.id, createEmptyGameSummary(game.id)]),
  );
  const perGameList = GAME_CATALOG.map((game) => perGame[game.id]);
  const domainSummary = buildCognitiveDomainScores(perGame, perGameList);

  return {
    isPersisted: canUseTauriSql(),
    totalSessions: 0,
    totalScore: 0,
    averageScore: 0,
    highestScore: 0,
    totalDurationSec: 0,
    totalMistakes: 0,
    lastPlayedAt: null,
    activeGamesCount: 0,
    coveragePercent: 0,
    timeUpCount: 0,
    manualStopCount: 0,
    mostPlayedGameId: null,
    bestGameId: null,
    perGame,
    perGameList,
    ...domainSummary,
  };
}

function readFallbackSessions() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function writeFallbackSessions(sessions) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(sessions));
}

async function getDatabase() {
  if (!canUseTauriSql()) {
    return null;
  }

  if (!databasePromise) {
    databasePromise = Database.load(DB_PATH).catch((error) => {
      console.error('Unable to open SQLite database.', error);
      databasePromise = null;
      return null;
    });
  }

  return databasePromise;
}

function normalizeEndReason(endReason) {
  return endReason === TIME_UP ? TIME_UP : MANUAL_STOP;
}

function toIsoString(timestamp) {
  return new Date(timestamp).toISOString();
}

function createDurationSeconds(startedAtMs, endedAtMs) {
  return Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000));
}

function createEmptySessionMetrics() {
  return {
    totalAttempts: 0,
    correctAttempts: 0,
    completedRounds: 0,
    totalResponseTimeMs: 0,
    responseTimeCount: 0,
    firstHalfMistakes: 0,
    secondHalfMistakes: 0,
  };
}

function normalizeSessionMetrics(record) {
  const rawMetrics = record.metrics ?? record.metricsJson ?? record.metrics_json;
  let parsedMetrics = rawMetrics;

  if (typeof rawMetrics === 'string') {
    try {
      parsedMetrics = JSON.parse(rawMetrics);
    } catch {
      parsedMetrics = {};
    }
  }

  const metrics = parsedMetrics && typeof parsedMetrics === 'object'
    ? parsedMetrics
    : {};

  return {
    totalAttempts: Math.max(0, Number(metrics.totalAttempts) || 0),
    correctAttempts: Math.max(0, Number(metrics.correctAttempts) || 0),
    completedRounds: Math.max(0, Number(metrics.completedRounds) || 0),
    totalResponseTimeMs: Math.max(0, Number(metrics.totalResponseTimeMs) || 0),
    responseTimeCount: Math.max(0, Number(metrics.responseTimeCount) || 0),
    firstHalfMistakes: Math.max(0, Number(metrics.firstHalfMistakes) || 0),
    secondHalfMistakes: Math.max(0, Number(metrics.secondHalfMistakes) || 0),
  };
}

export function createGameSessionId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSessionRecord(record) {
  return {
    id: record.id,
    playerId: record.playerId,
    gameId: record.gameId,
    score: Number(record.score) || 0,
    levelReached: record.levelReached == null ? null : Number(record.levelReached),
    mistakesCount: Number(record.mistakesCount) || 0,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    durationSec: Number(record.durationSec) || 0,
    endReason: normalizeEndReason(record.endReason),
    metrics: normalizeSessionMetrics(record),
  };
}

async function listSessionsForPlayer(playerId) {
  const db = await getDatabase();

  if (db) {
    const rows = await db.select(
      `SELECT
        id,
        player_id AS playerId,
        game_id AS gameId,
        score,
        level_reached AS levelReached,
        mistakes_count AS mistakesCount,
        started_at AS startedAt,
        ended_at AS endedAt,
        duration_sec AS durationSec,
        end_reason AS endReason,
        COALESCE(metrics_json, '{}') AS metricsJson
      FROM game_sessions
      WHERE player_id = $1
      ORDER BY ended_at DESC`,
      [playerId],
    );

    return rows.map(normalizeSessionRecord);
  }

  return readFallbackSessions()
    .filter((session) => session.playerId === playerId)
    .sort((left, right) => Date.parse(right.endedAt) - Date.parse(left.endedAt))
    .map(normalizeSessionRecord);
}

function summarizeSessions(sessions) {
  const summary = buildEmptyGameStatsSummary();

  sessions.forEach((session) => {
    const gameSummary = summary.perGame[session.gameId];

    summary.totalSessions += 1;
    summary.totalScore += session.score;
    summary.highestScore = Math.max(summary.highestScore, session.score);
    summary.totalDurationSec += session.durationSec;
    summary.totalMistakes += session.mistakesCount;

    if (session.endReason === TIME_UP) {
      summary.timeUpCount += 1;
    } else {
      summary.manualStopCount += 1;
    }

    if (!summary.lastPlayedAt || Date.parse(session.endedAt) > Date.parse(summary.lastPlayedAt)) {
      summary.lastPlayedAt = session.endedAt;
    }

    if (!gameSummary) {
      return;
    }

    gameSummary.playCount += 1;
    gameSummary.totalScore += session.score;
    gameSummary.bestScore = Math.max(gameSummary.bestScore, session.score);
    gameSummary.totalDurationSec += session.durationSec;
    gameSummary.totalMistakes += session.mistakesCount;
    gameSummary.totalAttempts += session.metrics.totalAttempts;
    gameSummary.totalCorrectAttempts += session.metrics.correctAttempts;
    gameSummary.completedRounds += session.metrics.completedRounds;
    gameSummary.totalResponseTimeMs += session.metrics.totalResponseTimeMs;
    gameSummary.responseTimeCount += session.metrics.responseTimeCount;
    gameSummary.firstHalfMistakes += session.metrics.firstHalfMistakes;
    gameSummary.secondHalfMistakes += session.metrics.secondHalfMistakes;
    gameSummary.highestLevel = Math.max(gameSummary.highestLevel, session.levelReached ?? 0);

    if (session.endReason === TIME_UP) {
      gameSummary.timeUpCount += 1;
    } else {
      gameSummary.manualStopCount += 1;
    }

    if (!gameSummary.lastPlayedAt || Date.parse(session.endedAt) > Date.parse(gameSummary.lastPlayedAt)) {
      gameSummary.lastPlayedAt = session.endedAt;
      gameSummary.lastScore = session.score;
    }
  });

  summary.activeGamesCount = summary.perGameList.filter((game) => game.playCount > 0).length;
  summary.coveragePercent = GAME_CATALOG.length
    ? Math.round((summary.activeGamesCount / GAME_CATALOG.length) * 100)
    : 0;
  summary.averageScore = summary.totalSessions
    ? Math.round(summary.totalScore / summary.totalSessions)
    : 0;

  summary.perGameList = GAME_CATALOG.map((game) => {
    const gameSummary = summary.perGame[game.id];
    const averageScore = gameSummary.playCount
      ? Math.round(gameSummary.totalScore / gameSummary.playCount)
      : 0;
    const gameScoreSummary = calculateGameScore(
      { ...gameSummary, averageScore },
      Math.max(summary.highestScore, 1),
    );

    return {
      ...gameSummary,
      averageScore,
      ...gameScoreSummary,
    };
  });

  summary.perGame = Object.fromEntries(
    summary.perGameList.map((game) => [game.id, game]),
  );

  summary.mostPlayedGameId = summary.perGameList
    .filter((game) => game.playCount > 0)
    .sort((left, right) => right.playCount - left.playCount || right.bestScore - left.bestScore)[0]?.id ?? null;

  summary.bestGameId = summary.perGameList
    .filter((game) => game.playCount > 0)
    .sort((left, right) => right.bestScore - left.bestScore || right.playCount - left.playCount)[0]?.id ?? null;

  Object.assign(summary, buildCognitiveDomainScores(summary.perGame, summary.perGameList));

  return summary;
}

export async function saveGameSession({
  sessionId,
  gameId,
  score = 0,
  levelReached = null,
  mistakesCount = 0,
  metrics = createEmptySessionMetrics(),
  startedAtMs,
  endedAtMs,
  endReason,
}) {
  const startedAt = typeof startedAtMs === 'number' ? startedAtMs : Date.now();
  const endedAt = typeof endedAtMs === 'number' ? endedAtMs : Date.now();

  const sessionRecord = normalizeSessionRecord({
    id: sessionId ?? createGameSessionId(),
    playerId: getCurrentPlayerId(),
    gameId,
    score: Math.max(0, Math.round(score)),
    levelReached: levelReached == null ? null : Math.max(1, Math.round(levelReached)),
    mistakesCount: Math.max(0, Math.round(mistakesCount)),
    startedAt: toIsoString(startedAt),
    endedAt: toIsoString(endedAt),
    durationSec: createDurationSeconds(startedAt, endedAt),
    endReason: normalizeEndReason(endReason),
    metrics,
  });
  const metricsJson = JSON.stringify(sessionRecord.metrics);

  const db = await getDatabase();

  if (db) {
    await db.execute(
      `INSERT INTO game_sessions (
        id,
        player_id,
        game_id,
        score,
        level_reached,
        mistakes_count,
        started_at,
        ended_at,
        duration_sec,
        end_reason,
        metrics_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        sessionRecord.id,
        sessionRecord.playerId,
        sessionRecord.gameId,
        sessionRecord.score,
        sessionRecord.levelReached,
        sessionRecord.mistakesCount,
        sessionRecord.startedAt,
        sessionRecord.endedAt,
        sessionRecord.durationSec,
        sessionRecord.endReason,
        metricsJson,
      ],
    );

    return sessionRecord;
  }

  const fallbackSessions = readFallbackSessions().filter((session) => session.id !== sessionRecord.id);
  fallbackSessions.unshift(sessionRecord);
  writeFallbackSessions(fallbackSessions);
  return sessionRecord;
}

export async function getGameStatsSummary() {
  const playerId = getCurrentPlayerId();
  const sessions = await listSessionsForPlayer(playerId);
  return summarizeSessions(sessions);
}

export async function getGameSessions(gameId) {
  const playerId = getCurrentPlayerId();
  const sessions = await listSessionsForPlayer(playerId);

  if (!gameId) {
    return sessions;
  }

  return sessions.filter((session) => session.gameId === gameId);
}
