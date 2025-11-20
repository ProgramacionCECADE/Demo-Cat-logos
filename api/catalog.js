import { catalogConfig } from '../public/data/catalog-data.js';
import { setCorsHeaders, handleOptions } from './_lib/cors.js';

/**
 * Vercel serverless function for /api/catalog
 * GET: Return full catalog configuration
 */
export default function handler(req, res) {
    // Handle CORS
    setCorsHeaders(req, res);
    if (handleOptions(req, res)) return;

    // Only GET allowed
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(catalogConfig);
    } catch (err) {
        console.error('Error returning catalog:', err);
        return res.status(500).json({ error: 'Error interno' });
    }
}
