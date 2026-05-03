ALTER TABLE game_sessions
ADD COLUMN metrics_json TEXT NOT NULL DEFAULT '{}';
