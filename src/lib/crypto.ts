import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { bytesToHex, hexToBytes } from '@noble/curves/utils.js';

export interface IdentityProfile {
  username: string;
  signingPublicKey: string;
  signingPrivateKey: string;
  dhPublicKey: string;
  dhPrivateKey: string;
  registrationSignature: string;
}

export interface EncryptedEnvelopePayload {
  nonce: string;
  ciphertext: string;
  mac: string;
  senderEphemeralKey: string;
}

export function createLocalIdentity(username: string): IdentityProfile {
  const signingPriv = ed25519.utils.randomSecretKey();
  const signingPub = ed25519.getPublicKey(signingPriv);

  const dhPriv = x25519.utils.randomSecretKey();
  const dhPub = x25519.getPublicKey(dhPriv);

  const dhPubHex = bytesToHex(dhPub);
  const messageToSign = new TextEncoder().encode(`${username}:${dhPubHex}`);
  const signature = ed25519.sign(messageToSign, signingPriv);

  return {
    username,
    signingPublicKey: bytesToHex(signingPub),
    signingPrivateKey: bytesToHex(signingPriv),
    dhPublicKey: dhPubHex,
    dhPrivateKey: bytesToHex(dhPriv),
    registrationSignature: bytesToHex(signature),
  };
}

export function verifyIdentitySignature(
  username: string,
  dhPublicKeyHex: string,
  signingPublicKeyHex: string,
  signatureHex: string
): boolean {
  try {
    const messageToVerify = new TextEncoder().encode(`${username}:${dhPublicKeyHex}`);
    return ed25519.verify(
      hexToBytes(signatureHex),
      messageToVerify,
      hexToBytes(signingPublicKeyHex)
    );
  } catch {
    return false;
  }
}

export async function deriveMailboxToken(dhPublicKey: string): Promise<string> {
  const data = new TextEncoder().encode(`mailbox:${dhPublicKey}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hash));
}

/**
 * Encrypts payload with an ephemeral X25519 keypair for Forward Secrecy.
 */
export async function encryptForwardSecretPayload(
  recipientDhPubHex: string,
  plaintext: string
): Promise<EncryptedEnvelopePayload> {
  const ephemeralPriv = x25519.utils.randomSecretKey();
  const ephemeralPub = x25519.getPublicKey(ephemeralPriv);

  const sharedKey = x25519.getSharedSecret(ephemeralPriv, hexToBytes(recipientDhPubHex));
  const hkdfKey = await crypto.subtle.importKey('raw', sharedKey, 'HKDF', false, ['deriveKey']);

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('sifrly-v1-msg'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    encodedText
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);

  return {
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    mac: bytesToHex(tag),
    senderEphemeralKey: bytesToHex(ephemeralPub),
  };
}

export async function encryptDirectPayload(
  recipientDhPubHex: string,
  _myDhPrivHex: string,
  plaintext: string
): Promise<EncryptedEnvelopePayload> {
  return encryptForwardSecretPayload(recipientDhPubHex, plaintext);
}

export async function decryptDirectPayload(
  senderEphemeralKeyHex: string,
  myDhPrivHex: string,
  nonceHex: string,
  ciphertextHex: string,
  macHex: string
): Promise<string> {
  const sharedKey = x25519.getSharedSecret(hexToBytes(myDhPrivHex), hexToBytes(senderEphemeralKeyHex));
  const hkdfKey = await crypto.subtle.importKey('raw', sharedKey, 'HKDF', false, ['deriveKey']);

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('sifrly-v1-msg'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const cipherBytes = hexToBytes(ciphertextHex);
  const tagBytes = hexToBytes(macHex);
  const combined = new Uint8Array(cipherBytes.length + tagBytes.length);
  combined.set(cipherBytes);
  combined.set(tagBytes, cipherBytes.length);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(nonceHex) },
    aesKey,
    combined
  );

  return new TextDecoder().decode(decryptedBuffer);
}

export function generateAnonymousHandle(): string {
  const adjectives = ['cipher', 'phantom', 'zero', 'shadow', 'vault', 'sifr', 'ghost', 'stealth', 'opaque', 'nexus'];
  const nouns = ['agent', 'node', 'seal', 'pulse', 'relay', 'key', 'matrix', 'echo', 'core', 'token'];
  const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const hexSuffix = bytesToHex(crypto.getRandomValues(new Uint8Array(2)));
  return `${randAdj}_${randNoun}_${hexSuffix}`;
}
