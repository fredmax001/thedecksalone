const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'deck-salone-super-secret-key-2026';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { signToken, verifyToken };
