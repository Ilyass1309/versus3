-- Exemple : seed de quelques états (sinon la Q-table démarre vide)
UPDATE qtable
SET qjson = qjson || '{
  "30-0|30-0|0":[0,0,0],
  "30-1|30-0|1":[0.1,0,0],
  "28-0|30-0|2":[0,0.05,0]
}'::jsonb,
    version = version + 1,
    updated_at = NOW()
WHERE id = 1;
