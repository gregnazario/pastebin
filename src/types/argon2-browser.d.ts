/**
 * Type declarations for argon2-browser
 */
declare module 'argon2-browser' {
  export enum ArgonType {
    Argon2d = 0,
    Argon2i = 1,
    Argon2id = 2,
  }

  export interface ArgonHashOptions {
    pass: string;
    salt: Uint8Array;
    type: ArgonType;
    time: number;
    mem: number;
    hashLen: number;
    parallelism: number;
  }

  export interface ArgonHashResult {
    hash: Uint8Array;
    hashHex?: string;
    encoded?: string;
  }

  export function hash(options: ArgonHashOptions): Promise<ArgonHashResult>;

  const argon2: {
    hash: typeof hash;
    ArgonType: typeof ArgonType;
  };

  export default argon2;
}
