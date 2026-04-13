import { PresenceExpectedContext, PresenceSignedProof, VerifyPresenceReasonCode, VerifyPresenceVerdict } from './contracts';
import { isPresenceSignedProof } from './proofGuards';
export interface PresenceSandboxFixture {
    name: string;
    protocolVersion: 'v0';
    category: 'positive' | 'structural_failure' | 'binding_mismatch' | 'freshness' | 'replay';
    description: string;
    signingSeed?: string;
    proof: unknown;
    verifierInput?: {
        expected?: PresenceExpectedContext;
    };
    expected: {
        verdict: VerifyPresenceVerdict;
        reasonCode: VerifyPresenceReasonCode;
    };
}
export declare function getPresenceSandboxFixtureNames(): string[];
export { isPresenceSignedProof };
export type { PresenceSignedProof };
