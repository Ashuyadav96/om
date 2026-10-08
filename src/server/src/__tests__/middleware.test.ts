import { clerkAuth, attachUser, checkSessionAccess, checkApiKeyAccess } from '../middleware/authMiddleware';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('attachUser', () => {
    it('should attach user to request if authenticated', async () => {
      // Mock Clerk auth
      mockReq.auth = { userId: 'user-123' };

      // Mock database user
      const mockUser = {
        id: 'user-123',
        clerkId: 'clerk-123',
        email: 'test@example.com',
        username: 'testuser',
        fullName: 'Test User',
      };

      // Mock prisma.user.findUnique
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await attachUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).dbUser).toEqual(mockUser);
    });

    it('should create user if not exists', async () => {
      mockReq.auth = { userId: 'new-user' };

      // Mock prisma.user.findUnique to return null
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      
      // Mock prisma.user.create
      const newUser = {
        id: 'new-user-id',
        clerkId: 'new-user',
        email: 'new@example.com',
      };
      jest.spyOn(prisma.user, 'create').mockResolvedValue(newUser as any);

      await attachUser(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.user.create).toHaveBeenCalled();
      expect((mockReq as any).dbUser).toEqual(newUser);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.auth = undefined;

      await attachUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkSessionAccess', () => {
    it('should allow access if user is in session', async () => {
      mockReq.auth = { userId: 'user-123' };
      mockReq.params = { sessionId: 'session-123' };
      mockReq.dbUser = { id: 'user-123' };

      // Mock user session
      const mockUserSession = {
        id: 'user-session-123',
        userId: 'user-123',
        sessionId: 'session-123',
        isActive: true,
      };

      jest.spyOn(prisma.userSession, 'findFirst').mockResolvedValue(mockUserSession as any);

      await checkSessionAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).userSession).toEqual(mockUserSession);
    });

    it('should deny access if user not in session', async () => {
      mockReq.auth = { userId: 'user-123' };
      mockReq.params = { sessionId: 'session-123' };
      mockReq.dbUser = { id: 'user-123' };

      jest.spyOn(prisma.userSession, 'findFirst').mockResolvedValue(null);

      await checkSessionAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.auth = undefined;
      mockReq.params = { sessionId: 'session-123' };

      await checkSessionAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkApiKeyAccess', () => {
    it('should allow access if user has API key', async () => {
      mockReq.auth = { userId: 'user-123' };
      mockReq.params = { provider: 'anthropic' };
      mockReq.dbUser = { id: 'user-123' };

      // Mock API key
      const mockApiKey = {
        id: 'api-key-123',
        userId: 'user-123',
        provider: 'anthropic',
        keyName: 'My Claude Key',
        isActive: true,
      };

      jest.spyOn(prisma.apiKey, 'findFirst').mockResolvedValue(mockApiKey as any);

      await checkApiKeyAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).apiKey).toBeDefined();
    });

    it('should deny access if user has no API key', async () => {
      mockReq.auth = { userId: 'user-123' };
      mockReq.params = { provider: 'anthropic' };
      mockReq.dbUser = { id: 'user-123' };

      jest.spyOn(prisma.apiKey, 'findFirst').mockResolvedValue(null);

      await checkApiKeyAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.auth = undefined;
      mockReq.params = { provider: 'anthropic' };

      await checkApiKeyAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('Error Handling Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle AppError', () => {
      const { AppError } = require('../middleware/errorHandler');
      const error = new AppError(404, 'Not found', true, 'NOT_FOUND');

      const errorHandler = require('../middleware/errorHandler').errorHandler;
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Not found',
        },
      });
    });

    it('should handle ZodError', () => {
      const { ZodError } = require('zod');
      const error = new ZodError([
        { path: ['name'], message: 'Name is required', code: 'invalid_type' },
      ]);

      const errorHandler = require('../middleware/errorHandler').errorHandler;
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [{ path: 'name', message: 'Name is required' }],
        },
      });
    });

    it('should handle JWT errors', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      const errorHandler = require('../middleware/errorHandler').errorHandler;
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authentication token',
        },
      });
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      const errorHandler = require('../middleware/errorHandler').errorHandler;
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404', () => {
      mockReq = { method: 'GET', path: '/unknown' };

      const notFoundHandler = require('../middleware/errorHandler').notFoundHandler;
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found: GET /unknown',
        },
      });
    });
  });

  describe('asyncHandler', () => {
    it('should handle async errors', async () => {
      const asyncHandler = require('../middleware/errorHandler').asyncHandler;
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));

      const wrapped = asyncHandler(asyncFn);
      await wrapped(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call next on success', async () => {
      const asyncHandler = require('../middleware/errorHandler').asyncHandler;
      const asyncFn = jest.fn().mockResolvedValue(undefined);

      const wrapped = asyncHandler(asyncFn);
      await wrapped(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(asyncFn).toHaveBeenCalled();
    });
  });
});
