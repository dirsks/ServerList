
let activeServers = [];
const SERVER_TIMEOUT = 5 * 60 * 1000; 

export default function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    const now = Date.now();
    activeServers = activeServers.filter(server => (now - server.lastSeen) < SERVER_TIMEOUT);

    if (req.method === 'GET') {
        const publicList = activeServers.map(s => `ws://${s.ip}:${s.port}`);
        return res.status(200).json({ servers: publicList });
    }

    if (req.method === 'POST') {
        const { action, port } = req.body || {};
        
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (ip && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }
        if (ip === '::1' || ip === '127.0.0.1') {
            ip = '127.0.0.1';
        }

        if (!port) {
            return res.status(400).json({ error: "Parâmetro 'port' é obrigatório." });
        }
        if (action === 'register') {
            const existingIndex = activeServers.findIndex(s => s.ip === ip && s.port === port);
            
            if (existingIndex >= 0) {
                activeServers[existingIndex].lastSeen = Date.now();
            } else {
                activeServers.push({
                    ip: ip,
                    port: port,
                    lastSeen: Date.now()
                });
            }
            return res.status(200).json({ success: true, message: `Servidor em ${ip}:${port} registado.` });
        }
        if (action === 'unregister') {
            activeServers = activeServers.filter(s => !(s.ip === ip && s.port === port));
            return res.status(200).json({ success: true, message: `Servidor em ${ip}:${port} removido.` });
        }

        return res.status(400).json({ error: "Ação inválida. Use 'register' ou 'unregister'." });
    }

    return res.status(405).json({ error: "Método não permitido." });
}