import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_SALT = 'ai-shorts-salt';

// Generate a stable 32-byte key from our environment ENCRYPTION_KEY
const getEncryptionKey = () => {
  const secret = env.ENCRYPTION_KEY || 'super_secret_encryption_key_123456789012';
  return crypto.scryptSync(secret, KEY_SALT, 32);
};

export const cryptoHelper = {
  /**
   * Encrypt plain text using AES-256-GCM
   * @param {string} text - text to encrypt
   * @returns {string} iv:authTag:encryptedHex
   */
  encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  },

  /**
   * Decrypt encrypted text using AES-256-GCM
   * @param {string} encryptedText - format: iv:authTag:encryptedHex
   * @returns {string} original text
   */
  decrypt(encryptedText) {
    if (!encryptedText) return '';
    try {
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = getEncryptionKey();
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('[Crypto Helper] Decryption failed:', error.message);
      return '';
    }
  }
};

export default cryptoHelper;
