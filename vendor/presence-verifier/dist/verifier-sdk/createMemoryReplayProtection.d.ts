import { PresenceReplayProtection } from './contracts';
export interface MemoryReplayProtectionOptions {
    maxEntries?: number;
}
/**
 * Simple bounded in-memory replay protection for local development, tests, and
 * short-lived single-process verifier runs. This is count-bounded rather than
 * TTL-accurate, so production services should prefer createStoreReplayProtection.
 */
export declare function createBoundedMemoryReplayProtection(options?: MemoryReplayProtectionOptions): PresenceReplayProtection;
/**
 * Backward-compatible alias for createBoundedMemoryReplayProtection(). Kept for
 * existing integrations that already import createMemoryReplayProtection.
 */
export declare const createMemoryReplayProtection: typeof createBoundedMemoryReplayProtection;
