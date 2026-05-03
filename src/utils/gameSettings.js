import { GAME_CATALOG } from "./gameCatalog";

const GAME_SETTINGS_STORAGE_KEY = "mobile-app-game-settings";

export const DEFAULT_GAME_SETTINGS = {
  durationMinutes: 3,
  difficulty: "medium",
};

export const MIN_GAME_DURATION_MINUTES = 1;
export const MAX_GAME_DURATION_MINUTES = 10;

export const DIFFICULTY_OPTIONS = [
  {
    id: "easy",
    label: "ง่าย",
    description: "ผ่อนแรงลงเล็กน้อย มองง่ายขึ้นและไต่ระดับช้าลง",
  },
  {
    id: "medium",
    label: "ปานกลาง",
    description: "เท่ากับรูปแบบเกมปัจจุบันที่ใช้อยู่ตอนนี้",
  },
  {
    id: "hard",
    label: "ยาก",
    description: "ท้าทายขึ้นเล็กน้อย แต่ยังคงรูปแบบเดิมของเกม",
  },
];

const GAME_DIFFICULTY_PROFILES = {
  "back-trace": {
    easy: {
      initialSequenceLength: 2,
      minSequenceLength: 2,
      maxSequenceLength: 8,
      memorizeBaseMs: 1800,
      memorizePerNodeMs: 600,
    },
    medium: {
      initialSequenceLength: 3,
      minSequenceLength: 3,
      maxSequenceLength: 10,
      memorizeBaseMs: 1500,
      memorizePerNodeMs: 500,
    },
    hard: {
      initialSequenceLength: 4,
      minSequenceLength: 4,
      maxSequenceLength: 12,
      memorizeBaseMs: 1200,
      memorizePerNodeMs: 420,
    },
  },
  "memory-matrix": {
    easy: {
      initialTileCount: 2,
      minTileCount: 2,
      maxTileCount: 10,
      revealBaseMs: 2400,
      revealPerLevelMs: 45,
      revealMinMs: 900,
    },
    medium: {
      initialTileCount: 3,
      minTileCount: 3,
      maxTileCount: 12,
      revealBaseMs: 2000,
      revealPerLevelMs: 60,
      revealMinMs: 600,
    },
    hard: {
      initialTileCount: 4,
      minTileCount: 4,
      maxTileCount: 14,
      revealBaseMs: 1700,
      revealPerLevelMs: 70,
      revealMinMs: 450,
    },
  },
  "number-ordering": {
    easy: {
      initialBubbleCount: 3,
      maxBubbleCount: 5,
      orderMode: "asc",
      boardsToGrow: 3,
      maxNumber: 60,
    },
    medium: {
      initialBubbleCount: 4,
      maxBubbleCount: 6,
      orderMode: "mixed",
      boardsToGrow: 2,
      maxNumber: 99,
    },
    hard: {
      initialBubbleCount: 5,
      maxBubbleCount: 7,
      orderMode: "mixed",
      boardsToGrow: 2,
      maxNumber: 120,
    },
  },
  "switch-rules": {
    easy: {
      ruleTypes: ['color', 'shape'],
      switchEveryMin: 4,
      switchEveryMax: 6,
      choiceCount: 2,
      ruleDisplayMs: 2000,
    },
    medium: {
      ruleTypes: ['color', 'shape', 'number'],
      switchEveryMin: 3,
      switchEveryMax: 4,
      choiceCount: 3,
      ruleDisplayMs: 1500,
    },
    hard: {
      ruleTypes: ['color', 'shape', 'number'],
      switchEveryMin: 2,
      switchEveryMax: 3,
      choiceCount: 4,
      ruleDisplayMs: 1000,
    },
  },
  "visual-search": {
    easy: {
      initialGridSize: 2,
      maxGridSize: 3,
      winsToGrow: 3,
    },
    medium: {
      initialGridSize: 3,
      maxGridSize: 4,
      winsToGrow: 2,
    },
    hard: {
      initialGridSize: 4,
      maxGridSize: 4,
      winsToGrow: 2,
    },
  },
};

