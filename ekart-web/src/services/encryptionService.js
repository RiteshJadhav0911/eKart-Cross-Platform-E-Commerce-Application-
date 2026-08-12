const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key-for-demo', 'salt', 32);

/**
 * Encrypts a string using AES-256-CBC
 * @param {string} text 
 * @returns {string} iv:encryptedData
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts a string using AES-256-CBC
 * @param {string} text iv:encryptedData
 * @returns {string}
 */
function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  if (!ivHex || !encryptedHex) return '';
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Encrypts a JSON object
 */
function encryptJSON(obj) {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypts to a JSON object
 */
function decryptJSON(text) {
  try {
    return JSON.parse(decrypt(text));
  } catch (e) {
    return null;
  }
}

module.exports = { encrypt, decrypt, encryptJSON, decryptJSON };
