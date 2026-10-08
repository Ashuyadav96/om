// Jest setup for client tests
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    id: 'mock-socket-id',
    handshake: {
      auth: {},
    },
  };

  return {
    io: jest.fn(() => mockSocket),
    Socket: jest.fn(),
  };
});

// Mock yjs and y-websocket
jest.mock('yjs', () => {
  const mockDoc = {
    getArray: jest.fn(() => ({
      observe: jest.fn(),
      forEach: jest.fn(),
      push: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
      get: jest.fn(),
      toArray: jest.fn(() => []),
      length: 0,
    })),
    getText: jest.fn(),
    getMap: jest.fn(),
    transact: jest.fn((fn) => fn()),
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
    version: 0,
  };

  const mockProvider = {
    awareness: {
      on: jest.fn(),
      off: jest.fn(),
      setLocalState: jest.fn(),
      getStates: jest.fn(() => new Map()),
      clientID: 1,
    },
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  };

  return {
    Doc: jest.fn(() => mockDoc),
    WebsocketProvider: jest.fn(() => mockProvider),
    applyUpdate: jest.fn(),
    encodeStateAsUpdate: jest.fn(),
  };
});

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'user-123',
      fullName: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
    },
  }),
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RedirectToSignIn: () => null,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';

// Global test timeout
jest.setTimeout(10000);
