import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for Vercel serverless environment (persistent storage not guaranteed)
// For production, consider using a database or external storage service
const discountsFile = path.join('/tmp', 'discounts.json');

/**
 * Read discounts from persistent storage
 * @returns {Promise<Object>} Discounts object mapping productId -> {percent, expiresAt}
 */
export async function readDiscounts() {
    try {
        const txt = await fs.readFile(discountsFile, 'utf8');
        return txt ? JSON.parse(txt) : {};
    } catch (err) {
        // If file doesn't exist, return empty object
        if (err.code === 'ENOENT') {
            return {};
        }
        console.error('Error reading discounts file:', err);
        return {};
    }
}

/**
 * Write discounts to persistent storage
 * @param {Object} obj - Discounts object to write
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function writeDiscounts(obj) {
    try {
        await fs.writeFile(discountsFile, JSON.stringify(obj, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing discounts file:', err);
        return false;
    }
}
