ALTER TABLE absence_records
ADD COLUMN IF NOT EXISTS student_id uuid,
ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT '';
