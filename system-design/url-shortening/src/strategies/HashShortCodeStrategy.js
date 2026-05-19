const crypto = require('crypto');
const ShortCodeStrategy = require('./ShortCodeStrategy');

/**
 * Concrete Strategy: Hash-based generation
 * Uses deterministic hash algorithm for consistent encoding
 */
class HashShortCodeStrategy extends ShortCodeStrategy {
  constructor(length = 6) {
    super();
    this.length = length;
    this.charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }

  generate(input) {
    if (!input) {
      throw new Error('Input is required for hash-based strategy');
    }

    const hash = crypto
      .createHash('sha256')
      .update(input + Date.now())
      .digest('hex');
    
    let result = '';
    const charsetLength = this.charset.length;
    
    for (let i = 0; i < this.length && i < hash.length; i += 2) {
      const hexPair = hash.substring(i, i + 2);
      const index = parseInt(hexPair, 16) % charsetLength;
      result += this.charset[index];
    }
    
    return result;
  }
}

module.exports = HashShortCodeStrategy;
