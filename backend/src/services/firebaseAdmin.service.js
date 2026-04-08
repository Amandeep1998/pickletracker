const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

/**
 * Initializes Firebase Admin once. First match wins:
 * - FIREBASE_SERVICE_ACCOUNT_JSON: full JSON string of a service account key (good for PaaS)
 * - FIREBASE_SERVICE_ACCOUNT_PATH: path to a service account JSON file (good for local dev)
 * - GOOGLE_APPLICATION_CREDENTIALS: path to a service account JSON file (Google default env)
 */
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const cred = JSON.parse(json);
      admin.initializeApp({
        credential: admin.credential.cert(cred),
      });
      return admin;
    } catch (err) {
      console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON is set but invalid JSON:', err.message);
      return null;
    }
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (b64) {
    try {
      const raw = Buffer.from(b64.trim(), 'base64').toString('utf8');
      const cred = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(cred),
      });
      return admin;
    } catch (err) {
      console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 invalid:', err.message);
      return null;
    }
  }

  const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (credPath) {
    try {
      const abs = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
      if (!fs.existsSync(abs)) {
        console.warn('[Firebase Admin] File not found for FIREBASE_SERVICE_ACCOUNT_PATH:', abs);
        return null;
      }
      const cred = JSON.parse(fs.readFileSync(abs, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(cred),
      });
      return admin;
    } catch (err) {
      console.warn('[Firebase Admin] Failed to load FIREBASE_SERVICE_ACCOUNT_PATH:', err.message);
      return null;
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      return admin;
    } catch (err) {
      console.warn('[Firebase Admin] GOOGLE_APPLICATION_CREDENTIALS failed:', err.message);
      return null;
    }
  }

  return null;
}

function isFirebaseConfigured() {
  return getFirebaseAdmin() !== null;
}

/**
 * @param {string} idToken
 * @returns {Promise<import('firebase-admin').auth.DecodedIdToken>}
 */
async function verifyIdToken(idToken) {
  const app = getFirebaseAdmin();
  if (!app) {
    const err = new Error('Firebase Admin is not configured');
    err.code = 'FIREBASE_NOT_CONFIGURED';
    throw err;
  }
  return app.auth().verifyIdToken(idToken);
}

module.exports = { getFirebaseAdmin, verifyIdToken, isFirebaseConfigured };
