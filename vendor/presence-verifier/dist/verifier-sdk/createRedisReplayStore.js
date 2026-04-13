"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisReplayStore = createRedisReplayStore;
function buildRedisReplayKey(prefix, key) {
    return `${prefix}${key}`;
}
function createRedisReplayStore(options) {
    var _a;
    const keyPrefix = (_a = options.keyPrefix) !== null && _a !== void 0 ? _a : 'presence:replay:';
    return {
        async consume(key) {
            const result = await options.client.set(buildRedisReplayKey(keyPrefix, key), '1', {
                NX: true,
                PX: options.ttlMs,
            });
            return result === 'OK';
        },
    };
}
