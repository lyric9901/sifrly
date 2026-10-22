export interface ChatMessage {
  id: string;
  sender: string;
  recipient: string;
  text: string;
  timestamp: string;
  isOutgoing: boolean;
  ttlSeconds?: number;
}

export interface Conversation {
  contactHandle: string;
  contactDhKey: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
}

export interface EncryptedMessagePacket {
  sender: string;
  text: string;
  timestamp: string;
  ttlSeconds?: number;
}
