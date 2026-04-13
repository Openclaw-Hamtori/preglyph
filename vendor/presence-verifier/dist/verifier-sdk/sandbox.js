"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SANDBOX_FIXTURES_DIR = void 0;
exports.loadPresenceSandboxFixture = loadPresenceSandboxFixture;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
exports.DEFAULT_SANDBOX_FIXTURES_DIR = node_path_1.default.resolve(__dirname, '../../fixtures/presence-sandbox');
async function loadPresenceSandboxFixture(name, fixturesDir = exports.DEFAULT_SANDBOX_FIXTURES_DIR) {
    const fixturePath = node_path_1.default.join(fixturesDir, `${name}.json`);
    const raw = await (0, promises_1.readFile)(fixturePath, 'utf8');
    return JSON.parse(raw);
}
