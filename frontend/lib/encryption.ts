import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (64 hex characters if hex, or 32 chars if utf-8)

const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('ENCRYPTION_KEY is not set. Saving plain text (NOT SECURE).');
    return text;
  }

  try {
    let key = Buffer.from(ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
      // Fallback if not hex
      key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY || !text.includes(':')) {
    return text;
  }

  try {
    let key = Buffer.from(ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
      key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    }

    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() as string, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}
