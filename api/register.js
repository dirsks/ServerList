import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // Permite conexões vindas do seu jogo Java / Node de qualquer lugar (CORS)
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
        
        // Captura o IP de onde o servidor Java/Node está rodando de verdade
        const serverIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!port) {
            return res.status(400).json({ error: 'A propriedade "port" é obrigatória.' });
        }

        // Criamos uma chave única para esse servidor baseada no IP e na Porta dele
        const serverKey = `server:${serverIp}:${port}`;
        
        const serverData = {
            ip: serverIp,
            port: parseInt(port, 10),
            name: name || `Official Server @ ${port}`,
            lastSeen: timestamp || Date.now()
        };

        // Salva os dados na Vercel KV e define um tempo de expiração automática de 30 segundos.
        // Se a VPS cair e não mandar sinal, o servidor some sozinho da lista pública!
        await kv.set(serverKey, JSON.stringify(serverData), { ex: 30 });

        return res.status(200).json({ success: true, message: 'Servidor registrado com sucesso!' });
    } catch (error) {
        return res.status(500).json({ error: 'Erro interno no banco KV: ' + error.message });
    }
}