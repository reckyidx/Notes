const crypto = require('crypto');
const ShortCodeStrategy = require('./ShortCodeStrategy');

/**
 * Concrete Strategy: Random character generation
 * Uses cryptographically secure random characters
 */
class RandomShortCodeStrategy extends ShortCodeStrategy {
  constructor(length = 6) {
    super();
    this.length = length;
    this.charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }

  generate() {
    let result = '';
    const charsetLength = this.charset.length;
    
    for (let i = 0; i < this.length; i++) {
      const randomBuffer = crypto.randomBytes(1);
      const randomIndex = randomBuffer[0] % charsetLength;
      result += this.charset[randomIndex];
    }
    
    return result;
  }
}

module.exports = RandomShortCodeStrategy;
