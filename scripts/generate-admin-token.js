#!/usr/bin/env node
/**
 * Simple script to generate a random admin token and its bcrypt hash.
 * Usage: node scripts/generate-admin-token.js
 * Output: prints token (plain) and hash (copy hash into ADMIN_TOKEN_HASH env var)
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';

async function main() {
  const token = crypto.randomBytes(16).toString('hex');
  const saltRounds = 12;
  const hash = await bcrypt.hash(token, saltRounds);
  console.log('ADMIN TOKEN (store this securely, do NOT commit):', token);
  console.log('ADMIN_TOKEN_HASH (put this in your env):', hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
