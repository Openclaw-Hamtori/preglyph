"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryReplayProtection = void 0;
exports.createBoundedMemoryReplayProtection = createBoundedMemoryReplayProtection;
const DEFAULT_MAX_ENTRIES = 1024;
function buildReplayKey(input) {
    return [input.sessionId, input.nonce, input.iss, input.installationId].join('\u0000');
}
/**
 * Simple bounded in-memory replay protection for local development, tests, and
 * short-lived single-process verifier runs. This is count-bounded rather than
 * TTL-accurate, so production services should prefer createStoreReplayProtection.
 */
function createBoundedMemoryReplayProtection(options = {}) {
    var _a;
    const maxEntries = (_a = options.maxEntries) !== null && _a !== void 0 ? _a : DEFAULT_MAX_ENTRIES;
    const seen = new Set();
    return {
        implementationKind: 'memory',
        async consumeNonce(input) {
            const key = buildReplayKey(input);
            if (seen.has(key)) {
                return { accepted: false, replayDetected: true };
            }
            seen.add(key);
            while (seen.size > maxEntries) {
                const oldest = seen.values().next().value;
                if (!oldest) {
                    break;
                }
                seen.delete(oldest);
            }
            return { accepted: true, replayDetected: false };
        },
    };
}
/**
 * Backward-compatible alias for createBoundedMemoryReplayProtection(). Kept for
 * existing integrations that already import createMemoryReplayProtection.
 */
exports.createMemoryReplayProtection = createBoundedMemoryReplayProtection;
