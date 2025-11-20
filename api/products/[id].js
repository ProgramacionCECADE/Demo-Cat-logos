import { catalogConfig } from '../../public/data/catalog-data.js';
import { setCorsHeaders, handleOptions } from '../_lib/cors.js';

/**
 * Vercel serverless function for /api/products/[id]
 * GET: Return single product by ID
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
        // Extract ID from query params (Vercel provides this)
        const { id } = req.query;
        const productId = Number(id);

        if (Number.isNaN(productId)) {
            return res.status(400).json({ error: 'Invalid product id' });
        }

        const product = Array.isArray(catalogConfig.products)
            ? catalogConfig.products.find((p) => p.id === productId)
            : null;

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json(product);
    } catch (err) {
        console.error('Error returning product:', err);
        return res.status(500).json({ error: 'Error interno' });
    }
}
