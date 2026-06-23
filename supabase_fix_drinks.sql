-- Fix drinks_log column to support JSON objects instead of text[]
ALTER TABLE group_members 
  ALTER COLUMN drinks_log TYPE jsonb[] 
  USING drinks_log::jsonb[];

-- Reset existing drinks_log to empty array
UPDATE group_members SET drinks_log = '{}' WHERE drinks_log IS NULL;
