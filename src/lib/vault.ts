import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { IdentityProfile } from './crypto';

interface VaultDB extends DBSchema {
  keys: {
    key: string;
    value: {
      id: string;
      publicKey: string;
      privateKey: string;
      meta?: string;
    };
  };
  identities: {
    key: string;
    value: IdentityProfile;
  };
}

const DB_NAME = 'sifrly_vault';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null;

export async function getVaultDB(): Promise<IDBPDatabase<VaultDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only accessible in browser runtime.');
  }

  if (!dbPromise) {
    dbPromise = openDB<VaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('identities')) {
          db.createObjectStore('identities', { keyPath: 'username' });
        }
      },
    });
  }

  return dbPromise;
}

export async function storeKey(id: string, pub: string, priv: string, meta?: string): Promise<void> {
  const db = await getVaultDB();
  await db.put('keys', { id, publicKey: pub, privateKey: priv, meta });
}

export async function getKey(id: string) {
  const db = await getVaultDB();
  return db.get('keys', id);
}

export async function storeIdentity(identity: IdentityProfile): Promise<void> {
  const db = await getVaultDB();
  await db.put('identities', identity);
  await storeKey('active_identity', identity.username, '');
  await storeKey('dh_public', identity.dhPublicKey, '');
  await storeKey('dh_private', '', identity.dhPrivateKey);
}

export async function getActiveIdentity(): Promise<IdentityProfile | null> {
  const db = await getVaultDB();
  const activeRecord = await db.get('keys', 'active_identity');
  if (!activeRecord?.publicKey) {
    // Check if there is any identity in the table
    const all = await db.getAll('identities');
    return all.length > 0 ? all[0] : null;
  }
  const identity = await db.get('identities', activeRecord.publicKey);
  return identity || null;
}

export async function clearVault(): Promise<void> {
  const db = await getVaultDB();
  await db.clear('keys');
  await db.clear('identities');
}
