export interface ProofSignature {
    algorithm: string;
    value: string;
}
export interface PresenceSubmitTargetBinding {
    endpoint_ref: string;
    auth_context: string;
}
export interface PresenceProofClaims {
    type: 'presence2.proof_claims';
    version: 1;
    session_id: string;
    request_id: string;
    flow_type: string;
    service_id: string;
    installation_id: string;
    iss: string;
    nonce: string;
    presence_result: 'pass';
}
export interface PresenceKeyAttestationClaims {
    type: 'presence2.key_attestation';
    version: 1;
    session_id: string;
    request_id: string;
    flow_type: string;
    service_id: string;
    installation_id: string;
    iss: string;
    public_key?: string;
    nonce: string;
    endpoint_ref: string;
    auth_context: string;
    attestation_capable: boolean;
    issued_at: number;
}
export interface PresenceKeyAttestationEnvelope {
    type: 'presence2.key_attestation_envelope';
    version: 1;
    format: 'P2_SIGNED_KEY_ASSERTION_V1';
    claims: PresenceKeyAttestationClaims;
    signature: ProofSignature;
}
export interface PresenceSignedProof {
    type: 'presence2.signed_proof';
    version: 1;
    key: {
        iss: string;
        public_key?: string;
        attestation_capable: boolean;
        attestation: PresenceKeyAttestationEnvelope;
    };
    claims: PresenceProofClaims;
    signature: ProofSignature;
}
export interface PresenceExpectedContext {
    protocolVersion?: 'v0';
    serviceId?: string;
    flowType?: string;
    sessionId?: string;
    sessionHandle?: string;
    expectedNonce?: string;
    sessionExpiresAtMs?: number;
    maxProofAgeMs?: number;
    submitTarget?: PresenceSubmitTargetBinding;
}
export interface PresenceReplayProtection {
    implementationKind?: 'memory' | 'store';
    consumeNonce(input: {
        sessionId: string;
        nonce: string;
        iss: string;
        installationId: string;
        generatedAt?: number;
    }): Promise<{
        accepted: boolean;
        replayDetected: boolean;
    }>;
}
export interface PresenceSignatureVerifier {
    verify(input: {
        payload: string;
        signature: ProofSignature;
        iss: string;
        publicKey?: string;
    }): Promise<boolean>;
}
export interface VerifyPresenceInput {
    proof: unknown;
    expected?: PresenceExpectedContext;
    signatureVerifier: PresenceSignatureVerifier;
    replayProtection?: PresenceReplayProtection;
}
export type VerifyPresenceVerdict = 'verified' | 'rejected' | 'expired' | 'replay_detected' | 'invalid';
export type VerifyPresenceReasonCode = 'OK' | 'ERR_PROTOCOL_VERSION_UNSUPPORTED' | 'ERR_PROOF_MALFORMED' | 'ERR_SIGNATURE_INVALID' | 'ERR_SESSION_MISMATCH' | 'ERR_SERVICE_MISMATCH' | 'ERR_FLOW_MISMATCH' | 'ERR_NONCE_INVALID' | 'ERR_EXPIRED' | 'ERR_REPLAY_DETECTED' | 'ERR_ATTESTATION_MISMATCH' | 'ERR_SUBMIT_TARGET_MISMATCH';
export interface VerifyPresenceResult {
    ok: boolean;
    verdict: VerifyPresenceVerdict;
    reasonCode: VerifyPresenceReasonCode;
    details?: string;
    claims?: {
        protocolVersion: 'v0';
        sessionId: string;
        requestId: string;
        serviceId: string;
        flowType: string;
        nonce: string;
        iss: string;
        installationId: string;
        presenceResult: 'pass';
    };
}
