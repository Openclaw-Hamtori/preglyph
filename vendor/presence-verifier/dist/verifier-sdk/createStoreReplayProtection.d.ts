import { PresenceReplayProtection } from './contracts';
export interface PresenceReplayStore {
    consume(key: string, options: {
        ttlMs?: number;
        atMs: number;
    }): Promise<boolean>;
}
export interface StoreReplayProtectionOptions {
    store: PresenceReplayStore;
    ttlMs?: number;
}
export declare function createStoreReplayProtection(options: StoreReplayProtectionOptions): PresenceReplayProtection;
/**
 * TTL-aware in-memory replay store for store-backed replay protection flows.
 * Useful for tests and simple single-process deployments that want the same
 * interface as Redis/database-backed PresenceReplayStore adapters.
 */
export declare class TtlMemoryReplayStore implements PresenceReplayStore {
    private readonly seen;
    consume(key: string, options: {
        ttlMs?: number;
        atMs: number;
    }): Promise<boolean>;
}
/**
 * Backward-compatible alias for TtlMemoryReplayStore. Prefer the TTL-specific
 * name in new code when you want in-memory store semantics.
 */
export declare class MemoryReplayStore extends TtlMemoryReplayStore {
}
