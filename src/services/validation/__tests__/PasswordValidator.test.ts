import { describe, it, expect } from 'vitest';
import { PasswordValidator } from '../PasswordValidator';

describe('PasswordValidator', () => {
  describe('validate', () => {
    it('should accept a strong password', () => {
      const result = PasswordValidator.validate('MyStr0ng!P@ssw0rd123');
      
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
      expect(result.entropy).toBeGreaterThan(60);
    });

    it('should reject short passwords', () => {
      const result = PasswordValidator.validate('Short1!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should require uppercase letters', () => {
      const result = PasswordValidator.validate('mypassword123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letters', () => {
      const result = PasswordValidator.validate('MYPASSWORD123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require numbers', () => {
      const result = PasswordValidator.validate('MyPassword!@#');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special characters', () => {
      const result = PasswordValidator.validate('MyPassword123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const result = PasswordValidator.validate('Password123!A');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common or contains common patterns');
    });

    it('should detect sequential characters', () => {
      const result = PasswordValidator.validate('Abcd1234!@#$');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains sequential characters (e.g., abc, 123)');
    });

    it('should detect repeated characters', () => {
      const result = PasswordValidator.validate('Passsword123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains too many repeated characters');
    });

    it('should calculate entropy correctly', () => {
      const result = PasswordValidator.validate('aB1!');
      
      // 4 characters with full charset (26+26+10+32 = 94)
      // entropy = 4 * log2(94) ≈ 26.2 bits
      expect(result.entropy).toBeGreaterThan(25);
      expect(result.entropy).toBeLessThan(30);
    });

    it('should determine password strength based on entropy', () => {
      // Weak password (short, low entropy)
      let result = PasswordValidator.validate('Pass1!Ab');
      if (!result.isValid) {
        // If invalid due to length, it's weak
        expect(result.strength).toBe('weak');
      }
      
      // Medium password
      result = PasswordValidator.validate('MediumPass123!@#');
      if (result.isValid) {
        expect(['medium', 'strong']).toContain(result.strength);
      }
      
      // Strong password
      result = PasswordValidator.validate('VeryStr0ng!P@ssw0rd#2023$Complex');
      expect(result.strength).toBe('strong');
    });
  });

  describe('generateStrongPassword', () => {
    it('should generate a password of specified length', () => {
      const password = PasswordValidator.generateStrongPassword(20);
      expect(password).toHaveLength(20);
    });

    it('should generate a password that passes validation', () => {
      const password = PasswordValidator.generateStrongPassword();
      const result = PasswordValidator.validate(password);
      
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('should generate different passwords each time', () => {
      const passwords = new Set();
      for (let i = 0; i < 10; i++) {
        passwords.add(PasswordValidator.generateStrongPassword());
      }
      
      // All passwords should be unique
      expect(passwords.size).toBe(10);
    });

    it('should include all required character types', () => {
      const password = PasswordValidator.generateStrongPassword();
      
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true);
    });
  });
});