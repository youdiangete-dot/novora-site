'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const c=require('../../tools/invitation-trial-spending-contract.cjs');
const {createSession}=require('../../tools/m2-preview-session.cjs');
const {buildGitSourceDeployment}=require('../../tools/m2-private-sender.cjs');
const config={maximumInitialImages:1,maximumRevisions:1,limitMicros:2000000,expectedCostMicros:668217,reserveMicros:250000,m2CommittedMicros:3050000,mvpCommittedMicros:93050000,expiresAt:4500};
const identity='m2_synthetic_trial_fixture', bearer='a'.repeat(43), digest=createHash('sha256').update(bearer).digest('hex');
const other={identity:'synthetic_cross_customer',credentialSha256:'b'.repeat(64)};
const selected=()=>c.selection('synthetic_stable_namespace',config,[other,{identity,credentialSha256:digest}],'synthetic_trial_authority');
const id='dpl_syntheticTrial12345678', sha='c'.repeat(40);

test('declared initial+revision allocation includes both historical commitments and full experience reserve',()=>{
 assert.equal(c.normalizeConfig(config).limitMicros,2000000);
 for(const patch of [{maximumRevisions:0},{limitMicros:1000000},{maximumInitialImages:10,limitMicros:11000000},
  {expectedCostMicros:800000,reserveMicros:250000},{m2CommittedMicros:9000000},{mvpCommittedMicros:199000000},
  {mvpCommittedMicros:0},{limitMicros:'2000000'},{unexpected:true}]) assert.equal(c.normalizeConfig({...config,...patch}),null);
});
test('roster is finite, order-independent, and all identities and credential hashes enter the binding',()=>{
 const s=selected(),bound=c.binding(s,id,sha);
 assert.equal(s.identities,'|m2_synthetic_trial_fixture|synthetic_cross_customer|');
 assert.deepEqual(c.binding(c.selection(s.namespace,config,[...s.roster].reverse(),s.authorityLabel),id,sha),bound);
 for(const changed of [c.binding(s,id+'x',sha),c.binding(s,id,'d'.repeat(40)),
  c.binding(c.selection('another_stable_namespace',config,s.roster,s.authorityLabel),id,sha),
  c.binding(c.selection(s.namespace,config,[{...other,credentialSha256:'e'.repeat(64)},s.roster[0]],s.authorityLabel),id,sha)]) assert.notEqual(changed.runtimeBinding,bound.runtimeBinding);
 assert.equal(c.selection(s.namespace,config,[s.roster[0],s.roster[0]],s.authorityLabel),null);
 assert.equal(c.selection(s.namespace,config,Array.from({length:11},()=>other),s.authorityLabel),null);
});
test('operator observation requires exact contract/approval/durability and does not equate estimates with billing caps',()=>{
 const s=selected(),bound=c.binding(s,id,sha),a=c.authority(s,bound);
 const {id:unused,...fields}=a;
 const obs={...fields,authorityId:bound.authorityId,ledgerKey:bound.ledgerKey,identity,kind:'operator_console_observation',observedAt:1000000,revocationReady:true,expiresAt:4500000};
 assert.equal(c.observationValid(obs,s,bound,identity,1000000,9000000),true);
 for(const patch of [{costCeilingVerified:true},{ownerApproved:false},{durabilityVerified:false},{limitMicros:1000000},
  {maximumRevisions:2},{automaticPaidRetries:true},{rosterDigest:'f'.repeat(64)},{expiresAt:4500001},{unexpected:true}]) assert.equal(c.observationValid({...obs,...patch},s,bound,identity,1000000,9000000),false);
});
test('deployment request explicitly opts in only for the declared complete roster; original mode stays single',()=>{
 const original=buildGitSourceDeployment({identity,credentialSha256:digest,sourceSha:sha});
 assert.equal(JSON.parse(original.env.NOVORA_BETA_INVITATIONS_JSON).length,1);
 assert.equal(original.env.NOVORA_INVITATION_TRIAL_SPENDING_MODE,undefined);
 const body=buildGitSourceDeployment({identity,credentialSha256:digest,sourceSha:sha,trial:selected()});
 assert.equal(body.env.NOVORA_INVITATION_TRIAL_SPENDING_MODE,c.MODE);
 assert.equal(JSON.parse(body.env.NOVORA_BETA_INVITATIONS_JSON).length,2);
 assert.equal(JSON.parse(body.env.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG).limitMicros,2000000);
 assert.deepEqual(body.build.env,body.env);
 assert.throws(()=>buildGitSourceDeployment({identity,credentialSha256:'f'.repeat(64),sourceSha:sha,trial:selected()}));
});
test('private session proves exact trial binding, observes and arms once with unchanged sixty-minute credentials',async()=>{
 let clock=1000000,preparedTrial=null;
 const s=selected(),bound=c.binding(s,id,sha);
 const claims={owner_id:'team_9VhRPiCaRc62kna4XyNKvPZ7',project_id:c.PROJECT,environment:'development',sub:'owner:novoradesign:project:project-dd34e:environment:development',aud:'https://vercel.com/novoradesign',iss:'https://oidc.vercel.com',iat:1000,nbf:1000,exp:1100};
 const session=createSession({expectedSourceSha:sha,deadline:9000000,now:()=>clock,schedule:()=>1,cancel:()=>{},sourceMode:'git_source',trialSpending:{config,namespace:s.namespace,authorityLabel:s.authorityLabel,otherInvitations:[other]},adapters:{
  prepare:async()=>({oidc:'synthetic-oidc'}),verifyOidc:async()=>claims,generate:async()=>({bearer,identity,idempotencyKey:'synthetic_idempotency_key'}),
  deploy:async value=>{preparedTrial=value.trial;return {exitCode:0,stdout:JSON.stringify({id,url:'project-dd34e-fixture-novoradesign.vercel.app',target:null})};},
  readDeployment:async()=>({id,url:'https://project-dd34e-fixture-novoradesign.vercel.app',target:'preview',projectId:c.PROJECT,teamId:claims.owner_id,branch:c.BRANCH,sourceSha:sha,readyState:'READY',sourceEvidence:'platform_git_source_v1'}),
  proof:async()=>({authorized:true,isolatedBackendVerified:true,m2Binding:{...bound,deploymentId:id,sourceSha:sha}}),revoke:async()=>true,cleanup:async()=>true,
 }});
 assert.equal((await session.prepare()).status,'PREPARED');
 assert.equal((await session.deploy()).status,'READBACK_REQUIRED');
 assert.deepEqual(preparedTrial,s);
 const attached=await session.attach(id); assert.equal(attached.status,'READONLY_RUNTIME_PROOF_PENDING');
 assert.equal((await session.verifyBinding()).status,'BINDING_VERIFIED');
 const {id:unused,...a}=c.authority(s,bound);
 assert.equal(session.observeAuthority({...a,kind:'operator_console_observation',observedAt:clock,authorityId:bound.authorityId,ledgerKey:bound.ledgerKey,identity,revocationReady:true,expiresAt:4500000}).status,'OPERATOR_OBSERVATION_RECORDED');
 assert.equal((await session.arm()).status,'ARMED_FROM_OPERATOR_OBSERVATION');
 clock=4600000;
 assert.equal(session.checkpoint().status,'EXPIRED');
 assert.equal((await session.close()).revoke,'CONFIRMED');
});
