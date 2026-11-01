\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'novora_g2_revision_test' THEN RAISE EXCEPTION 'SYNTHETIC_DATABASE_REQUIRED'; END IF;
 IF (SELECT count(*) FROM public.ai_sketch_outputs o JOIN g2_fixture.cases c ON o.concept_brief_id=c.b WHERE c.n=5 AND o.is_current_customer_preview)<>1
 OR NOT EXISTS(SELECT FROM public.ai_sketch_outputs o JOIN g2_fixture.cases c ON o.id=c.o WHERE c.n=5 AND o.is_current_customer_preview AND o.readiness_status='first_preview_ready')
 OR NOT EXISTS(SELECT FROM public.ai_sketch_outputs o JOIN g2_fixture.cases c ON o.id=c.s WHERE c.n=5 AND NOT o.is_current_customer_preview AND o.readiness_status='revoked')
 THEN RAISE EXCEPTION 'RACE_FINAL_STATE_WRONG'; END IF;
END $$;
SELECT 'G2_REVISION_RACE_PASS' AS result;
