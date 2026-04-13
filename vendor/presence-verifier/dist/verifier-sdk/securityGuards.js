"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertProductionReadyExpectedContext = assertProductionReadyExpectedContext;
exports.assertProductionReadyVerifierInput = assertProductionReadyVerifierInput;
function isMemoryReplayProtection(value) {
    if (!value) {
        return false;
    }
    return value.implementationKind === 'memory';
}
function assertProductionReadyExpectedContext(expected) {
    if (!expected) {
        throw new Error('Expected verifier context is required in production.');
    }
    if (!expected.serviceId) {
        throw new Error('Expected serviceId is required in production.');
    }
    if (!expected.sessionId) {
        throw new Error('Expected sessionId is required in production.');
    }
    if (!expected.submitTarget) {
        throw new Error('Expected submitTarget is required in production.');
    }
    if (typeof expected.maxProofAgeMs !== 'number' || expected.maxProofAgeMs <= 0) {
        throw new Error('Expected maxProofAgeMs is required in production.');
    }
}
function assertProductionReadyVerifierInput(input) {
    assertProductionReadyExpectedContext(input.expected);
    if (!input.replayProtection) {
        throw new Error('Replay protection is required in production.');
    }
    if (isMemoryReplayProtection(input.replayProtection)) {
        throw new Error('Memory replay protection must not be used in production.');
    }
}
