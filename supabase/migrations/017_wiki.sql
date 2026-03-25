CREATE TABLE IF NOT EXISTS wiki_pages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  content    TEXT,                  -- plain text / markdown
  category   TEXT NOT NULL DEFAULT 'general',  -- 'reglamento', 'ejercicios', 'general'
  sort_order INT NOT NULL DEFAULT 0,
  published  BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_select" ON wiki_pages FOR SELECT USING (auth.role() = 'authenticated' AND published = true OR get_user_role() = 'admin');
CREATE POLICY "wiki_insert" ON wiki_pages FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "wiki_update" ON wiki_pages FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "wiki_delete" ON wiki_pages FOR DELETE USING (get_user_role() = 'admin');
