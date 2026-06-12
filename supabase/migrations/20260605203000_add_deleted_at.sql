ALTER TABLE students 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
