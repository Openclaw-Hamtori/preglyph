"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPresence = verifyPresence;
const canonicalizeJson_1 = require("./canonicalizeJson");
const proofGuards_1 = require("./proofGuards");
function validateNonce(nonce) {
    const trimmedNonce = nonce.trim();
    if (!trimmedNonce) {
        return { ok: false, detail: 'Presence proof nonce is empty.' };
    }
    if (trimmedNonce !== nonce || /\s/.test(nonce)) {
        return {
            ok: false,
            detail: 'Presence proof nonce must not include whitespace.',
        };
    }
    return { ok: true };
}
function malformed(details) {
    return {
        ok: false,
        verdict: 'invalid',
        reasonCode: 'ERR_PROOF_MALFORMED',
        details,
    };
}
function rejected(reasonCode, details) {
    return {
        ok: false,
        verdict: 'rejected',
        reasonCode,
        details,
    };
}
function buildClaimsResult(proof) {
    return {
        protocolVersion: 'v0',
        sessionId: proof.claims.session_id,
        requestId: proof.claims.request_id,
        serviceId: proof.claims.service_id,
        flowType: proof.claims.flow_type,
        nonce: proof.claims.nonce,
        iss: proof.claims.iss,
        installationId: proof.claims.installation_id,
        presenceResult: proof.claims.presence_result,
    };
}
function validateInternalConsistency(proof) {
    const attestationClaims = proof.key.attestation.claims;
    const nonceValidation = validateNonce(proof.claims.nonce);
    if (!nonceValidation.ok) {
        return {
            ok: false,
            verdict: 'invalid',
            reasonCode: 'ERR_NONCE_INVALID',
            details: nonceValidation.detail,
        };
    }
    if (proof.key.iss !== proof.claims.iss ||
        proof.key.iss !== attestationClaims.iss ||
        proof.claims.session_id !== attestationClaims.session_id ||
        proof.claims.request_id !== attestationClaims.request_id ||
        proof.claims.flow_type !== attestationClaims.flow_type ||
        proof.claims.service_id !== attestationClaims.service_id ||
        proof.claims.installation_id !== attestationClaims.installation_id ||
        proof.claims.nonce !== attestationClaims.nonce ||
        proof.key.public_key !== attestationClaims.public_key ||
        proof.key.attestation_capable !== attestationClaims.attestation_capable) {
        return {
            ok: false,
            verdict: 'invalid',
            reasonCode: 'ERR_ATTESTATION_MISMATCH',
            details: 'Proof claims do not match the embedded key attestation.',
        };
    }
    return null;
}
function validateExpectedContext(proof, expected) {
    if (!expected) {
        return null;
    }
    if (expected.protocolVersion && expected.protocolVersion !== 'v0') {
        return {
            ok: false,
            verdict: 'invalid',
            reasonCode: 'ERR_PROTOCOL_VERSION_UNSUPPORTED',
            details: 'Only protocol version v0 is supported by this verifier skeleton.',
        };
    }
    if (expected.serviceId && expected.serviceId !== proof.claims.service_id) {
        return rejected('ERR_SERVICE_MISMATCH', 'Proof service_id does not match the expected service.');
    }
    if (expected.flowType && expected.flowType !== proof.claims.flow_type) {
        return rejected('ERR_FLOW_MISMATCH', 'Proof flow_type does not match the expected flow.');
    }
    if (expected.sessionId && expected.sessionId !== proof.claims.session_id) {
        return rejected('ERR_SESSION_MISMATCH', 'Proof session_id does not match the expected session.');
    }
    if (expected.sessionHandle &&
        expected.sessionHandle !== proof.claims.request_id) {
        return rejected('ERR_SESSION_MISMATCH', 'Proof request_id does not match the expected session handle.');
    }
    if (expected.expectedNonce !== undefined &&
        expected.expectedNonce !== proof.claims.nonce) {
        return rejected('ERR_NONCE_INVALID', 'Proof nonce does not match the server-issued nonce for this request.');
    }
    if (typeof expected.sessionExpiresAtMs === 'number' &&
        expected.sessionExpiresAtMs <= Date.now()) {
        return {
            ok: false,
            verdict: 'expired',
            reasonCode: 'ERR_EXPIRED',
            details: 'Expected hydrated session is already expired.',
        };
    }
    if (typeof expected.maxProofAgeMs === 'number') {
        const proofAgeMs = Date.now() - proof.key.attestation.claims.issued_at;
        if (!Number.isFinite(proofAgeMs) || proofAgeMs < 0 || proofAgeMs > expected.maxProofAgeMs) {
            return {
                ok: false,
                verdict: 'expired',
                reasonCode: 'ERR_EXPIRED',
                details: 'Presence proof is outside the allowed freshness window.',
            };
        }
    }
    if (expected.submitTarget &&
        (expected.submitTarget.endpoint_ref !==
            proof.key.attestation.claims.endpoint_ref ||
            expected.submitTarget.auth_context !==
                proof.key.attestation.claims.auth_context)) {
        return rejected('ERR_SUBMIT_TARGET_MISMATCH', 'Proof submit target does not match the expected submit target.');
    }
    return null;
}
async function validateSignatures(proof, input) {
    const key = proof.key;
    const attestationValid = await input.signatureVerifier.verify({
        payload: (0, canonicalizeJson_1.canonicalizeJson)(key.attestation.claims),
        signature: key.attestation.signature,
        iss: key.iss,
        publicKey: key.public_key,
    });
    if (!attestationValid) {
        return {
            ok: false,
            verdict: 'invalid',
            reasonCode: 'ERR_SIGNATURE_INVALID',
            details: 'Proof key attestation signature is invalid.',
        };
    }
    const signatureValid = await input.signatureVerifier.verify({
        payload: (0, canonicalizeJson_1.canonicalizeJson)(proof.claims),
        signature: proof.signature,
        iss: key.iss,
        publicKey: key.public_key,
    });
    if (!signatureValid) {
        return {
            ok: false,
            verdict: 'invalid',
            reasonCode: 'ERR_SIGNATURE_INVALID',
            details: 'Proof signature is invalid.',
        };
    }
    return null;
}
async function validateReplay(proof, input) {
    if (!input.replayProtection) {
        return null;
    }
    const replayResult = await input.replayProtection.consumeNonce({
        sessionId: proof.claims.session_id,
        nonce: proof.claims.nonce,
        iss: proof.claims.iss,
        installationId: proof.claims.installation_id,
        generatedAt: proof.key.attestation.claims.issued_at,
    });
    if (!replayResult.accepted || replayResult.replayDetected) {
        return {
            ok: false,
            verdict: 'replay_detected',
            reasonCode: 'ERR_REPLAY_DETECTED',
            details: 'Proof nonce was already consumed by the verifier.',
        };
    }
    return null;
}
async function verifyPresence(input) {
    if (!(0, proofGuards_1.isPresenceSignedProof)(input.proof)) {
        return malformed('Proof payload does not match the canonical Presence signed proof shape.');
    }
    const proof = input.proof;
    const consistencyError = validateInternalConsistency(proof);
    if (consistencyError) {
        return consistencyError;
    }
    const expectedError = validateExpectedContext(proof, input.expected);
    if (expectedError) {
        return expectedError;
    }
    const signatureError = await validateSignatures(proof, input);
    if (signatureError) {
        return signatureError;
    }
    const replayError = await validateReplay(proof, input);
    if (replayError) {
        return replayError;
    }
    return {
        ok: true,
        verdict: 'verified',
        reasonCode: 'OK',
        claims: buildClaimsResult(proof),
    };
}
