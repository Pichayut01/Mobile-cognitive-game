import { GAME_META_MAP } from './gameCatalog';

const GAME_SCORE_WEIGHTS = {
  accuracy: 0.4,
  responseTime: 0.25,
  errorPattern: 0.15,
  completion: 0.2,
};

const RESPONSE_TIME_LIMITS_MS = {
  'visual-search': { fast: 1000, slow: 8000 },
  'number-ordering': { fast: 2500, slow: 15000 },
  'back-trace': { fast: 2000, slow: 12000 },
  'switch-rules': { fast: 800, slow: 6000 },
  'memory-matrix': { fast: 2500, slow: 12000 },
  'unique-shape': { fast: 1000, slow: 8000 },
};

const COMPLETION_TARGETS_PER_MINUTE = {
  'visual-search': 6,
  'number-ordering': 4,
  'back-trace': 3,
  'switch-rules': 8,
  'memory-matrix': 3,
  'unique-shape': 6,
};

export const COGNITIVE_DOMAIN_DEFINITIONS = [
  {
    id: 'attention',
    title: 'Attention',
    titleTh: 'สมาธิและการจดจ่อ',
    icon: 'center_focus_strong',
    description: 'ดูความแม่นยำและการคงสมาธิระหว่างค้นหาเป้าหมาย',
    weights: {
      'visual-search': 60,
      'unique-shape': 50,
      'number-ordering': 20,
      'back-trace': 10,
      'memory-matrix': 10,
    },
  },
  {
    id: 'memory',
    title: 'Memory',
    titleTh: 'ความจำ',
    icon: 'psychology',
    description: 'ประเมินความจำระยะสั้นและการเรียกคืนข้อมูล',
    weights: {
      'memory-matrix': 40,
      'number-ordering': 30,
      'back-trace': 30,
      'switch-rules': 25,
    },
  },
  {
    id: 'processing-speed',
    title: 'Processing Speed',
    titleTh: 'ความเร็วในการประมวลผล',
    icon: 'speed',
    description: 'ดูความไวในการตอบสนองและจัดการข้อมูลต่อเนื่อง',
    weights: {
      'number-ordering': 50,
      'visual-search': 30,
      'unique-shape': 20,
      'switch-rules': 15,
    },
  },
  {
    id: 'visuospatial',
    title: 'Visuospatial',
    titleTh: 'มิติสัมพันธ์และพื้นที่',
    icon: 'grid_view',
    description: 'ประเมินการมองเห็นตำแหน่ง ทิศทาง และความสัมพันธ์เชิงพื้นที่',
    weights: {
      'back-trace': 60,
      'memory-matrix': 50,
    },
  },
  {
    id: 'executive-function',
    title: 'Executive Function',
    titleTh: 'การคิดบริหารจัดการ',
    icon: 'account_tree',
    description: 'ดูการปรับกฎ การยับยั้งคำตอบ และการตัดสินใจ',
    weights: {
      'switch-rules': 60,
      'visual-search': 10,
    },
  },
];

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function roundScore(value) {
  return Math.round(clampScore(value));
}

function calculateLegacyScore(gameSummary, comparisonBase) {
  if (!gameSummary.playCount) {
    return 0;
  }

  const scoreBase = Math.max(comparisonBase, gameSummary.bestScore, 1);
  const averageScoreRatio = (gameSummary.averageScore / scoreBase) * 100;
  const mistakePenalty = gameSummary.totalMistakes
    ? Math.min(35, (gameSummary.totalMistakes / Math.max(gameSummary.playCount, 1)) * 7)
    : 0;

  return clampScore(averageScoreRatio - mistakePenalty);
}

function calculateAccuracyScore(gameSummary, legacyScore) {
  if (gameSummary.totalAttempts > 0) {
    return (gameSummary.totalCorrectAttempts / gameSummary.totalAttempts) * 100;
  }

  return legacyScore;
}

function calculateResponseTimeScore(gameSummary, legacyScore) {
  if (!gameSummary.responseTimeCount || !gameSummary.totalResponseTimeMs) {
    return legacyScore;
  }

  const averageResponseMs = gameSummary.totalResponseTimeMs / gameSummary.responseTimeCount;
  const limits = RESPONSE_TIME_LIMITS_MS[gameSummary.id] ?? { fast: 1500, slow: 10000 };
  return ((limits.slow - averageResponseMs) / (limits.slow - limits.fast)) * 100;
}

