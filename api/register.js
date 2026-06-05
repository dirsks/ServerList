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
        return res.status(405).json({
            error:'unauthorized method'
        });
    }

    try{
        const{
            host,
            port,
            name,
            timestamp,
            secure
        }=req.body;

        if(!host||!port){
            return res.status(400).json({
                error:'missing host or port'
            });
        }

        const serverKey=`server:${host}:${port}`;

        await kv.set(
            serverKey,
            {
                host,
                port:Number(port),
                secure:!!secure,
                name:name||`Official Server @ ${host}:${port}`,
                lastSeen:timestamp||Date.now()
            },
            {
                ex:120
            }
        );

        return res.status(200).json({
            success:true
        });

    }catch(error){
        return res.status(500).json({
            error:error.message
        });
    }
}
