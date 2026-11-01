\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'novora_g2_revision_test' THEN RAISE EXCEPTION 'SYNTHETIC_DATABASE_REQUIRED'; END IF; END $$;
SELECT g2_fixture.seed(n,n=4) FROM generate_series(1,5) n;
CREATE FUNCTION g2_fixture.reject(n integer,patch jsonb DEFAULT '{}') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN PERFORM g2_fixture.promote(n,patch); RAISE EXCEPTION 'EXPECTED_REJECTION';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.ai_sketch_outputs o JOIN g2_fixture.cases c ON o.id=c.s WHERE c.n=reject.n AND o.is_current_customer_preview AND o.readiness_status='first_preview_ready')
 THEN RAISE EXCEPTION 'OLD_CURRENT_LOST'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION g2_fixture.reject(integer,jsonb) TO service_role;
DO $$ DECLARE f regprocedure:='public.novora_promote_revision_output(uuid,uuid,uuid,uuid,text,text,jsonb,timestamp with time zone)'::regprocedure;
BEGIN
 IF (SELECT prosecdef FROM pg_proc WHERE oid=f) OR NOT (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid=f)
 OR has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE')
 OR NOT has_function_privilege('service_role',f,'EXECUTE') THEN RAISE EXCEPTION 'RPC_PRIVILEGES_WRONG'; END IF;
END $$;
SET ROLE anon;
DO $$ BEGIN BEGIN PERFORM public.novora_promote_revision_output(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL); RAISE EXCEPTION 'ANON_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.novora_promote_revision_output(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL); RAISE EXCEPTION 'AUTHENTICATED_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;
SET ROLE service_role;
SELECT g2_fixture.reject(2,'{"privacyPassed":false}');
SELECT g2_fixture.reject(2,'{"privacyPassed":"true"}');
SELECT g2_fixture.reject(2,'{"visualPrivacyEvidence":{"result":"failed"}}');
DO $$ DECLARE c g2_fixture.cases%ROWTYPE;
BEGIN SELECT * INTO c FROM g2_fixture.cases WHERE n=3;
 BEGIN PERFORM public.novora_promote_revision_output(c.b,c.j,c.o,c.s,repeat('b',64),'novora_first_preview_automatic_gates_v2',g2_fixture.gates(c.b,c.j,c.o),c.passed_at); RAISE EXCEPTION 'WRONG_HASH_ALLOWED'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.novora_promote_revision_output(c.b,c.j,c.o,c.o,repeat('a',64),'novora_first_preview_automatic_gates_v2',g2_fixture.gates(c.b,c.j,c.o),c.passed_at); RAISE EXCEPTION 'UNBOUND_SOURCE_ALLOWED'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
RESET ROLE;
-- Failure after the source UPDATE must roll back source, candidate and review.
CREATE FUNCTION g2_fixture.break_promotion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id=g2_fixture.id(1,'output') AND NEW.is_current_customer_preview THEN RAISE EXCEPTION 'SYNTHETIC_WRITE_FAILURE'; END IF; RETURN NEW;
END $$;
GRANT EXECUTE ON FUNCTION g2_fixture.id(integer,text) TO service_role;
CREATE TRIGGER g2_injected_failure BEFORE UPDATE ON public.ai_sketch_outputs FOR EACH ROW EXECUTE FUNCTION g2_fixture.break_promotion();
SET ROLE service_role;
DO $$ BEGIN BEGIN PERFORM g2_fixture.promote(1); RAISE EXCEPTION 'EXPECTED_WRITE_FAILURE'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'SYNTHETIC_WRITE_FAILURE' THEN RAISE; END IF; END;
 IF NOT EXISTS(SELECT FROM public.ai_sketch_outputs o JOIN g2_fixture.cases c ON o.id=c.s WHERE c.n=1 AND o.is_current_customer_preview)
 OR EXISTS(SELECT FROM public.ai_sketch_outputs o JOIN g2_fixture.cases c ON o.id=c.o WHERE c.n=1 AND o.is_current_customer_preview)
 OR NOT EXISTS(SELECT FROM public.ai_sketch_reviews r JOIN g2_fixture.cases c ON r.concept_brief_id=c.b WHERE c.n=1 AND r.ai_sketch_output_id=c.s)
 THEN RAISE EXCEPTION 'PROMOTION_NOT_ATOMIC'; END IF;
END $$;
RESET ROLE;
DROP TRIGGER g2_injected_failure ON public.ai_sketch_outputs;
UPDATE public.ai_sketch_jobs SET prompt_payload='{}' WHERE id=g2_fixture.id(4,'revision');
SET ROLE service_role;
SELECT g2_fixture.reject(4);
RESET ROLE;
UPDATE public.ai_sketch_jobs SET prompt_payload='{"revisionParentOutcome":"definite_failure"}' WHERE id=g2_fixture.id(4,'revision');
SET ROLE service_role;
DO $$ BEGIN PERFORM g2_fixture.promote(1); PERFORM g2_fixture.promote(4); END $$;
DO $$ BEGIN BEGIN PERFORM g2_fixture.promote(1); RAISE EXCEPTION 'DUPLICATE_PROMOTION_ALLOWED'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END; END $$;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.ai_sketch_outputs o JOIN g2_fixture.cases c ON o.concept_brief_id=c.b WHERE c.n IN(1,4) AND o.is_current_customer_preview AND o.id=c.o)<>2
 OR (SELECT count(*) FROM public.ai_sketch_outputs o JOIN g2_fixture.cases c ON o.id=c.s WHERE c.n IN(1,4) AND o.readiness_status='revoked' AND NOT o.is_current_customer_preview)<>2
 OR (SELECT count(*) FROM public.ai_sketch_reviews r JOIN g2_fixture.cases c ON r.concept_brief_id=c.b WHERE c.n IN(1,4) AND r.ai_sketch_output_id=c.o AND r.review_status='draft_generated_internal_only' AND r.revision_instruction IS NULL)<>2
 THEN RAISE EXCEPTION 'PROMOTION_FINAL_STATE_WRONG'; END IF;
END $$;
RESET ROLE;
SELECT 'G2_REVISION_ASSERTIONS_PASS' AS result;
