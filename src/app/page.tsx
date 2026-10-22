'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { IdentitySetup } from '@/components/chat/IdentitySetup';
import { supabase } from '@/lib/supabase';
import {
  createLocalIdentity,
  deriveMailboxToken,
  encryptForwardSecretPayload,
  decryptDirectPayload,
  IdentityProfile,
} from '@/lib/crypto';
import {
  storeIdentity,
  getActiveIdentity,
  clearVault,
  getKey,
} from '@/lib/vault';
import { ChatMessage, Conversation, EncryptedMessagePacket } from '@/lib/types';
import { MessageSquare, ShieldCheck } from 'lucide-react';

function SifrlyChatMessenger() {
  const searchParams = useSearchParams();
  const initialToParam = searchParams.get('to') || '';

  const [identity, setIdentity] = useState<IdentityProfile | null>(null);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(false);
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [contactDhKeys, setContactDhKeys] = useState<Record<string, string>>({});
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});

  // Load existing Identity from browser IndexedDB
  useEffect(() => {
    async function initFromVault() {
      try {
        const stored = await getActiveIdentity();
        if (stored) {
          setIdentity(stored);
        }
      } catch (err) {
        console.error('Failed reading vault from IndexedDB:', err);
      }
    }
    initFromVault();
  }, []);

  // Fetch or cache recipient's public DH key
  const fetchRecipientDhKey = useCallback(async (handle: string): Promise<string | null> => {
    const clean = handle.trim().toLowerCase();
    if (contactDhKeys[clean]) return contactDhKeys[clean];

    try {
      const { data, error } = await supabase
        .from('identities')
        .select('dh_public_key')
        .eq('username', clean)
        .single();

      if (error || !data?.dh_public_key) return null;

      setContactDhKeys((prev) => ({ ...prev, [clean]: data.dh_public_key }));
      return data.dh_public_key;
    } catch {
      return null;
    }
  }, [contactDhKeys]);

  // Handle URL parameter ?to=someone
  useEffect(() => {
    if (!initialToParam || !identity) return;
    const cleanTo = initialToParam.trim().toLowerCase();
    if (cleanTo === identity.username.toLowerCase()) return;

    const timer = setTimeout(() => {
      setActiveContact(cleanTo);
      fetchRecipientDhKey(cleanTo);
    }, 0);

    return () => clearTimeout(timer);
  }, [initialToParam, identity, fetchRecipientDhKey]);

  // Register New Client Identity
  const handleRegister = async (chosenHandle: string): Promise<boolean> => {
    setIsLoadingIdentity(true);
    try {
      const cleanHandle = chosenHandle.trim().toLowerCase();
      const newIdentity = createLocalIdentity(cleanHandle);

      // Register public keys on Supabase relay
      const { error } = await supabase.from('identities').insert({
        username: newIdentity.username,
        signing_public_key: newIdentity.signingPublicKey,
        dh_public_key: newIdentity.dhPublicKey,
        registration_signature: newIdentity.registrationSignature,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This anonymous handle is already registered. Choose another.');
        }
        throw new Error(error.message);
      }

      await storeIdentity(newIdentity);
      setIdentity(newIdentity);
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Registration failed.');
      return false;
    } finally {
      setIsLoadingIdentity(false);
    }
  };

  // Nuke Vault & Purge all local state
  const handleNukeVault = async () => {
    await clearVault();
    setIdentity(null);
    setActiveContact(null);
    setConversations({});
    setContactDhKeys({});
  };

  // Select contact
  const handleSelectContact = async (contact: string, providedDhKey?: string) => {
    const clean = contact.trim().toLowerCase();
    setActiveContact(clean);
    if (providedDhKey) {
      setContactDhKeys((prev) => ({ ...prev, [clean]: providedDhKey }));
    } else {
      await fetchRecipientDhKey(clean);
    }
  };

  // Send E2EE Message
  const handleSendMessage = async (text: string) => {
    if (!identity || !activeContact) return;

    const recipientDhKey = await fetchRecipientDhKey(activeContact);
    if (!recipientDhKey) {
      alert(`Could not resolve public key for ${activeContact}. Ensure they are registered.`);
      return;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Pack message with sender metadata inside the encrypted ciphertext
    const packet: EncryptedMessagePacket = {
      sender: identity.username,
      text,
      timestamp,
      ttlSeconds: 60,
    };

    // 2. Encrypt with Forward Secrecy using fresh Ephemeral X25519 Keypair
    const encrypted = await encryptForwardSecretPayload(recipientDhKey, JSON.stringify(packet));

    // 3. Derive Blinded Mailbox Token
    const mailboxToken = await deriveMailboxToken(recipientDhKey);

    // 4. Post to Supabase Ephemeral Queue
    const { error } = await supabase.from('message_queue').insert({
      recipient_mailbox_token: mailboxToken,
      sender_ephemeral_key: encrypted.senderEphemeralKey,
      nonce: encrypted.nonce,
      ciphertext: encrypted.ciphertext,
      mac: encrypted.mac,
    });

    if (error) {
      alert(`Relay delivery failed: ${error.message}`);
      return;
    }

    // 5. Optimistically append to local conversation thread
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: identity.username,
      recipient: activeContact,
      text,
      timestamp,
      isOutgoing: true,
      ttlSeconds: 60,
    };

    setConversations((prev) => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), newMsg],
    }));
  };

  // Ephemeral Relay Receiver with Immediate Atomic Hard Purge
  const pollAndPurgeEnvelopes = useCallback(async () => {
    if (!identity) return;

    try {
      const dhPrivRecord = await getKey('dh_private');
      if (!dhPrivRecord?.privateKey) return;

      const mailboxToken = await deriveMailboxToken(identity.dhPublicKey);

      const { data: envelopes, error } = await supabase
        .from('message_queue')
        .select('*')
        .eq('recipient_mailbox_token', mailboxToken);

      if (error || !envelopes || envelopes.length === 0) return;

      for (const env of envelopes) {
        try {
          // Decrypt payload in volatile memory
          const decryptedPlaintext = await decryptDirectPayload(
            env.sender_ephemeral_key,
            dhPrivRecord.privateKey,
            env.nonce,
            env.ciphertext,
            env.mac
          );

          // ATOMIC HARD PURGE: Obliterate envelope from Supabase immediately upon decrypt
          await supabase.from('message_queue').delete().eq('id', env.id);

          // Unpack payload
          let senderHandle = 'Anonymous Peer';
          let messageContent = decryptedPlaintext;
          let timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          try {
            const parsed = JSON.parse(decryptedPlaintext) as EncryptedMessagePacket;
            if (parsed.sender && parsed.text) {
              senderHandle = parsed.sender;
              messageContent = parsed.text;
              if (parsed.timestamp) timestamp = parsed.timestamp;
            }
          } catch {
            // Raw text fallback
          }

          const incomingMsg: ChatMessage = {
            id: env.id,
            sender: senderHandle,
            recipient: identity.username,
            text: messageContent,
            timestamp,
            isOutgoing: false,
            ttlSeconds: 60,
          };

          setConversations((prev) => {
            const existing = prev[senderHandle] || [];
            if (existing.some((m) => m.id === env.id)) return prev;
            return {
              ...prev,
              [senderHandle]: [...existing, incomingMsg],
            };
          });

          // Fetch sender DH key if needed for safety number verification
          fetchRecipientDhKey(senderHandle);
        } catch (decryptErr) {
          console.error('Decryption failed for envelope:', env.id, decryptErr);
          await supabase.from('message_queue').delete().eq('id', env.id);
        }
      }
    } catch (err) {
      console.error('Mailbox sync error:', err);
    }
  }, [identity, fetchRecipientDhKey]);

  // Realtime Subscription + 2.5s Polling Fallback
  useEffect(() => {
    if (!identity) return;

    const initialTimer = setTimeout(() => {
      pollAndPurgeEnvelopes();
    }, 0);

    const interval = setInterval(pollAndPurgeEnvelopes, 2500);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`mailbox_${identity.username}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_queue',
          },
          () => {
            pollAndPurgeEnvelopes();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime fallback to polling:', err);
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [identity, pollAndPurgeEnvelopes]);

  const handleBurnMessage = (id: string) => {
    if (!activeContact) return;
    setConversations((prev) => ({
      ...prev,
      [activeContact]: (prev[activeContact] || []).filter((m) => m.id !== id),
    }));
  };

  const handleClearThread = () => {
    if (!activeContact) return;
    setConversations((prev) => ({
      ...prev,
      [activeContact]: [],
    }));
  };

  // Prepare conversations list for Sidebar
  const conversationList: Conversation[] = useMemo(() => {
    return Object.keys(conversations).map((handle) => {
      const msgs = conversations[handle] || [];
      const lastMsg = msgs[msgs.length - 1];
      return {
        contactHandle: handle,
        contactDhKey: contactDhKeys[handle] || '',
        lastMessage: lastMsg ? lastMsg.text : 'Thread initialized',
        lastTimestamp: lastMsg ? lastMsg.timestamp : '',
        unreadCount: 0,
      };
    });
  }, [conversations, contactDhKeys]);

  // If no identity yet, show Onboarding State 0
  if (!identity) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <IdentitySetup onRegister={handleRegister} isLoading={isLoadingIdentity} />
        </div>
      </div>
    );
  }

  const activeMessages = activeContact ? conversations[activeContact] || [] : [];
  const activeDhKey = activeContact ? contactDhKeys[activeContact] || '' : '';

  return (
    <div className="h-screen w-screen flex bg-black text-zinc-100 overflow-hidden font-sans">
      {/* Mobile: Show either Sidebar or ChatWindow */}
      <div className="md:hidden w-full h-full flex flex-col">
        {!activeContact ? (
          <Sidebar
            currentUsername={identity.username}
            activeContact={activeContact}
            conversations={conversationList}
            onSelectContact={handleSelectContact}
            onNukeVault={handleNukeVault}
          />
        ) : (
          <ChatWindow
            currentUsername={identity.username}
            currentDhKey={identity.dhPublicKey}
            contactHandle={activeContact}
            contactDhKey={activeDhKey}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onBurnMessage={handleBurnMessage}
            onClearThread={handleClearThread}
            onBackToContacts={() => setActiveContact(null)}
          />
        )}
      </div>

      {/* Desktop: Split-View (Sidebar + Main Panel) */}
      <div className="hidden md:flex w-full h-full">
        {/* Left Sidebar */}
        <Sidebar
          currentUsername={identity.username}
          activeContact={activeContact}
          conversations={conversationList}
          onSelectContact={handleSelectContact}
          onNukeVault={handleNukeVault}
        />

        {/* Right Main Chat Panel */}
        {activeContact ? (
          <ChatWindow
            currentUsername={identity.username}
            currentDhKey={identity.dhPublicKey}
            contactHandle={activeContact}
            contactDhKey={activeDhKey}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onBurnMessage={handleBurnMessage}
            onClearThread={handleClearThread}
            onBackToContacts={() => setActiveContact(null)}
          />
        ) : (
          <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-black">
            <div className="w-20 h-20 rounded-full bg-[#121212] border border-[#262626] flex items-center justify-center text-zinc-600 mb-4 shadow-xl">
              <MessageSquare className="w-9 h-9" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-1">Your Direct Messages</h2>
            <p className="text-xs text-zinc-500 font-mono max-w-sm leading-relaxed mb-4">
              Send private, zero-knowledge end-to-end encrypted messages to any registered handle.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-900/50 text-[11px] font-mono text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero Server Retention &bull; RAM Only</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SifrlyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs">
          Loading Sifrly Secure Messenger...
        </div>
      }
    >
      <SifrlyChatMessenger />
    </Suspense>
  );
}
