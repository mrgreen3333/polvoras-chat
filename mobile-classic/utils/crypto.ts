import nacl from "tweetnacl";

export type KeyPair = {
  publicKey: string;
  secretKey: string;
};

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function strToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToStr(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: bytesToB64(kp.publicKey),
    secretKey: bytesToB64(kp.secretKey),
  };
}

export function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderSecretKeyB64: string
): { encrypted: string; nonce: string } | null {
  try {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const recipientPk = b64ToBytes(recipientPublicKeyB64);
    const senderSk = b64ToBytes(senderSecretKeyB64);
    const msg = strToBytes(plaintext);
    const box = nacl.box(msg, nonce, recipientPk, senderSk);
    return { encrypted: bytesToB64(box), nonce: bytesToB64(nonce) };
  } catch {
    return null;
  }
}

export function decryptMessage(
  encryptedB64: string,
  nonceB64: string,
  senderPublicKeyB64: string,
  recipientSecretKeyB64: string
): string | null {
  try {
    const encrypted = b64ToBytes(encryptedB64);
    const nonce = b64ToBytes(nonceB64);
    const senderPk = b64ToBytes(senderPublicKeyB64);
    const recipientSk = b64ToBytes(recipientSecretKeyB64);
    const opened = nacl.box.open(encrypted, nonce, senderPk, recipientSk);
    if (!opened) return null;
    return bytesToStr(opened);
  } catch {
    return null;
  }
}
