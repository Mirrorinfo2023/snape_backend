const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a dynamic secret key from client_id
 * Always treat client_id as string
 */
function getClientSecretKey(client_id) {
  return crypto.createHash('sha256').update(String(client_id)).digest('hex');
}

/**
 * Generate a JWT for a client using its client_id
 * @param {string|number} client_id - The unique client ID
 * @param {object} payload - Optional payload to include in the token
 * @param {string|number} expiresIn - Token expiry (e.g., '1h', '24h')
 * @returns {string} Signed JWT token
 */
function generateClientToken(client_id, payload = {}, expiresIn = '1h') {
  if (!client_id) throw new Error('client_id is required to generate token');

  // Generate dynamic secret key from client_id
  const dynamicSecret = getClientSecretKey(client_id);

  // Base payload (add custom fields if needed)
  const tokenPayload = {
    client_id: String(client_id), // ensure string type
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  };

  // Sign the token
  const token = jwt.sign(tokenPayload, dynamicSecret, {
    algorithm: 'HS256',
    expiresIn,
  });

  return token;
}

// Example usage
// console.log(generateClientToken('1000001', { role: 'admin' }, '2h'));

module.exports = { generateClientToken, getClientSecretKey };
