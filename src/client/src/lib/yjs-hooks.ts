import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface YjsDocContext {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  error: Error | null;
}

export interface UseYjsDocOptions {
  roomName: string;
  serverUrl?: string;
  onSynced?: () => void;
}

export function useYjsDoc(options: UseYjsDocOptions): YjsDocContext {
  const { roomName, serverUrl = '', onSynced } = options;
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    if (!roomName) return;

    try {
      // Create new Y.Doc
      const newDoc = new Y.Doc();
      const newProvider = new WebsocketProvider(
        serverUrl || window.location.origin,
        roomName,
        newDoc
      );

      // Update refs and state
      docRef.current = newDoc;
      providerRef.current = newProvider;
      setDoc(newDoc);
      setProvider(newProvider);
      setError(null);

      // Handle connection status
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

      // Cleanup
      return () => {
        if (newProvider) {
          newProvider.destroy();
        }
        if (newDoc) {
          newDoc.destroy();
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize Yjs'));
      setIsConnected(false);
      return () => {};
    }
  }, [roomName, serverUrl, onSynced]);

  // Handle window unload
  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (docRef.current) {
        docRef.current.destroy();
      }
    };
  }, []);

  return {
    doc,
    provider,
    isConnected,
    error,
  };
}

// Hook for managing shared text
interface UseYjsTextOptions {
  doc: Y.Doc | null;
  fieldName: string;
}

export function useYjsText(options: UseYjsTextOptions): {
  text: string;
  setText: (value: string) => void;
  onChange: (callback: (text: string) => void) => void;
} {
  const { doc, fieldName } = options;
  const [localText, setLocalText] = useState('');
  const yTextRef = useRef<Y.Text | null>(null);

  useEffect(() => {
    if (!doc) return;

    const yText = doc.getText(fieldName);
    yTextRef.current = yText;

    // Initialize with current value
    setLocalText(yText.toString());

    // Listen for changes
    const handleChange = () => {
      setLocalText(yText.toString());
    };

    yText.observe(handleChange);

    return () => {
      yText.unobserve(handleChange);
    };
  }, [doc, fieldName]);

  const setText = (value: string) => {
    if (yTextRef.current) {
      const yText = yTextRef.current;
      // Batch changes to avoid triggering observers multiple times
      yText.doc?.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, value);
      });
    }
  };

  const onChange = (callback: (text: string) => void) => {
    // This is handled by the internal observer
    // The callback will be called whenever the text changes
    // For external use, we can add an effect
    useEffect(() => {
      callback(localText);
    }, [localText, callback]);
  };

  return {
    text: localText,
    setText,
    onChange,
  };
}

// Hook for managing shared array (e.g., messages)
interface UseYjsArrayOptions<T> {
  doc: Y.Doc | null;
  fieldName: string;
  initialValue?: T[];
}

export function useYjsArray<T>(options: UseYjsArrayOptions<T>): {
  array: T[];
  push: (item: T) => void;
  update: (index: number, item: T) => void;
  remove: (index: number) => void;
} {
  const { doc, fieldName, initialValue = [] } = options;
  const [localArray, setLocalArray] = useState<T[]>(initialValue);
  const yArrayRef = useRef<Y.Array<T> | null>(null);

  useEffect(() => {
    if (!doc) return;

    const yArray = doc.getArray<T>(fieldName);
    yArrayRef.current = yArray;

    // Initialize with current value
    setLocalArray(yArray.toArray());

    // Listen for changes
    const handleChange = () => {
      setLocalArray(yArray.toArray());
    };

    yArray.observe(handleChange);

    return () => {
      yArray.unobserve(handleChange);
    };
  }, [doc, fieldName, initialValue]);

  const push = (item: T) => {
    if (yArrayRef.current) {
      yArrayRef.current.push([item]);
    }
  };

  const update = (index: number, item: T) => {
    if (yArrayRef.current) {
      yArrayRef.current.delete(index, 1);
      yArrayRef.current.insert(index, [item]);
    }
  };

  const remove = (index: number) => {
    if (yArrayRef.current) {
      yArrayRef.current.delete(index, 1);
    }
  };

  return {
    array: localArray,
    push,
    update,
    remove,
  };
}

// Hook for managing shared map (e.g., user cursors)
interface UseYjsMapOptions<T> {
  doc: Y.Doc | null;
  fieldName: string;
  initialValue?: Record<string, T>;
}

export function useYjsMap<T>(options: UseYjsMapOptions<T>): {
  map: Record<string, T>;
  set: (key: string, value: T) => void;
  delete: (key: string) => void;
  clear: () => void;
} {
  const { doc, fieldName, initialValue = {} } = options;
  const [localMap, setLocalMap] = useState<Record<string, T>>(initialValue);
  const yMapRef = useRef<Y.Map<T> | null>(null);

  useEffect(() => {
    if (!doc) return;

    const yMap = doc.getMap<T>(fieldName);
    yMapRef.current = yMap;

    // Initialize with current value
    const mapObj: Record<string, T> = {};
    yMap.forEach((value, key) => {
      mapObj[key] = value;
    });
    setLocalMap(mapObj);

    // Listen for changes
    const handleChange = () => {
      const newMapObj: Record<string, T> = {};
      yMap.forEach((value, key) => {
        newMapObj[key] = value;
      });
      setLocalMap(newMapObj);
    };

    yMap.observe(handleChange);

    return () => {
      yMap.unobserve(handleChange);
    };
  }, [doc, fieldName, initialValue]);

  const set = (key: string, value: T) => {
    if (yMapRef.current) {
      yMapRef.current.set(key, value);
    }
  };

  const deleteKey = (key: string) => {
    if (yMapRef.current) {
      yMapRef.current.delete(key);
    }
  };

  const clear = () => {
    if (yMapRef.current) {
      yMapRef.current.clear();
    }
  };

  return {
    map: localMap,
    set,
    delete: deleteKey,
    clear,
  };
}
