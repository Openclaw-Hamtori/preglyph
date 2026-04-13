import { VerifyPresenceResult } from './contracts';
export declare function isVerifiedPresenceResult(result: VerifyPresenceResult): result is VerifyPresenceResult & {
    ok: true;
    verdict: 'verified';
};
export declare function assertVerifiedPresenceResult(result: VerifyPresenceResult): asserts result is VerifyPresenceResult & {
    ok: true;
    verdict: 'verified';
};
