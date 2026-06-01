import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Use GET para listar.' });
    }

    try {
        // Busca todas as chaves no Redis que começam com "server:"
        const keys = await kv.keys('server:*');
        const activeServers = [];

        for (const key of keys) {
            const data = await kv.get(key);
            if (data) {
                activeServers.push(data); // Já vem parseado como Objeto
            }
        }

        return res.status(200).json({ servers: activeServers });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao listar chaves do KV: ' + error.message });
    }
}