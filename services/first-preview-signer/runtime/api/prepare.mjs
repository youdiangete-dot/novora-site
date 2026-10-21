import { createSignerRuntime } from '../runtime.mjs';

// No connection, key read, or network activity on import. Credentials are read
// only when a request reaches this independently deployed server-only artifact.
const handle = createSignerRuntime({ readEnvironment: () => process.env });
export default { fetch: handle };
