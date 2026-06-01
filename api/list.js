import { Redis } from '@upstash/redis';

const kv = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Use GET para listar.' });
    }

    try {
        const keys = await kv.keys('server:*');
        const activeServers = [];

        for (const key of keys) {
            const data = await kv.get(key);
            if (data) {
                // O driver da Upstash já pode retornar o objeto parseado ou como string dependendo da versão.
                // Garantimos que vire um objeto Javascript válido:
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                activeServers.push(`ws://${parsedData.ip}:${parsedData.port}`);
            }
        }

        return res.status(200).json({ servers: activeServers });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao listar chaves do KV: ' + error.message });
    }
}