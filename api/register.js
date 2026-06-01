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
        const { port, name, timestamp } = req.body;
        const serverIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!port) {
            return res.status(400).json({ error: 'A propriedade "port" é obrigatória.' });
        }

        const serverKey = `server:${serverIp}:${port}`;
        
        const serverData = {
            ip: serverIp,
            port: parseInt(port, 10),
            name: name || `Official Server @ ${port}`,
            lastSeen: timestamp || Date.now()
        };

        // Salva com expiração de 30 segundos
        await kv.set(serverKey, JSON.stringify(serverData), { ex: 30 });

        return res.status(200).json({ success: true, message: 'Servidor registrado com sucesso!' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro interno no banco KV: ' + error.message });
    }
}