import { PresenceReplayStore } from './createStoreReplayProtection';
export interface PresenceDatabaseReplayStoreAdapter {
    insertNonce(input: {
        key: string;
        createdAtMs: number;
        expiresAtMs: number;
    }): Promise<boolean>;
}
export interface DatabaseReplayStoreOptions {
    adapter: PresenceDatabaseReplayStoreAdapter;
    ttlMs: number;
}
export declare function createDatabaseReplayStore(options: DatabaseReplayStoreOptions): PresenceReplayStore;
export interface SqlNonceInsertStatementInput {
    tableName?: string;
}
export declare function buildPostgresReplayInsertStatement(input?: SqlNonceInsertStatementInput): string;
export declare function buildSqliteReplayInsertStatement(input?: SqlNonceInsertStatementInput): string;
