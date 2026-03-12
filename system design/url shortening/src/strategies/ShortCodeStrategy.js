/**
 * Strategy Pattern for Short Code Generation
 * Defines the interface for different short code generation algorithms
 */
class ShortCodeStrategy {
  /**
   * @abstract
   * @returns {string} The generated short code
   */
  generate() {
    throw new Error('generate() must be implemented by subclass');
  }
}

module.exports = ShortCodeStrategy;
