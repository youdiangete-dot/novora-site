\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'novora_g2_revision_test' THEN RAISE EXCEPTION 'SYNTHETIC_DATABASE_REQUIRED'; END IF; END $$;
SET ROLE service_role;
BEGIN;
-- Run twice concurrently; the Brief lock serializes competitors. One success,
-- one 22023 rejection, never two current images or a missing current image.
DO $$ BEGIN PERFORM g2_fixture.promote(5); END $$;
SELECT pg_sleep(1);
COMMIT;