function calculateErrorPatternScore(gameSummary) {
  if (!gameSummary.totalMistakes) {
    return 100;
  }

  if (!gameSummary.firstHalfMistakes && !gameSummary.secondHalfMistakes) {
    return 100 - Math.min(45, gameSummary.totalMistakes * 5);
  }

  const lateMistakeIncrease = Math.max(0, gameSummary.secondHalfMistakes - gameSummary.firstHalfMistakes);
  return 100 - ((lateMistakeIncrease / Math.max(gameSummary.totalMistakes, 1)) * 100);
}

function calculateCompletionScore(gameSummary) {
  if (!gameSummary.playCount) {
    return 0;
  }

  if (gameSummary.completedRounds > 0 && gameSummary.totalDurationSec > 0) {
    const targetPerMinute = COMPLETION_TARGETS_PER_MINUTE[gameSummary.id] ?? 4;
    const expectedRounds = Math.max(1, (gameSummary.totalDurationSec / 60) * targetPerMinute);
    return (gameSummary.completedRounds / expectedRounds) * 100;
  }

  return (gameSummary.timeUpCount / gameSummary.playCount) * 100;
}

export function calculateGameScore(gameSummary, comparisonBase) {
  const legacyScore = calculateLegacyScore(gameSummary, comparisonBase);
  const accuracy = clampScore(calculateAccuracyScore(gameSummary, legacyScore));
  const responseTime = clampScore(calculateResponseTimeScore(gameSummary, legacyScore));
  const errorPattern = clampScore(calculateErrorPatternScore(gameSummary));
  const completion = clampScore(calculateCompletionScore(gameSummary));

  const gameScore =
    (accuracy * GAME_SCORE_WEIGHTS.accuracy) +
    (responseTime * GAME_SCORE_WEIGHTS.responseTime) +
    (errorPattern * GAME_SCORE_WEIGHTS.errorPattern) +
    (completion * GAME_SCORE_WEIGHTS.completion);

  return {
    gameScore: roundScore(gameScore),
    gameScoreParts: {
      accuracy: roundScore(accuracy),
      responseTime: roundScore(responseTime),
      errorPattern: roundScore(errorPattern),
      completion: roundScore(completion),
    },
  };
}

export function buildCognitiveDomainScores(perGame, perGameList) {
  const gameScoreMap = Object.fromEntries(perGameList.map((game) => [game.id, game.gameScore ?? 0]));

  const domainScoreList = COGNITIVE_DOMAIN_DEFINITIONS.map((domain) => {
    const availableEntries = Object.entries(domain.weights)
      .filter(([gameId]) => GAME_META_MAP[gameId]);
    const playedEntries = availableEntries
      .filter(([gameId]) => (perGame[gameId]?.playCount ?? 0) > 0);

    const totalWeight = availableEntries.reduce((sum, [, weight]) => sum + weight, 0);
    const playedWeight = playedEntries.reduce((sum, [, weight]) => sum + weight, 0);
    const weightedScore = playedEntries.reduce(
      (sum, [gameId, weight]) => sum + (gameScoreMap[gameId] * weight),
      0,
    );

    const sourceGames = availableEntries.map(([gameId, weight]) => ({
      id: gameId,
      titleTh: GAME_META_MAP[gameId].titleTh,
      weight,
      playCount: perGame[gameId]?.playCount ?? 0,
      gameScore: gameScoreMap[gameId] ?? 0,
    }));

    return {
      ...domain,
      score: playedWeight ? roundScore(weightedScore / playedWeight) : 0,
      coveragePercent: totalWeight ? roundScore((playedWeight / totalWeight) * 100) : 0,
      hasData: playedWeight > 0,
      sourceGames,
      playedSourceCount: playedEntries.length,
      totalSourceCount: availableEntries.length,
    };
  });

  const scoredDomains = domainScoreList.filter((domain) => domain.hasData);
  const averageDomainScore = scoredDomains.length
    ? roundScore(scoredDomains.reduce((sum, domain) => sum + domain.score, 0) / scoredDomains.length)
    : 0;
  const weakestDomain = scoredDomains
    .sort((left, right) => left.score - right.score || left.coveragePercent - right.coveragePercent)[0] ?? null;

  return {
    averageDomainScore,
    weakestDomainId: weakestDomain?.id ?? null,
    domainScoreList,
    domainScores: Object.fromEntries(domainScoreList.map((domain) => [domain.id, domain])),
  };
}
