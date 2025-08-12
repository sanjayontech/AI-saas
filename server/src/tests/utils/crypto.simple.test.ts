import { CryptoUtils } from '../../utils/crypto';

describe('Crypto Utils - Unit Tests', () => {
  describe('Secure Token Generation', () => {
    it('should generate secure token of default length', () => {
      const token = CryptoUtils.generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // Default length is 32 bytes = 64 hex chars
    });

    it('should generate secure token of specified length', () => {
      const token = CryptoUtils.generateSecureToken(16);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate different tokens each time', () => {
      const token1 = CryptoUtils.generateSecureToken();
      const token2 = CryptoUtils.generateSecureToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate tokens with only hex characters', () => {
      const token = CryptoUtils.generateSecureToken();
      const hexRegex = /^[0-9a-f]+$/;

      expect(hexRegex.test(token)).toBe(true);
    });
  });

  describe('Random String Generation', () => {
    it('should generate random string of default length', () => {
      const str = CryptoUtils.generateRandomString();

      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
      expect(str.length).toBe(16); // Default length
    });

    it('should generate random string of specified length', () => {
      const str = CryptoUtils.generateRandomString(10);

      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
      expect(str.length).toBe(10);
    });

    it('should generate different strings each time', () => {
      const str1 = CryptoUtils.generateRandomString();
      const str2 = CryptoUtils.generateRandomString();

      expect(str1).not.toBe(str2);
    });

    it('should generate strings with only alphanumeric characters', () => {
      const str = CryptoUtils.generateRandomString();
      const alphanumericRegex = /^[A-Za-z0-9]+$/;

      expect(alphanumericRegex.test(str)).toBe(true);
    });
  });

  describe('UUID Generation', () => {
    it('should generate valid UUID v4', () => {
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

    it('should generate UUIDs with correct length', () => {
      const uuid = CryptoUtils.generateUUID();
      expect(uuid.length).toBe(36); // Standard UUID length with hyphens
    });
  });

  describe('Hash Generation', () => {
    it('should generate SHA-256 hash', () => {
      const input = 'test-string';
      const hash = CryptoUtils.createHash(input);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 32 bytes = 64 hex chars
    });

    it('should generate same hash for same input', () => {
      const input = 'consistent-input';
      const hash1 = CryptoUtils.createHash(input);
      const hash2 = CryptoUtils.createHash(input);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = CryptoUtils.createHash('input1');
      const hash2 = CryptoUtils.createHash('input2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate hash with only hex characters', () => {
      const hash = CryptoUtils.createHash('test');
      const hexRegex = /^[0-9a-f]+$/;

      expect(hexRegex.test(hash)).toBe(true);
    });
  });

  describe('Constant Time Comparison', () => {
    it('should return true for identical strings', () => {
      const str1 = 'identical-string';
      const str2 = 'identical-string';
      const result = CryptoUtils.constantTimeCompare(str1, str2);

      expect(result).toBe(true);
    });

    it('should return false for different strings', () => {
      const str1 = 'string-one';
      const str2 = 'string-two';
      const result = CryptoUtils.constantTimeCompare(str1, str2);

      expect(result).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      const str1 = 'short';
      const str2 = 'much-longer-string';
      const result = CryptoUtils.constantTimeCompare(str1, str2);

      expect(result).toBe(false);
    });

    it('should handle empty strings', () => {
      const result1 = CryptoUtils.constantTimeCompare('', '');
      const result2 = CryptoUtils.constantTimeCompare('', 'not-empty');
      const result3 = CryptoUtils.constantTimeCompare('not-empty', '');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });
});