-- Track edits to materials
CREATE TABLE IF NOT EXISTS material_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  section_key text NOT NULL,
  week_label text,
  file_url text NOT NULL,
  edited_at timestamptz DEFAULT now(),
  editor_id uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Track deletes to materials
CREATE TABLE IF NOT EXISTS material_deletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid,
  title text,
  description text,
  section_key text,
  week_label text,
  file_url text,
  deleted_at timestamptz DEFAULT now(),
  deleter_id uuid REFERENCES profiles(id) ON DELETE SET NULL
);
-- PostgreSQL schema for AUSDAV Mini Moodle

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  week_label text,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_requests_user_pending
  ON admin_requests (user_id)
  WHERE status = 'pending';

-- Events (site-wide calendar)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  datetime timestamptz NOT NULL,
  mention_date date,
  module text DEFAULT '',
  kind text NOT NULL DEFAULT 'other', -- assignment | quiz | other
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ensure existing DBs get the column when schema is applied
ALTER TABLE events ADD COLUMN IF NOT EXISTS mention_date date;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select events for authenticated"
  ON events
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Insert events by admin"
  ON events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','super_admin')
    )
  );

CREATE POLICY "Update events by admin"
  ON events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','super_admin')
    )
  );

CREATE POLICY "Delete events by admin"
  ON events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','super_admin')
    )
  );

CREATE INDEX IF NOT EXISTS events_datetime_idx ON events (datetime);

-- MSD uploads (CS2833)
CREATE TABLE IF NOT EXISTS msd_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  section_name text NOT NULL,
  subsection_name text,
  week_label text,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  video_link text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE msd_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read msd uploads"
ON msd_uploads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage msd uploads"
ON msd_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('msd-module', 'msd-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "msd_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'msd-module');

CREATE POLICY "msd_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'msd-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "msd_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'msd-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "msd_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'msd-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

-- EE2024 uploads
CREATE TABLE IF NOT EXISTS ee2024_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  section_name text NOT NULL,
  subsection_name text,
  week_label text,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  video_link text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE ee2024_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read ee2024 uploads"
ON ee2024_uploads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage ee2024 uploads"
ON ee2024_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ee2024-module', 'ee2024-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ee2024_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ee2024-module');

CREATE POLICY "ee2024_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ee2024-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ee2024_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ee2024-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ee2024_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ee2024-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

-- EE2044 uploads
CREATE TABLE IF NOT EXISTS ee2044_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  section_name text NOT NULL,
  subsection_name text,
  week_label text,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  video_link text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE ee2044_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read ee2044 uploads"
ON ee2044_uploads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage ee2044 uploads"
ON ee2044_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ee2044-module', 'ee2044-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ee2044_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ee2044-module');

CREATE POLICY "ee2044_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ee2044-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ee2044_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ee2044-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ee2044_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ee2044-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

-- EE2054 uploads
CREATE TABLE IF NOT EXISTS ee2054_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  section_name text NOT NULL,
  subsection_name text,
  week_label text,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  video_link text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE ee2054_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read ee2054 uploads"
ON ee2054_uploads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage ee2054 uploads"
ON ee2054_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ee2054-module', 'ee2054-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ee2054_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ee2054-module');

CREATE POLICY "ee2054_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ee2054-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ee2054_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ee2054-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ee2054_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ee2054-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

-- EE3074 uploads
CREATE TABLE IF NOT EXISTS ee3074_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  section_name text NOT NULL,
  subsection_name text,
  week_label text,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  video_link text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE ee3074_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read ee3074 uploads"
ON ee3074_uploads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage ee3074 uploads"
ON ee3074_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ee3074-module', 'ee3074-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ee3074_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ee3074-module');

CREATE POLICY "ee3074_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ee3074-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ee3074_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ee3074-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ee3074_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ee3074-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

-- MA3014 uploads
CREATE TABLE IF NOT EXISTS ma3014_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  section_name text NOT NULL,
  subsection_name text,
  week_label text,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  video_link text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE ma3014_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read ma3014 uploads"
ON ma3014_uploads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage ma3014 uploads"
ON ma3014_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ma3014-module', 'ma3014-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ma3014_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ma3014-module');

CREATE POLICY "ma3014_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ma3014-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ma3014_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ma3014-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ma3014_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ma3014-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

-- MA3024 uploads
CREATE TABLE IF NOT EXISTS ma3024_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  section_name text NOT NULL,
  subsection_name text,
  week_label text,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  video_link text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE ma3024_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read ma3024 uploads"
ON ma3024_uploads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage ma3024 uploads"
ON ma3024_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('ma3024-module', 'ma3024-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ma3024_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ma3024-module');

CREATE POLICY "ma3024_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ma3024-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ma3024_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ma3024-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "ma3024_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ma3024-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

-- CS2023 uploads
CREATE TABLE IF NOT EXISTS cs2023_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  section_name text NOT NULL,
  subsection_name text,
  week_label text,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  video_link text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE cs2023_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read cs2023 uploads"
ON cs2023_uploads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin manage cs2023 uploads"
ON cs2023_uploads
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('cs2023-module', 'cs2023-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "cs2023_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cs2023-module');

CREATE POLICY "cs2023_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cs2023-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "cs2023_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'cs2023-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);

CREATE POLICY "cs2023_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cs2023-module'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','super_admin')
  )
);
