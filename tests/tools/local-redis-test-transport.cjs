'use strict';
// TEST ONLY. Select no container, start no service, and change no Docker context.
// Caller must supply the exact already-approved disposable container's full ID.
const cp = require('node:child_process');
function createLocalRedisTestTransport(environment = process.env, processes = cp) {
  const selected = environment.NOVORA_BETA_LOCAL_REDIS_CONTAINER_ID;
  let command, prefix, containerId = null;
  if (selected !== undefined) {
    if (!/^[a-f0-9]{64}$/.test(selected)) throw new Error('EXACT_LOCAL_REDIS_CONTAINER_ID_REQUIRED');
    if (environment.NOVORA_BETA_LOCAL_REDIS_CLI) throw new Error('AMBIGUOUS_LOCAL_REDIS_TRANSPORT');
    containerId = selected;
    command = environment.NOVORA_BETA_LOCAL_REDIS_DOCKER_CLI || 'docker';
    prefix = ['exec', containerId, 'redis-cli'];
  } else {
    command = environment.NOVORA_BETA_LOCAL_REDIS_CLI;
    if (!command || !environment.NOVORA_BETA_LOCAL_REDIS_TEST_PORT) return null;
    prefix = [];
  }
  const port = environment.NOVORA_BETA_LOCAL_REDIS_TEST_PORT || '6379';
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535 || /[\0\r\n]/.test(command)) throw new Error('INVALID_LOCAL_REDIS_TRANSPORT');
  const options = { encoding:'utf8', timeout:5000, windowsHide:true,
    env:{...environment, REDISCLI_AUTH:'', REDISCLI_USER:''} };
  function args(values) {
    if (!Array.isArray(values) || values.some(value => typeof value !== 'string') ||
        !['PING','TIME','SET','GET','PTTL','EVAL'].includes(values[0])) throw new Error('LOCAL_REDIS_FIXTURE_COMMAND_REJECTED');
    // No shell, interpolation, command rewriting or Lua encoding transformation.
    return [...prefix,'--raw','-h','127.0.0.1','-p',port,...values];
  }
  return Object.freeze({
    mode:containerId ? 'docker_exec' : 'host_cli', containerId,
    run(...values) { return processes.execFileSync(command,args(values),options).trimEnd(); },
    // Each call starts its OWN process/Redis connection. Never serialize races.
    runAsync(...values) { return new Promise((resolve,reject) => processes.execFile(command,args(values),options,
      (error,stdout) => error ? reject(error) : resolve(stdout.trimEnd()))); },
  });
}
module.exports = { createLocalRedisTestTransport };
