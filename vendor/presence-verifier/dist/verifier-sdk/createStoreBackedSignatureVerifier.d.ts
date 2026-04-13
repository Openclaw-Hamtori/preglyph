import { PresenceSignatureVerifier } from './contracts';
export interface PresenceSigningSeedRecord {
    seed: string;
    publicKey?: string;
}
export interface PresenceSigningSeedResolver {
    resolveByIss(input: {
        iss: string;
        publicKey?: string;
    }): Promise<PresenceSigningSeedRecord | null>;
}
export declare function createStoreBackedSignatureVerifier(signingSeedResolver: PresenceSigningSeedResolver): PresenceSignatureVerifier;
