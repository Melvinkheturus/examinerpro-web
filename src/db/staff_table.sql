-- Create public staff table
CREATE TABLE IF NOT EXISTS staff (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  papers INTEGER NOT NULL,
  examiner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Create a row-level security policy
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Allow users to read own staff" ON staff
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert own staff" ON staff
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update own staff" ON staff
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete own staff" ON staff
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id); 