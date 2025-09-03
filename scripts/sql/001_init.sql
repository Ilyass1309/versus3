-- Table unique pour la Q-table (une seule ligne, id=1)
CREATE TABLE IF NOT EXISTS qtable (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1,
  qjson JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Forcer l'unicité d'une seule ligne
INSERT INTO qtable (id, version, qjson)
VALUES (1, 1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Logging d'épisodes (optionnel mais utile pour debug/analytics)
CREATE TABLE IF NOT EXISTS episodes (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_version INTEGER,
  steps JSONB NOT NULL,   -- [{aAI:0..2, aPL:0..2}, ...]
  turns SMALLINT NOT NULL,
  ai_win BOOLEAN,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes (created_at DESC);
