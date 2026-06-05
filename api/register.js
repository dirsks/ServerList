import { Redis } from '@upstash/redis';

const kv=new Redis({
    url:process.env.KV_REST_API_URL,
    token:process.env.KV_REST_API_TOKEN,
    keepAlive:false
});

export default async function handler(req,res){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');

    if(req.method==='OPTIONS'){
        return res.status(200).end();
    }

    if(req.method!=='POST'){
        return res.status(405).json({error:'unauthorized method'});
    }

    try{
        const{
            host,
            port,
            name,
            timestamp,
            secure
        }=req.body;

        let serverIp=host;

        if(!serverIp){
            serverIp=req.headers['x-forwarded-for']||req.socket.remoteAddress;

            if(serverIp&&serverIp.includes(',')){
                serverIp=serverIp.split(',')[0].trim();
            }

            if(serverIp==='::1'||serverIp==='127.0.0.1'||!serverIp){
                serverIp='127.0.0.1';
            }

            serverIp=serverIp.replace(/[\[\]]/g,'');
        }

        if(!port){
            return res.status(400).json({
                error:'attempt to require missing fields'
            });
        }

        const serverKey=`server:${serverIp}:${port}`;

        const serverData={
            ip:serverIp,
            port:parseInt(port,10),
            secure:!!secure,
            name:name||`Official Server @ ${port}`,
            lastSeen:timestamp||Date.now()
        };

        await kv.set(
            serverKey,
            JSON.stringify(serverData),
            {ex:120}
        );

        return res.status(200).json({
            success:true,
            message:'success'
        });

    }catch(error){
        return res.status(500).json({
            error:'KV internal error: '+error.message
        });
    }
}
