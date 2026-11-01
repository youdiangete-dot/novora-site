'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const {createLocalRedisTestTransport} = require('./local-redis-test-transport.cjs');
const containerId = 'a'.repeat(64);
test('requires a full explicit container ID and never probes or starts a container', () => {
  let calls=0;
  const forbidden={execFileSync(){calls++;throw Error('REAL_EXEC_FORBIDDEN');},execFile(){calls++;throw Error('REAL_EXEC_FORBIDDEN');}};
  for (const id of ['', 'abc123', 'redis', '-latest', 'a'.repeat(63), 'A'.repeat(64),containerId+';whoami'])
    assert.throws(() => createLocalRedisTestTransport({NOVORA_BETA_LOCAL_REDIS_CONTAINER_ID:id},forbidden),/EXACT_LOCAL_REDIS_CONTAINER_ID_REQUIRED/);
  assert.throws(() => createLocalRedisTestTransport({NOVORA_BETA_LOCAL_REDIS_CONTAINER_ID:containerId,NOVORA_BETA_LOCAL_REDIS_CLI:'redis-cli'},forbidden),/AMBIGUOUS/);
  const transport=createLocalRedisTestTransport({NOVORA_BETA_LOCAL_REDIS_CONTAINER_ID:containerId},forbidden);
  assert.equal(transport.mode,'docker_exec');assert.equal(calls,0);
});
test('passes exact Lua/JSON arguments to docker exec with no shell or rewriting', () => {
  const calls=[];
  const transport=createLocalRedisTestTransport({NOVORA_BETA_LOCAL_REDIS_CONTAINER_ID:containerId}, {
    execFileSync(command,args,options){calls.push({command,args,options});return 'reserved\n';},
  });
  const lua='local value = "quotes \\" and spaces"\nreturn ARGV[1]',json='{"fixture":"quotes\\and\\slashes"}';
  assert.equal(transport.run('EVAL',lua,'1','synthetic-key',json),'reserved');
  assert.deepEqual(calls[0].args,['exec',containerId,'redis-cli','--raw','-h','127.0.0.1','-p','6379','EVAL',lua,'1','synthetic-key',json]);
  assert.equal(calls[0].command,'docker');assert.equal(calls[0].options.shell,undefined);
  assert.equal(calls[0].options.windowsHide,true);assert.equal(calls[0].options.env.REDISCLI_AUTH,'');
  assert.throws(() => transport.run('FLUSHALL'),/FIXTURE_COMMAND_REJECTED/);
  assert.equal(calls.length,1);
});
test('concurrent requests remain independent concurrent processes and are not retried', async () => {
  const pending=[];
  const transport=createLocalRedisTestTransport({NOVORA_BETA_LOCAL_REDIS_CONTAINER_ID:containerId}, {
    execFile(command,args,options,done){pending.push({command,args,options,done});},
  });
  const requests=Array.from({length:8},()=>transport.runAsync('EVAL','unchanged Lua','1','synthetic-key'));
  assert.equal(pending.length,8);
  pending.forEach((call,i)=>call.done(null,i===0?'reserved\n':'denied\n'));
  assert.deepEqual(await Promise.all(requests),['reserved',...Array(7).fill('denied')]);
  const rejected=transport.runAsync('PING');pending[8].done(Error('fixture process failure'),'');
  await assert.rejects(rejected,/fixture process failure/);assert.equal(pending.length,9);
});
test('existing explicit host CLI behavior and unconfigured skip remain available', () => {
  assert.equal(createLocalRedisTestTransport({}),null);
  let received;
  const transport=createLocalRedisTestTransport({NOVORA_BETA_LOCAL_REDIS_CLI:'fixture-cli',NOVORA_BETA_LOCAL_REDIS_TEST_PORT:'6388'}, {
    execFileSync(command,args){received={command,args};return 'PONG\n';},
  });
  assert.equal(transport.run('PING'),'PONG');
  assert.deepEqual(received,{command:'fixture-cli',args:['--raw','-h','127.0.0.1','-p','6388','PING']});
});
