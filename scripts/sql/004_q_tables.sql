CREATE TABLE IF NOT EXISTS q_tables (
  id SERIAL PRIMARY KEY,
  version BIGINT NOT NULL UNIQUE,
  states INT NOT NULL,
  data JSONB NOT NULL,           -- { q: { state: [qA,qD,qC], ... } } compressé
  created_at TIMESTAMP DEFAULT NOW(),
  parent_version BIGINT,
  is_active BOOLEAN DEFAULT FALSE,
  meta JSONB
);

-- Index simple pour recherche active
CREATE INDEX IF NOT EXISTS q_tables_active_idx ON q_tables(is_active) WHERE is_active = TRUE;