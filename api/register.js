import { Redis } from '@upstash/redis';

// Configuração otimizada para o ambiente Serverless da Vercel
const kv = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
    keepAlive: false, // Evita conexões presas que causam timeout na Vercel
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
        
        // Tratamento robusto do IP público do seu servidor de jogo
        let serverIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (serverIp && serverIp.includes(',')) {
            serverIp = serverIp.split(',')[0].trim();
        }
        if (serverIp === '::1' || serverIp === '127.0.0.1' || !serverIp) {
            serverIp = '127.0.0.1';
        }
        serverIp = serverIp.replace(/[\[\]]/g, ''); 

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

        // Força o Node.js a aguardar a gravação física no Redis da Upstash
        await kv.set(serverKey, JSON.stringify(serverData), { ex: 30 });

        return res.status(200).json({ success: true, message: 'Servidor registrado com sucesso!' });
    } catch (error) {
        // Se der erro, ele vai te dizer exatamente o que a Upstash respondeu nos logs
        return res.status(500).json({ error: 'Erro interno no banco KV: ' + error.message });
    }
}