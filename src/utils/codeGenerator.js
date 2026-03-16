'use strict';

const { customAlphabet } = require('nanoid');
const config = require('../config/index');

// Unambiguous alphabet — removes characters that look similar (0/O, 1/l/I)
// so short codes are easier for humans to type manually.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';

const generate = customAlphabet(ALPHABET, config.SHORT_CODE_LENGTH);

/**
 * Generates a URL-safe short code using NanoID.
 *
 * At 8 chars with 54 characters: 54^8 ≈ 720 billion combinations.
 * Collision probability is negligible for portfolio/startup scale.
 */
function generateShortCode() {
  return generate();
}

module.exports = { generateShortCode };
