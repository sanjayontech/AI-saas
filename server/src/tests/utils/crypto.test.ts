import { CryptoUtils } from '../../utils/crypto';

describe('CryptoUtils', () => {
  describe('generateSecureToken', () => {
    it('should generate a secure token of default length', () => {
      const token = CryptoUtils.generateSecureToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate a secure token of specified length', () => {
      const token = CryptoUtils.generateSecureToken(16);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });

    it('should generate different tokens each time', () => {
      const token1 = CryptoUtils.generateSecureToken();
      const token2 = CryptoUtils.generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRandomString', () => {
    it('should generate a random string of default length', () => {
      const str = CryptoUtils.generateRandomString();
      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
      expect(str.length).toBe(16);
    });

    it('should generate a random string of specified length', () => {
      const str = CryptoUtils.generateRandomString(10);
      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
      expect(str.length).toBe(10);
    });

    it('should only contain valid characters', () => {
      const str = CryptoUtils.generateRandomString(100);
      const validChars = /^[A-Za-z0-9]+$/;
      expect(validChars.test(str)).toBe(true);
    });
  });

  describe('generateUUID', () => {
    it('should generate a valid UUID', () => {
      const uuid = CryptoUtils.generateUUID();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(uuid)).toBe(true);
    });

    it('should generate different UUIDs each time', () => {
      const uuid1 = CryptoUtils.generateUUID();
      const uuid2 = CryptoUtils.generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('createHash', () => {
    it('should create a SHA-256 hash', () => {
      const data = 'test data';
      const hash = CryptoUtils.createHash(data);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should produce consistent hashes for same input', () => {
      const data = 'test data';
      const hash1 = CryptoUtils.createHash(data);
      const hash2 = CryptoUtils.createHash(data);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = CryptoUtils.createHash('data1');
      const hash2 = CryptoUtils.createHash('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('constantTimeCompare', () => {
    it('should return true for identical strings', () => {
      const str = 'test string';
      const result = CryptoUtils.constantTimeCompare(str, str);
      expect(result).toBe(true);
    });

    it('should return false for different strings', () => {
      const result = CryptoUtils.constantTimeCompare('string1', 'string2');
      expect(result).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      const result = CryptoUtils.constantTimeCompare('short', 'much longer string');
      expect(result).toBe(false);
    });

    it('should return true for identical empty strings', () => {
      const result = CryptoUtils.constantTimeCompare('', '');
      expect(result).toBe(true);
    });
  });
});