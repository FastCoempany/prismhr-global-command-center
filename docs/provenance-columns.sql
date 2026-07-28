-- Repository provenance — three columns on AccountNote, run directly in
-- Supabase. Safe/surgical/idempotent: adds columns only, touches no data.
-- Supabase dashboard -> SQL Editor -> paste all -> Run.
--
-- Until this runs the app still works: writes fall back to the old shape and
-- reads infer lane/actors from the note body. After it runs, new notes carry
-- provenance natively.
--
--   lane   'mine' = my working record | 'background' = ingested account intel
--   actors "Kim Bartolotti → Lesha Cyphers +2" (who was in the activity)
--   source 'sf' | 'sf-ai' | 'transcript' | 'chip' | 'move' | 'touch' | ...

ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "lane" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "actors" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT '';
