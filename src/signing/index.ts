// ============================================================
// SIGNING module public surface
// ============================================================

export {
  generateSigningKeyPair,
  loadOrCreateSigningKeyPair,
  loadPublicKey,
  loadPublicKeyFingerprint,
  loadPrivateKey,
  fingerprintPublicKey,
  type SigningKeyPair,
} from "./key-store.js"

export {
  signEvent,
  signEventBatch,
  maybeSignEvent,
  computeMerkleRoot,
  buildMerkleRoot,
  signMerkleRoot,
  type EventSignaturePayload,
  type MerkleRoot,
} from "./signer.js"

export {
  verifyEventSignature,
  verifyMerkleRoot,
  verifyEventLogSignatures,
  type SignatureVerificationStatus,
  type SignatureVerificationReport,
  type EventSignatureResult,
  type MerkleRootVerificationResult,
} from "./verifier.js"
