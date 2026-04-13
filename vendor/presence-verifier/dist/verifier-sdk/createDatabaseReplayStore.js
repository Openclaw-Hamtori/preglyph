"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseReplayStore = createDatabaseReplayStore;
exports.buildPostgresReplayInsertStatement = buildPostgresReplayInsertStatement;
exports.buildSqliteReplayInsertStatement = buildSqliteReplayInsertStatement;
function createDatabaseReplayStore(options) {
    return {
        async consume(key, consumeOptions) {
            var _a;
            const createdAtMs = consumeOptions.atMs;
            const ttlMs = (_a = consumeOptions.ttlMs) !== null && _a !== void 0 ? _a : options.ttlMs;
            const expiresAtMs = createdAtMs + ttlMs;
            return options.adapter.insertNonce({
                key,
                createdAtMs,
                expiresAtMs,
            });
        },
    };
}
function buildPostgresReplayInsertStatement(input = {}) {
    var _a;
    const tableName = (_a = input.tableName) !== null && _a !== void 0 ? _a : 'presence_replay_nonces';
    return [
        `INSERT INTO ${tableName} (replay_key, created_at_ms, expires_at_ms)`,
        'VALUES ($1, $2, $3)',
        'ON CONFLICT (replay_key) DO NOTHING;',
    ].join(' ');
}
function buildSqliteReplayInsertStatement(input = {}) {
    var _a;
    const tableName = (_a = input.tableName) !== null && _a !== void 0 ? _a : 'presence_replay_nonces';
    return [
        `INSERT OR IGNORE INTO ${tableName} (replay_key, created_at_ms, expires_at_ms)`,
        'VALUES (?, ?, ?);',
    ].join(' ');
}
