-- Migration: Add AI structural metadata columns to the `chapters` table
-- Run this once against your PostgreSQL database.
-- All columns are NULLABLE so existing rows are unaffected.

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS unit_title       VARCHAR(500),
  ADD COLUMN IF NOT EXISTS chapter_number   INTEGER,
  ADD COLUMN IF NOT EXISTS approximate_keywords JSONB DEFAULT '[]'::jsonb;

-- Optional: index on chapter_number for fast ordered listing
CREATE INDEX IF NOT EXISTS idx_chapters_chapter_number ON chapters(chapter_number);

-- Optional: GIN index on approximate_keywords for JSON containment queries
CREATE INDEX IF NOT EXISTS idx_chapters_keywords_gin ON chapters USING GIN (approximate_keywords);
