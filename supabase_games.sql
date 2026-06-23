-- Game invitations table
CREATE TABLE IF NOT EXISTS game_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups ON DELETE CASCADE,
  game_type text NOT NULL, -- 'rps' | 'duel'
  from_user_id uuid REFERENCES auth.users,
  to_user_id uuid REFERENCES auth.users,
  status text DEFAULT 'pending', -- pending | accepted | declined | completed
  game_data jsonb DEFAULT '{}', -- stores choices, results etc
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE game_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view invites" ON game_invites FOR SELECT USING (true);
CREATE POLICY "Auth users can insert invites" ON game_invites FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Auth users can update invites" ON game_invites FOR UPDATE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE game_invites;
