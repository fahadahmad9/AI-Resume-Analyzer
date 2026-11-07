CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  filename TEXT,
  raw_text TEXT,
  parsed JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS public_id UUID;
UPDATE resumes SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE resumes ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE resumes ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS resumes_public_id_unique ON resumes (public_id);

CREATE TABLE IF NOT EXISTS resume_chunks (
  id SERIAL PRIMARY KEY,
  resume_id INT REFERENCES resumes(id) ON DELETE CASCADE,
  section TEXT,
  content TEXT,
  embedding vector(768),
  chunk_type TEXT CONSTRAINT resume_chunks_chunk_type_check CHECK (chunk_type IN ('summary', 'skills_overview', 'skills_category', 'education', 'experience', 'project', 'raw_window')),
  title TEXT,
  ordinal INT,
  char_start INT,
  char_end INT,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

ALTER TABLE resume_chunks ADD COLUMN IF NOT EXISTS chunk_type TEXT;
ALTER TABLE resume_chunks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE resume_chunks ADD COLUMN IF NOT EXISTS ordinal INT;
ALTER TABLE resume_chunks ADD COLUMN IF NOT EXISTS char_start INT;
ALTER TABLE resume_chunks ADD COLUMN IF NOT EXISTS char_end INT;
ALTER TABLE resume_chunks ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resume_chunks_chunk_type_check'
  ) THEN
    ALTER TABLE resume_chunks
      ADD CONSTRAINT resume_chunks_chunk_type_check
      CHECK (chunk_type IN ('summary', 'skills_overview', 'skills_category', 'education', 'experience', 'project', 'raw_window'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS resume_chunks_embedding_hnsw_idx
  ON resume_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS resume_chunks_tsv_idx
  ON resume_chunks USING gin (tsv);

CREATE INDEX IF NOT EXISTS resume_chunks_resume_chunk_type_idx
  ON resume_chunks (resume_id, chunk_type);
