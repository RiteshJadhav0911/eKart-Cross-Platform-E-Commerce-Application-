const fs = require('fs').promises;
const path = require('path');
const { encryptJSON, decryptJSON } = require('./encryptionService');

const BASE_STORAGE = path.join(__dirname, '../../storage/users');

/**
 * Ensures a directory exists
 */
async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Writes data to an encrypted file in the user's folder
 */
async function writeUserFile(userId, filename, data) {
  const userDir = path.join(BASE_STORAGE, userId.toString());
  console.log(`[FileDB] Writing to ${userDir}`);
  await ensureDir(userDir);
  const filePath = path.join(userDir, `${filename}.enc`);
  const encryptedPayload = encryptJSON(data);
  await fs.writeFile(filePath, encryptedPayload, 'utf8');
}

/**
 * Reads data from an encrypted file in the user's folder
 */
async function readUserFile(userId, filename) {
  const filePath = path.join(BASE_STORAGE, userId.toString(), `${filename}.enc`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return decryptJSON(content) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Appends an activity to the user's activity log
 */
async function logActivity(userId, activity) {
  const activities = await readUserFile(userId, 'activities');
  activities.push({
    ...activity,
    timestamp: new Date().toISOString()
  });
  // Keep only last 100 activities
  if (activities.length > 100) activities.shift();
  await writeUserFile(userId, 'activities', activities);
}

/**
 * Saves user profile data (name, phone)
 */
async function saveProfile(userId, profile) {
  await writeUserFile(userId, 'profile', profile);
}

/**
 * Retrieves user profile data
 */
async function getProfile(userId) {
  const data = await readUserFile(userId, 'profile');
  return Array.isArray(data) ? null : data; // readUserFile returns [] on error/not found
}

module.exports = { writeUserFile, readUserFile, logActivity, saveProfile, getProfile };
