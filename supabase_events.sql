-- Add avatar_config column (JSON) to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_config jsonb DEFAULT '{}';

-- Race events table (red flag, fastest lap)
CREATE TABLE IF NOT EXISTS race_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups ON DELETE CASCADE,
  type text NOT NULL, -- 'red_flag' | 'fastest_lap'
  target_user_id uuid REFERENCES auth.users,
  triggered_by uuid REFERENCES auth.users,
  photo_url text,
  distance_delta float DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE race_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view events" ON race_events FOR SELECT USING (true);
CREATE POLICY "Auth users can insert events" ON race_events FOR INSERT WITH CHECK (auth.uid() = triggered_by);
ALTER PUBLICATION supabase_realtime ADD TABLE race_events;
