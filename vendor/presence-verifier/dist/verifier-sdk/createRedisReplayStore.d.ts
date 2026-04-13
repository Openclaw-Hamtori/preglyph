import { PresenceReplayStore } from './createStoreReplayProtection';
export interface PresenceRedisLikeClient {
    set(key: string, value: string, options?: {
        NX?: boolean;
        PX?: number;
    }): Promise<'OK' | null | undefined>;
}
export interface RedisReplayStoreOptions {
    client: PresenceRedisLikeClient;
    keyPrefix?: string;
    ttlMs: number;
}
export declare function createRedisReplayStore(options: RedisReplayStoreOptions): PresenceReplayStore;
