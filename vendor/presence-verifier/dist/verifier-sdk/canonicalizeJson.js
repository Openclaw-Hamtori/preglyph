"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeJson = canonicalizeJson;
function canonicalizeJson(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(item => canonicalizeJson(item)).join(',')}]`;
    }
    const entries = Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    return `{${entries
        .map(([key, nestedValue]) => `${JSON.stringify(key)}:${canonicalizeJson(nestedValue)}`)
        .join(',')}}`;
}
