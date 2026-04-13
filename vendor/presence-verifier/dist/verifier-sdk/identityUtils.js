"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveCompactIdentifier = deriveCompactIdentifier;
exports.derivePresenceIssuerIdentifier = derivePresenceIssuerIdentifier;
const sha2_js_1 = require("@noble/hashes/sha2.js");
const utils_js_1 = require("@noble/hashes/utils.js");
function deriveCompactIdentifier(prefix, seed) {
    return `${prefix}${(0, utils_js_1.bytesToHex)((0, sha2_js_1.sha256)((0, utils_js_1.utf8ToBytes)(seed))).slice(0, 24)}`;
}
function derivePresenceIssuerIdentifier(identitySource) {
    return deriveCompactIdentifier('p2iss_', identitySource);
}
