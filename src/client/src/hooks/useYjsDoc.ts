import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Message, YjsSessionState } from '../types';

interface UseYjsDocOptions {
  roomName: string;
  serverUrl?: string;
  onSynced?: () => void;
  onUpdate?: (state: YjsSessionState) => void;
}

interface UseYjsDocReturn {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  isSyncing: boolean;
  error: Error | null;
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (index: number, message: Message) => void;
  removeMessage: (index: number) => void;
  getMessage: (index: number) => Message | undefined;
  getMessages: () => Message[];
}

export function useYjsDoc(options: UseYjsDocOptions): UseYjsDocReturn {
  const { roomName, serverUrl, onSynced, onUpdate } = options;
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const messagesRef = useRef<Y.Array<Message>>();
  const isInitialLoad = useRef(true);

  // Initialize Yjs document
  useEffect(() => {
    if (!roomName) return;

    try {
      // Clean up previous instances
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }

      // Create new document
      const newDoc = new Y.Doc();
      const wsUrl = serverUrl || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
      const newProvider = new WebsocketProvider(wsUrl, roomName, newDoc);

      docRef.current = newDoc;
      providerRef.current = newProvider;
      setDoc(newDoc);
      setProvider(newProvider);
      setError(null);

      // Get messages array
      const yMessages = newDoc.getArray<Message>('messages');
      messagesRef.current = yMessages;

      // Load existing messages
      const existingMessages: Message[] = [];
      yMessages.forEach((msg: any) => {
        existingMessages.push({
          ...msg,
          timestamp: new Date(msg.timestamp),
        });
      });

      setMessages(existingMessages);
      isInitialLoad.current = false;

      // Observe changes
      const handleUpdate = () => {
        const newMessages: Message[] = [];
        yMessages.forEach((msg: any) => {
          newMessages.push({
            ...msg,
            timestamp: new Date(msg.timestamp),
          });
        });
        setMessages(newMessages);
        
        if (onUpdate) {
          onUpdate({
            messages: newMessages,
            version: newDoc.version,
            lastUpdated: new Date(),
          });
        }
      };

      yMessages.observe(handleUpdate);

      // Handle sync status
      newProvider.on('synced', (synced: boolean) => {
        setIsConnected(synced);
        if (synced && onSynced) {
          onSynced();
        }
      });

      newProvider.on('connection-close', () => {
        setIsConnected(false);
      });

      newProvider.on('error', (err: Error) => {
        setError(err);
        setIsConnected(false);
      });

      // Handle awareness changes
      newProvider.awareness.on('change', () => {
        // Could trigger re-render if needed
      });

      // Cleanup
      return () => {
        yMessages.unobserve(handleUpdate);
        newProvider.destroy();
        newDoc.destroy();
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize Yjs'));
      setIsConnected(false);
      return () => {};
    }
  }, [roomName, serverUrl, onSynced, onUpdate]);

  // Add a message
  const addMessage = useCallback((message: Message) => {
    if (!messagesRef.current || !docRef.current) return;

    docRef.current.transact(() => {
      messagesRef.current?.push([{
        ...message,
        timestamp: message.timestamp.toISOString(),
      }]);
    });
  }, []);

  // Update a message
  const updateMessage = useCallback((index: number, message: Message) => {
    if (!messagesRef.current || !docRef.current) return;

    docRef.current.transact(() => {
      messagesRef.current?.delete(index, 1);
      messagesRef.current?.insert(index, [{
        ...message,
        timestamp: message.timestamp.toISOString(),
      }]);
    });
  }, []);

  // Remove a message
  const removeMessage = useCallback((index: number) => {
    if (!messagesRef.current || !docRef.current) return;

    docRef.current.transact(() => {
      messagesRef.current?.delete(index, 1);
    });
  }, []);

  // Get a message by index
  const getMessage = useCallback((index: number): Message | undefined => {
    if (!messagesRef.current) return undefined;
    const msg = messagesRef.current.get(index) as any;
    return msg ? { ...msg, timestamp: new Date(msg.timestamp) } : undefined;
  }, []);

  // Get all messages
  const getMessages = useCallback((): Message[] => {
    if (!messagesRef.current) return [];
    const msgs: Message[] = [];
    messagesRef.current.forEach((msg: any) => {
      msgs.push({ ...msg, timestamp: new Date(msg.timestamp) });
    });
    return msgs;
  }, []);

  return {
    doc,
    provider,
    isConnected,
    isSyncing,
    error,
    messages,
    addMessage,
    updateMessage,
    removeMessage,
    getMessage,
    getMessages,
  };
}

export default useYjsDoc;
