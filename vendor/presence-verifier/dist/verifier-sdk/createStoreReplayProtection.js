"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryReplayStore = exports.TtlMemoryReplayStore = void 0;
exports.createStoreReplayProtection = createStoreReplayProtection;
function buildReplayKey(input) {
    return [input.sessionId, input.nonce, input.iss, input.installationId].join('\u0000');
}
function createStoreReplayProtection(options) {
    return {
        implementationKind: 'store',
        async consumeNonce(input) {
            var _a;
            const accepted = await options.store.consume(buildReplayKey(input), {
                ttlMs: options.ttlMs,
                atMs: (_a = input.generatedAt) !== null && _a !== void 0 ? _a : Date.now(),
            });
            return {
                accepted,
                replayDetected: !accepted,
            };
        },
    };
}
/**
 * TTL-aware in-memory replay store for store-backed replay protection flows.
 * Useful for tests and simple single-process deployments that want the same
 * interface as Redis/database-backed PresenceReplayStore adapters.
 */
class TtlMemoryReplayStore {
    constructor() {
        this.seen = new Map();
    }
    async consume(key, options) {
        const nowMs = options.atMs;
        if (typeof options.ttlMs === 'number') {
            for (const [existingKey, expiresAtMs] of this.seen.entries()) {
                if (expiresAtMs <= nowMs) {
                    this.seen.delete(existingKey);
                }
            }
        }
        const existingExpiry = this.seen.get(key);
        if (typeof existingExpiry === 'number' && existingExpiry > nowMs) {
            return false;
        }
        const expiresAtMs = typeof options.ttlMs === 'number' ? nowMs + options.ttlMs : Number.MAX_SAFE_INTEGER;
        this.seen.set(key, expiresAtMs);
        return true;
    }
}
exports.TtlMemoryReplayStore = TtlMemoryReplayStore;
/**
 * Backward-compatible alias for TtlMemoryReplayStore. Prefer the TTL-specific
 * name in new code when you want in-memory store semantics.
 */
class MemoryReplayStore extends TtlMemoryReplayStore {
}
exports.MemoryReplayStore = MemoryReplayStore;
