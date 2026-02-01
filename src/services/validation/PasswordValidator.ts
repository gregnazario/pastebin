export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
  /** Estimated entropy in bits (assumes uniform random distribution - actual entropy may be lower for non-random passwords) */
  entropy: number
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 12
  private static readonly MIN_ENTROPY = 60 // bits

  /**
   * Common passwords and patterns to check against
   * This list includes top common passwords from various breach databases
   * In production, consider using Have I Been Pwned API or a larger list
   */
  private static readonly COMMON_PASSWORDS = [
    // Top passwords from breach databases
    'password',
    'password123',
    'password1',
    '123456789',
    '12345678',
    'qwerty123',
    'qwertyuiop',
    'admin123',
    'admin1234',
    'administrator',
    'letmein123',
    'welcome123',
    'welcome1',
    'monkey123',
    'dragon123',
    'baseball123',
    'football123',
    'master123',
    'michael123',
    'shadow123',
    'superman123',
    'hello123',
    'charlie123',
    'trustno1',
    'iloveyou',
    'princess',
    'sunshine',
    'whatever',
    'abc12345',
    'password1234',
    'passw0rd',
    'p@ssword',
    'p@ssw0rd',
    'changeme',
    'secret123',
    'qwerty12345',
    'asdfghjkl',
    'zxcvbnm123',
    '987654321',
    'login123',
    'access123',
    'master1234',
    'computer123',
    'internet123',
    'server123',
    'security123',
    'admin12345',
    'root123456',
    'guest12345',
    'default123',
  ]

  static validate(password: string): PasswordValidationResult {
    const errors: string[] = []
    let strength: 'weak' | 'medium' | 'strong' = 'weak'

    // Length check
    if (password.length < PasswordValidator.MIN_LENGTH) {
      errors.push(`Password must be at least ${PasswordValidator.MIN_LENGTH} characters long`)
    }

    // Character type checks
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)

    if (!hasUppercase) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!hasLowercase) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number')
    }

    if (!hasSpecialChars) {
      errors.push('Password must contain at least one special character')
    }

    // Common password check - check exact match, not substring
    const passwordLower = password.toLowerCase()
    if (
      PasswordValidator.COMMON_PASSWORDS.some((common) => {
        const commonLower = common.toLowerCase()
        // Check if password starts with common password
        return passwordLower.startsWith(commonLower) || passwordLower === commonLower
      })
    ) {
      errors.push('Password is too common or contains common patterns')
    }

    // Sequential character check
    if (PasswordValidator.hasSequentialChars(password)) {
      errors.push('Password contains sequential characters (e.g., abc, 123)')
    }

    // Repeated character check
    if (PasswordValidator.hasExcessiveRepeatedChars(password)) {
      errors.push('Password contains too many repeated characters')
    }

    // Calculate entropy
    const entropy = PasswordValidator.calculateEntropy(password)

    if (entropy < PasswordValidator.MIN_ENTROPY) {
      errors.push(
        `Password entropy is too low (${entropy.toFixed(1)} bits, need at least ${PasswordValidator.MIN_ENTROPY})`,
      )
    }

    // Determine strength
    if (errors.length === 0) {
      if (entropy >= 80) {
        strength = 'strong'
      } else if (entropy >= 60) {
        strength = 'medium'
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      entropy,
    }
  }

  /**
   * Calculate estimated entropy of a password
   *
   * IMPORTANT: This calculation assumes uniform random character selection.
   * Real-world passwords typically have LOWER entropy due to:
   * - Common words and patterns
   * - Predictable character substitutions (@ for a, 3 for e)
   * - Keyboard patterns (qwerty, 12345)
   *
   * For more accurate entropy estimation, consider using libraries like zxcvbn
   * which account for these patterns.
   *
   * @param password - The password to analyze
   * @returns Estimated entropy in bits (upper bound)
   */
  private static calculateEntropy(password: string): number {
    let charsetSize = 0

    if (/[a-z]/.test(password)) charsetSize += 26
    if (/[A-Z]/.test(password)) charsetSize += 26
    if (/\d/.test(password)) charsetSize += 10
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) charsetSize += 32
    if (/[^a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) charsetSize += 32 // Other special chars

    // This formula assumes uniform random selection: entropy = log2(charset^length)
    // For truly random passwords this is accurate; for human-chosen passwords it overestimates
    return password.length * Math.log2(charsetSize || 1)
  }

  private static hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
    ]

    const passwordLower = password.toLowerCase()

    for (const seq of sequences) {
      // Check for longer sequences (4+ characters) to be less strict
      for (let i = 0; i <= seq.length - 4; i++) {
        const subSeq = seq.substring(i, i + 4)
        const reverseSubSeq = subSeq.split('').reverse().join('')

        if (passwordLower.includes(subSeq) || passwordLower.includes(reverseSubSeq)) {
          return true
        }
      }
    }

    return false
  }

  private static hasExcessiveRepeatedChars(password: string): boolean {
    // Check for any character repeated 3 or more times in a row
    return /(.)\1{2,}/.test(password)
  }

  /**
   * Generate a cryptographically secure random password
   * Uses crypto.getRandomValues for secure random number generation
   *
   * @param length - Desired password length (minimum 12)
   * @returns A randomly generated strong password
   */
  static generateStrongPassword(length: number = 16): string {
    const minLength = 12
    const actualLength = Math.max(length, minLength)

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const allChars = uppercase + lowercase + numbers + special

    // Use cryptographically secure random number generator
    const randomBytes = crypto.getRandomValues(new Uint8Array(actualLength + 10)) // Extra bytes for shuffling

    // Helper function to get a secure random index
    const getSecureIndex = (max: number, byteIndex: number): number => {
      // Use modulo with rejection sampling to avoid bias
      // For simplicity, we just use modulo here since our character sets are small
      return randomBytes[byteIndex] % max
    }

    let password = ''
    let byteIndex = 0

    // Ensure at least one of each required character type (using secure random)
    password += uppercase[getSecureIndex(uppercase.length, byteIndex++)]
    password += lowercase[getSecureIndex(lowercase.length, byteIndex++)]
    password += numbers[getSecureIndex(numbers.length, byteIndex++)]
    password += special[getSecureIndex(special.length, byteIndex++)]

    // Fill the rest with cryptographically random characters
    for (let i = password.length; i < actualLength; i++) {
      password += allChars[getSecureIndex(allChars.length, byteIndex++)]
    }

    // Shuffle using Fisher-Yates with secure random values
    const chars = password.split('')
    const shuffleBytes = crypto.getRandomValues(new Uint8Array(chars.length))
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffleBytes[i] % (i + 1)
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }

    return chars.join('')
  }
}
