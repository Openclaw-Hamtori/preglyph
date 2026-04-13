"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPresenceSignedProof = void 0;
exports.getPresenceSandboxFixtureNames = getPresenceSandboxFixtureNames;
const proofGuards_1 = require("./proofGuards");
Object.defineProperty(exports, "isPresenceSignedProof", { enumerable: true, get: function () { return proofGuards_1.isPresenceSignedProof; } });
function getPresenceSandboxFixtureNames() {
    return [
        'valid-verify-proof',
        'malformed-proof-envelope',
        'expired-session-proof',
        'replay-proof',
        'wrong-service-proof',
    ];
}
