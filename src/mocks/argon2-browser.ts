/**
 * Mock for argon2-browser to use in browser environment
 * Uses Web Crypto API PBKDF2 as a fallback
 */

export enum ArgonType {
  Argon2d = 0,
  Argon2i = 1,
  Argon2id = 2,
}

interface ArgonHashOptions {
  pass: string;
  salt: Uint8Array;
  type: ArgonType;
  time: number;
  mem: number;
  hashLen: number;
  parallelism: number;
}

async function hash(options: ArgonHashOptions): Promise<{ hash: Uint8Array }> {
  // Use Web Crypto API PBKDF2 as a fallback
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(options.pass),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: options.salt,
      iterations: options.time * 1000, // Convert time to iterations
      hash: 'SHA-256'
    },
    keyMaterial,
    options.hashLen * 8 // Convert bytes to bits
  );

  return {
    hash: new Uint8Array(derivedBits)
  };
}

const argon2 = {
  hash,
  ArgonType
};

export default argon2;
export { ArgonType };