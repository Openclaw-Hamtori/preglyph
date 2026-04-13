"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVerifiedPresenceResult = isVerifiedPresenceResult;
exports.assertVerifiedPresenceResult = assertVerifiedPresenceResult;
function isVerifiedPresenceResult(result) {
    return result.ok && result.verdict === 'verified';
}
function assertVerifiedPresenceResult(result) {
    if (!isVerifiedPresenceResult(result)) {
        throw new Error(`Expected verified Presence result, got ${result.verdict} (${result.reasonCode}).`);
    }
}
