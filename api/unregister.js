import { Redis } from '@upstash/redis';

const kv = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    try {
        const { port } = req.body;
        const serverIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!port) {
            return res.status(400).json({ error: 'A propriedade "port" é obrigatória.' });
        }

        const serverKey = `server:${serverIp}:${port}`;

        await kv.del(serverKey);

        return res.status(200).json({ success: true, message: 'Servidor desregistrado com sucesso!' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao remover do banco KV: ' + error.message });
    }
}