import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.AES_KEY;
  if (!key) {
    throw new Error('AES_KEY environment variable is not set');
  }
  return Buffer.from(key, 'hex');
}

export function encryptApiKey(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  const result = Buffer.concat([
    iv,
    tag,
    Buffer.from(encrypted, 'hex')
  ]);
  
  return result.toString('base64');
}

export function decryptApiKey(encryptedData: string): string {
  try {
    const key = getKey();
    const data = Buffer.from(encryptedData, 'base64');
    
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt API key');
  }
}

export function generateSecureKey(): string {
  return crypto.randomBytes(32).toString('hex');
}