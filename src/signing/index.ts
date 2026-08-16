// ============================================================
// SIGNING module public surface
// ============================================================

export {
  type SigningKeyPair,
} from "./key-store.js"

export {
  signEventBatch,
  type EventSignaturePayload,
  type MerkleRoot,
} from "./signer.js"

export {
  verifyEventLogSignatures,
  type SignatureVerificationStatus,
  type SignatureVerificationReport,
  type EventSignatureResult,
  type MerkleRootVerificationResult,
} from "./verifier.js"
