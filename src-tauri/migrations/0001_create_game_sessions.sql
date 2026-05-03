CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  level_reached INTEGER,
  mistakes_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  end_reason TEXT NOT NULL CHECK (end_reason IN ('time_up', 'manual_stop'))
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id
ON game_sessions(player_id);

CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id
ON game_sessions(game_id);

CREATE INDEX IF NOT EXISTS idx_game_sessions_ended_at
ON game_sessions(ended_at DESC);
