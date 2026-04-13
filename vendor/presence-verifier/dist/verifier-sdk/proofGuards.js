"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPresenceSignedProof = isPresenceSignedProof;
function isRecord(value) {
    return Boolean(value) && typeof value === 'object';
}
function isProofSignature(value) {
    return (isRecord(value) &&
        typeof value.algorithm === 'string' &&
        typeof value.value === 'string');
}
function isPresenceSignedProof(value) {
    if (!isRecord(value)) {
        return false;
    }
    const key = value.key;
    const claims = value.claims;
    const signature = value.signature;
    if (value.type !== 'presence2.signed_proof' ||
        value.version !== 1 ||
        !isRecord(key) ||
        typeof key.iss !== 'string' ||
        (key.public_key !== undefined && typeof key.public_key !== 'string') ||
        typeof key.attestation_capable !== 'boolean' ||
        !isRecord(key.attestation) ||
        key.attestation.type !== 'presence2.key_attestation_envelope' ||
        key.attestation.version !== 1 ||
        key.attestation.format !== 'P2_SIGNED_KEY_ASSERTION_V1' ||
        !isRecord(key.attestation.claims) ||
        !isProofSignature(key.attestation.signature) ||
        !isRecord(claims) ||
        !isProofSignature(signature)) {
        return false;
    }
    return (claims.type === 'presence2.proof_claims' &&
        claims.version === 1 &&
        typeof claims.session_id === 'string' &&
        typeof claims.request_id === 'string' &&
        typeof claims.flow_type === 'string' &&
        typeof claims.service_id === 'string' &&
        typeof claims.installation_id === 'string' &&
        typeof claims.iss === 'string' &&
        typeof claims.nonce === 'string' &&
        claims.presence_result === 'pass' &&
        key.attestation.claims.type === 'presence2.key_attestation' &&
        key.attestation.claims.version === 1 &&
        typeof key.attestation.claims.session_id === 'string' &&
        typeof key.attestation.claims.request_id === 'string' &&
        typeof key.attestation.claims.flow_type === 'string' &&
        typeof key.attestation.claims.service_id === 'string' &&
        typeof key.attestation.claims.installation_id === 'string' &&
        typeof key.attestation.claims.iss === 'string' &&
        (key.attestation.claims.public_key === undefined ||
            typeof key.attestation.claims.public_key === 'string') &&
        typeof key.attestation.claims.nonce === 'string' &&
        typeof key.attestation.claims.endpoint_ref === 'string' &&
        typeof key.attestation.claims.auth_context === 'string' &&
        typeof key.attestation.claims.attestation_capable === 'boolean' &&
        typeof key.attestation.claims.issued_at === 'number');
}