const GAME_DIFFICULTY_SUMMARIES = {
  "back-trace": {
    easy: "เริ่มลำดับสั้นลงและให้เวลาจำแต่ละรอบนานขึ้น",
    medium: "ลำดับเริ่ม 3 จุดและเวลาจำเท่ากับเกมปัจจุบัน",
    hard: "เริ่มลำดับยาวขึ้นและเวลาจำต่อรอบสั้นลงเล็กน้อย",
  },
  "memory-matrix": {
    easy: "จำนวนช่องที่ต้องจำเริ่มน้อยลงและเปิดให้ดูนานขึ้น",
    medium: "จำนวนช่องและเวลาจำเท่ากับเกมปัจจุบัน",
    hard: "จำนวนช่องเริ่มมากขึ้นและเวลาจำสั้นลงเล็กน้อย",
  },
  "number-ordering": {
    easy: "ลูกโป่งเริ่มน้อยลง ใช้ลำดับจากน้อยไปมาก และไต่ระดับช้าลง",
    medium: "ลูกโป่งเริ่ม 4 ลูกและสลับน้อยไปมาก/มากไปน้อยแบบเดิม",
    hard: "ลูกโป่งเริ่มมากขึ้นและช่วงตัวเลขกว้างขึ้นเล็กน้อย",
  },
  "switch-rules": {
    easy: "ใช้แค่ 2 กฎ สลับทุก 4-6 ข้อ และมี 2 ตัวเลือก",
    medium: "เพิ่มกฎตัวเลข สลับทุก 3-4 ข้อ และมี 3 ตัวเลือก",
    hard: "สลับกฎถี่ขึ้นทุก 2-3 ข้อ และมี 4 ตัวเลือก",
  },
  "visual-search": {
    easy: "เริ่มกระดานเล็กลงและต้องชนะหลายรอบกว่าจะเพิ่มขนาด",
    medium: "เริ่ม 3x3 และขยายถึง 4x4 แบบเดิม",
    hard: "เริ่มกระดาน 4x4 ตั้งแต่ต้นเพื่อให้ค้นหายากขึ้น",
  },
};

function normalizeDurationMinutes(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_GAME_SETTINGS.durationMinutes;
  }

  return Math.min(
    MAX_GAME_DURATION_MINUTES,
    Math.max(MIN_GAME_DURATION_MINUTES, Math.round(numericValue)),
  );
}

function normalizeDifficulty(value) {
  const supportedIds = DIFFICULTY_OPTIONS.map((option) => option.id);
  return supportedIds.includes(value) ? value : DEFAULT_GAME_SETTINGS.difficulty;
}

function normalizeGameSettings(value) {
  return {
    durationMinutes: normalizeDurationMinutes(value?.durationMinutes),
    difficulty: normalizeDifficulty(value?.difficulty),
  };
}

export function getStoredGameSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_GAME_SETTINGS;
  }

  try {
    const rawValue = window.localStorage.getItem(GAME_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_GAME_SETTINGS;
    }

    return normalizeGameSettings(JSON.parse(rawValue));
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

export function saveGameSettings(nextSettings) {
  const normalizedSettings = normalizeGameSettings(nextSettings);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      GAME_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizedSettings),
    );
  }

  return normalizedSettings;
}

export function updateStoredGameSettings(partialSettings) {
  const currentSettings = getStoredGameSettings();
  return saveGameSettings({
    ...currentSettings,
    ...partialSettings,
  });
}

export function getGameDifficultyProfile(gameId, difficulty) {
  const gameProfile = GAME_DIFFICULTY_PROFILES[gameId];

  if (!gameProfile) {
    return null;
  }

  return gameProfile[difficulty] ?? gameProfile.medium;
}

export function getGameDifficultySummary(gameId, difficulty) {
  return GAME_DIFFICULTY_SUMMARIES[gameId]?.[difficulty] ?? "ใช้รูปแบบมาตรฐานของเกม";
}

export function getDifficultyOptionById(difficultyId) {
  return DIFFICULTY_OPTIONS.find((option) => option.id === difficultyId) ?? DIFFICULTY_OPTIONS[1];
}

export function getAllDifficultySummaries(difficulty) {
  return GAME_CATALOG.map((game) => ({
    gameId: game.id,
    titleTh: game.titleTh,
    summary: getGameDifficultySummary(game.id, difficulty),
  }));
}
