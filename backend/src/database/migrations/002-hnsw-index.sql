ALTER TABLE book_chunks ADD COLUMN IF NOT EXISTS page_number INT;
CREATE INDEX IF NOT EXISTS book_chunks_embedding_hnsw_idx 
ON book_chunks 
USING hnsw (embedding vector_cosine_ops);
