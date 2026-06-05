import { Redis } from '@upstash/redis';
import WebSocket from 'ws';

const kv=new Redis({
    url:process.env.KV_REST_API_URL,
    token:process.env.KV_REST_API_TOKEN,
    keepAlive:false
});

async function checkServer(url){
    return new Promise(resolve=>{
        const ws=new WebSocket(url);

        const timeout=setTimeout(()=>{
            ws.terminate();
            resolve(false);
        },3000);

        ws.on('open',()=>{
            clearTimeout(timeout);
            ws.close();
            resolve(true);
        });

        ws.on('error',()=>{
            clearTimeout(timeout);
            resolve(false);
        });
    });
}

export default async function handler(req,res){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Content-Type','application/json');

    if(req.method!=='GET'){
        return res.status(405).json({
            error:'Use GET para listar.'
        });
    }

    try{
        const keys=await kv.keys('server:*');

        const activeServers=[];

        for(const key of keys){

            const data=await kv.get(key);

            if(!data){
                continue;
            }

            const parsed=
                typeof data==='string'
                    ? JSON.parse(data)
                    : data;

            const protocol=
                parsed.secure
                    ? 'wss'
                    : 'ws';

            const url=
                `${protocol}://${parsed.ip}:${parsed.port}`;

            const alive=
                await checkServer(url);

            if(alive){
                activeServers.push(url);
            }else{
                await kv.del(key);
            }
        }

        return res.status(200).json({
            servers:activeServers
        });

    }catch(error){
        return res.status(500).json({
            error:error.message
        });
    }
}
