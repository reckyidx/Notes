const signupService = require('../src/services/SignupService');
const userRepository = require('../src/repositories/UserRepository');
const lockService = require('../src/services/DistributedLockService');

// Mock Redis for testing (since we may not have Redis running)
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
  createRedisConnection: jest.fn(() => ({
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
  })),
  closeRedisConnections: jest.fn().mockResolvedValue(undefined),
}));

// Mock Redlock
jest.mock('redlock', () => {
  const locks = new Map();
  
  return jest.fn().mockImplementation(() => ({
    acquire: jest.fn(async (keys, ttl) => {
      const key = keys[0];
      if (locks.has(key)) {
        const error = new Error('Lock already held');
        throw error;
      }
      const lock = { resource: key, value: Date.now().toString() };
      locks.set(key, lock);
      return lock;
    }),
    release: jest.fn(async (lock) => {
      locks.delete(lock.resource);
    }),
    extend: jest.fn(async (lock, ttl) => lock),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  }));
});

describe('Signup Service', () => {
  beforeEach(async () => {
    // Clear database before each test
    await userRepository.clearAll();
  });

  describe('signup', () => {
    it('should create a new user with valid phone number', async () => {
      const userData = {
        phoneNumber: '+919876543210',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await signupService.signup(userData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.phoneNumber).toBe('+919876543210');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('should throw error when phone number is missing', async () => {
      const userData = {
        name: 'John Doe',
      };

      await expect(signupService.signup(userData)).rejects.toThrow('Phone number is required');
    });

    it('should throw error for invalid phone number format', async () => {
      const userData = {
        phoneNumber: '123', // Invalid format
      };

      await expect(signupService.signup(userData)).rejects.toThrow('Invalid phone number format');
    });

    it('should throw error when phone number already exists', async () => {
      const userData = {
        phoneNumber: '+919876543210',
        name: 'John Doe',
      };

      // Create first user
      await signupService.signup(userData);

      // Try to create second user with same phone
      await expect(signupService.signup({
        phoneNumber: '+919876543210',
        name: 'Jane Doe',
      })).rejects.toThrow('Phone number already registered');
    });

    it('should normalize phone number before saving', async () => {
      const userData = {
        phoneNumber: ' +91 98765-43210 ', // With spaces and dashes
        name: 'John Doe',
      };

      const result = await signupService.signup(userData);

      expect(result.phoneNumber).toBe('+919876543210');
    });

    it('should create user with minimal data (only phone number)', async () => {
      const userData = {
        phoneNumber: '+919876543211',
      };

      const result = await signupService.signup(userData);

      expect(result).toBeDefined();
      expect(result.phoneNumber).toBe('+919876543211');
      expect(result.name).toBeNull();
      expect(result.email).toBeNull();
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate phone number with country code', () => {
      expect(signupService.validatePhoneNumber('+919876543210')).toBe(true);
      expect(signupService.validatePhoneNumber('+1234567890123')).toBe(true);
    });

    it('should validate phone number without country code', () => {
      expect(signupService.validatePhoneNumber('9876543210')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(signupService.validatePhoneNumber('123')).toBe(false);
      expect(signupService.validatePhoneNumber('abc')).toBe(false);
      expect(signupService.validatePhoneNumber('')).toBe(false);
    });

    it('should accept phone numbers with spaces and dashes', () => {
      expect(signupService.validatePhoneNumber(' +91 98765-43210 ')).toBe(true);
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should remove spaces and dashes', () => {
      expect(signupService.normalizePhoneNumber(' +91 98765-43210 ')).toBe('+919876543210');
    });

    it('should remove parentheses', () => {
      expect(signupService.normalizePhoneNumber('(987) 654-3210')).toBe('9876543210');
    });
  });

  describe('checkPhoneExists', () => {
    it('should return false for non-existent phone number', async () => {
      const exists = await signupService.checkPhoneExists('+919999999999');
      expect(exists).toBe(false);
    });

    it('should return true for existing phone number', async () => {
      await signupService.signup({
        phoneNumber: '+919876543210',
        name: 'Test User',
      });

      const exists = await signupService.checkPhoneExists('+919876543210');
      expect(exists).toBe(true);
    });
  });

  describe('getUserByPhone', () => {
    it('should return user for existing phone number', async () => {
      await signupService.signup({
        phoneNumber: '+919876543210',
        name: 'Test User',
      });

      const user = await signupService.getUserByPhone('+919876543210');
      expect(user).toBeDefined();
      expect(user.name).toBe('Test User');
    });

    it('should return null for non-existent phone number', async () => {
      const user = await signupService.getUserByPhone('+919999999999');
      expect(user).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user for valid ID', async () => {
      const created = await signupService.signup({
        phoneNumber: '+919876543210',
        name: 'Test User',
      });

      const user = await signupService.getUserById(created.id);
      expect(user).toBeDefined();
      expect(user.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const user = await signupService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });
  });
});

describe('User Repository', () => {
  beforeEach(async () => {
    await userRepository.clearAll();
  });

  describe('create', () => {
    it('should create user with all fields', async () => {
      const userData = {
        id: 'test-id-1',
        phoneNumber: '+919876543210',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await userRepository.create(userData);
      expect(result.phoneNumber).toBe('+919876543210');
    });

    it('should throw error for duplicate phone number', async () => {
      const userData = {
        id: 'test-id-2',
        phoneNumber: '+919876543210',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRepository.create(userData);

      await expect(userRepository.create({
        id: 'test-id-3',
        phoneNumber: '+919876543210',
        name: 'Another User',
        createdAt: new Date(),
        updatedAt: new Date(),
      })).rejects.toThrow('Phone number already registered');
    });
  });

  describe('findByPhoneNumber', () => {
    it('should find user by phone number', async () => {
      await userRepository.create({
        id: 'test-id-4',
        phoneNumber: '+919876543210',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await userRepository.findByPhoneNumber('+919876543210');
      expect(user).toBeDefined();
      expect(user.name).toBe('Test User');
    });

    it('should return null for non-existent phone number', async () => {
      const user = await userRepository.findByPhoneNumber('+919999999999');
      expect(user).toBeNull();
    });
  });

  describe('phoneExists', () => {
    it('should return true for existing phone', async () => {
      await userRepository.create({
        id: 'test-id-5',
        phoneNumber: '+919876543210',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const exists = await userRepository.phoneExists('+919876543210');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent phone', async () => {
      const exists = await userRepository.phoneExists('+919999999999');
      expect(exists).toBe(false);
    });
  });
});

describe('Race Condition Simulation', () => {
  beforeEach(async () => {
    await userRepository.clearAll();
  });

  it('should handle concurrent signup attempts for same phone number', async () => {
    const phoneNumber = '+919876543210';
    const userData = {
      phoneNumber,
      name: 'Test User',
    };

    // Simulate concurrent requests
    const promises = [
      signupService.signup(userData),
      signupService.signup(userData),
      signupService.signup(userData),
    ];

    const results = await Promise.allSettled(promises);

    // Count successful and failed attempts
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    // At least one should succeed
    expect(successful.length).toBeGreaterThanOrEqual(1);
    
    // At least some should fail (due to duplicate or lock)
    expect(failed.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow concurrent signups for different phone numbers', async () => {
    const promises = [
      signupService.signup({ phoneNumber: '+919876543210', name: 'User 1' }),
      signupService.signup({ phoneNumber: '+919876543211', name: 'User 2' }),
      signupService.signup({ phoneNumber: '+919876543212', name: 'User 3' }),
    ];

    const results = await Promise.allSettled(promises);

    // All should succeed
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBe(3);
  });
});