-- Legacy V1 tactical board: treat as first playbook scene
UPDATE board_scenes
SET
  name = 'Scene 1',
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"playbook":true,"boardV1":true}'::jsonb
WHERE name = 'Tactical board (V1)';
