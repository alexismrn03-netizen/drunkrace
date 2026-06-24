-- Duel records table for leaderboard
CREATE TABLE IF NOT EXISTS duel_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  drink_id text NOT NULL,
  drink_name text NOT NULL,
  vol_cl float NOT NULL,
  degree_pct float NOT NULL,
  time_ms integer NOT NULL,
  won boolean DEFAULT false,
  group_id uuid REFERENCES groups ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE duel_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view records" ON duel_records FOR SELECT USING (true);
CREATE POLICY "Auth users can insert records" ON duel_records FOR INSERT WITH CHECK (auth.uid() = user_id);
