CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  filename TEXT,
  raw_text TEXT,
  parsed JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resume_chunks (
  id SERIAL PRIMARY KEY,
  resume_id INT REFERENCES resumes(id) ON DELETE CASCADE,
  section TEXT,
  content TEXT,
  embedding vector(768)
);

CREATE INDEX IF NOT EXISTS resume_chunks_embedding_hnsw_idx
  ON resume_chunks USING hnsw (embedding vector_cosine_ops);
