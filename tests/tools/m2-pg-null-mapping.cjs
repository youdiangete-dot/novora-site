'use strict';
// Offline synthetic fixture: capture the actual production adapter's RPC arguments.
const fs=require('node:fs'), ts=require('typescript'), assert=require('node:assert/strict');
function load(path,deps){const src=fs.readFileSync(path,'utf8'); const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText; const m={exports:{}};new Function('module','exports','require',js)(m,m.exports,n=>{if(!Object.hasOwn(deps,n))throw Error('unexpected dependency');return deps[n];});return m.exports;}
const validation=load('lib/server/concept-brief-validation.ts',{'server-only':{}});
const captured=[];
const adapter=load('lib/server/ai-sketch/m2-scoped-receipt.ts',{'server-only':{},'node:crypto':require('node:crypto'),'../concept-brief-validation':validation,'../supabase':{createSupabaseAdminClientOrNull:()=>({rpc:async(name,args)=>{captured.push(args);return {data:[{outcome:'created',brief_id:'123e4567-e89b-42d3-a456-426614174000',reference:args.p_brief.public_reference,stage:'accepted',reason:null}],error:null};}})}});
(async()=>{
 const full={customerName:'Synthetic Fixture',customerEmail:'synthetic@example.invalid',pieceType:'ring',summaryItems:['fixture']};
 const omitted={customerName:'Synthetic Fixture',customerEmail:'synthetic@example.invalid',pieceType:'ring'};
 const missingName={...full};delete missingName.customerName;const missingEmail={...full};delete missingEmail.customerEmail;
 assert.equal(validation.validateConceptBriefSubmission(full).valid,true);assert.equal(validation.validateConceptBriefSubmission(omitted).valid,true);assert.equal(validation.validateConceptBriefSubmission(missingName).valid,false);assert.equal(validation.validateConceptBriefSubmission(missingEmail).valid,false);
 const scope={scope:'a'.repeat(64),identity:'fixture'};
 for(const [i,payload] of [full,omitted,missingName,missingEmail].entries()) await adapter.createScopedReceipt(scope,String(i+1).repeat(32),payload);
 assert.equal(captured.length,4);assert.equal(captured[1].p_brief.summary_items,null);assert.equal(captured[2].p_contact.customer_name,null);assert.equal(captured[3].p_contact.customer_email,null);
 const json=x=>`$fixture$${JSON.stringify(x)}$fixture$::jsonb`;
 const call=(i,brief,contact)=>`public.m2_create_scoped_receipt('${captured[i].p_scope}','fixture','${captured[i].p_request}','${captured[i].p_digest}',${brief||json(captured[i].p_brief)},${contact||json(captured[i].p_contact)})`;
 const sql=`\\set ON_ERROR_STOP on
CREATE TEMP TABLE checks(n int not null); INSERT INTO checks VALUES (0);
CREATE FUNCTION pg_temp.ok(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL %',label; END IF; UPDATE checks SET n=n+1; RAISE NOTICE 'PASS %',label; END $$;
SELECT pg_temp.ok((SELECT outcome='created' FROM ${call(0)}),'full_production_mapping');
SELECT pg_temp.ok((SELECT count(*)=1 FROM public.concept_briefs) AND (SELECT count(*)=1 FROM public.concept_brief_contacts) AND (SELECT count(*)=1 FROM public.m2_scoped_submission_receipts),'full_atomic_rows');
SELECT pg_temp.ok((SELECT outcome='created' FROM ${call(1)}),'omitted_summary_production_mapping');
SELECT pg_temp.ok((SELECT summary_items IS NOT NULL AND jsonb_typeof(summary_items)='null' FROM public.concept_briefs WHERE public_reference='${captured[1].p_brief.public_reference}'),'json_null_is_not_sql_null');
SELECT pg_temp.ok(('{"summary_items":null}'::jsonb->'summary_items') IS NOT NULL AND ('{}'::jsonb->'summary_items') IS NULL,'json_null_vs_missing_key');
SELECT pg_temp.ok(NULL::jsonb IS NULL,'explicit_sql_null');
DO $$ BEGIN BEGIN PERFORM * FROM ${call(2)}; RAISE EXCEPTION 'missing name accepted'; EXCEPTION WHEN not_null_violation THEN NULL; END; END $$;
SELECT pg_temp.ok((SELECT count(*)=2 FROM public.concept_briefs) AND (SELECT count(*)=2 FROM public.concept_brief_contacts) AND (SELECT count(*)=2 FROM public.m2_scoped_submission_receipts),'missing_name_rollback');
DO $$ BEGIN BEGIN PERFORM * FROM ${call(3)}; RAISE EXCEPTION 'missing email accepted'; EXCEPTION WHEN not_null_violation THEN NULL; END; END $$;
SELECT pg_temp.ok((SELECT count(*)=2 FROM public.concept_briefs) AND (SELECT count(*)=2 FROM public.concept_brief_contacts) AND (SELECT count(*)=2 FROM public.m2_scoped_submission_receipts),'missing_email_rollback');
DO $$ BEGIN BEGIN PERFORM * FROM public.m2_create_scoped_receipt(repeat('a',64),'fixture',repeat('5',32),repeat('b',64),${json(captured[0].p_brief)} - 'summary_items',${json(captured[0].p_contact)}); RAISE EXCEPTION 'missing summary accepted'; EXCEPTION WHEN not_null_violation THEN NULL; END; END $$;
SELECT pg_temp.ok((SELECT count(*)=2 FROM public.concept_briefs) AND (SELECT count(*)=2 FROM public.concept_brief_contacts) AND (SELECT count(*)=2 FROM public.m2_scoped_submission_receipts),'missing_key_sql_null_rollback');
SELECT 'ASSERT_COUNT='||n FROM checks;
`;
 fs.writeFileSync(process.argv[2],sql,'utf8');process.stdout.write('VALIDATION_ASSERTIONS=4; MAPPING_ASSERTIONS=4; SQL_FIXTURE_WRITTEN\n');
})().catch(()=>{process.stderr.write('FIXTURE_GENERATION_FAILED\n');process.exitCode=1;});
