"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoreBackedSignatureVerifier = createStoreBackedSignatureVerifier;
const sha2_js_1 = require("@noble/hashes/sha2.js");
const utils_js_1 = require("@noble/hashes/utils.js");
const identityUtils_1 = require("./identityUtils");
const STORE_BACKED_SIGNATURE_ALGORITHM = 'P2_SEED_SHA256';
function createFallbackSignatureValue(payload, seed) {
    return (0, utils_js_1.bytesToHex)((0, sha2_js_1.sha256)((0, utils_js_1.utf8ToBytes)(`${payload}\n${seed}`)));
}
function createStoreBackedSignatureVerifier(signingSeedResolver) {
    return {
        async verify({ payload, signature, iss, publicKey }) {
            if (signature.algorithm !== STORE_BACKED_SIGNATURE_ALGORITHM ||
                typeof signature.value !== 'string' ||
                signature.value.length === 0) {
                return false;
            }
            const signingSeedRecord = await signingSeedResolver.resolveByIss({
                iss,
                publicKey,
            });
            if (!signingSeedRecord) {
                return false;
            }
            const identitySource = typeof signingSeedRecord.publicKey === 'string' &&
                signingSeedRecord.publicKey.length > 0
                ? signingSeedRecord.publicKey
                : signingSeedRecord.seed;
            if ((0, identityUtils_1.derivePresenceIssuerIdentifier)(identitySource) !== iss) {
                return false;
            }
            return (signature.value ===
                createFallbackSignatureValue(payload, signingSeedRecord.seed));
        },
    };
}
