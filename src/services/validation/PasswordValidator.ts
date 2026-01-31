export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
  entropy: number
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 12
  private static readonly MIN_ENTROPY = 60 // bits

  // Common passwords to check against (in production, use a larger list)
  private static readonly COMMON_PASSWORDS = [
    'password123',
    'admin123',
    'letmein123',
    'welcome123',
    'monkey123',
    'dragon123',
    'baseball123',
    'football123',
    'qwerty123',
    'master123',
    'michael123',
    'shadow123',
    'superman123',
    'hello123',
    'charlie123',
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

  private static calculateEntropy(password: string): number {
    let charsetSize = 0

    if (/[a-z]/.test(password)) charsetSize += 26
    if (/[A-Z]/.test(password)) charsetSize += 26
    if (/\d/.test(password)) charsetSize += 10
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) charsetSize += 32
    if (/[^a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) charsetSize += 32 // Other special chars

    return password.length * Math.log2(charsetSize)
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

  static generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const allChars = uppercase + lowercase + numbers + special

    let password = ''

    // Ensure at least one of each required character type
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('')
  }
}
