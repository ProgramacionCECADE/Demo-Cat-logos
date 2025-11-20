#!/usr/bin/env node
/**
 * Usage: node scripts/hash-admin-token.js <token>
 * Prints a bcrypt hash suitable for ADMIN_TOKEN_HASH
 */
import bcrypt from 'bcrypt';

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: node scripts/hash-admin-token.js <token>');
    process.exit(2);
  }
  const saltRounds = 12;
  const hash = await bcrypt.hash(token, saltRounds);
  console.log(hash);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
