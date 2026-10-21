import { decodeKey } from './config.mjs';

// Project-specific Secret configuration is an adapter, not proof of deployed
// isolation. The existing database release RPC remains the definitive current
// verifier/key-id/revocation check before any envelope may leave the Signer.
export function createProtectedKeyProvider(configuration) {
  return Object.freeze({
    async loadActivePreparationKey() {
      const keyBytes = decodeKey(configuration.preparationBase64);
      return keyBytes ? { keyId: configuration.keyId, keyBytes } : null;
    },
  });
}
