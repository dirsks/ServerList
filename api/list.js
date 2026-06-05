import { Redis } from '@upstash/redis';
import WebSocket from 'ws';

const kv=new Redis({
    url:process.env.KV_REST_API_URL,
    token:process.env.KV_REST_API_TOKEN,
    keepAlive:false
});

async function isAlive(url){
    return new Promise(resolve=>{
        let finished=false;

        const ws=new WebSocket(url,{
            handshakeTimeout:2000
        });

        const timeout=setTimeout(()=>{
            if(finished)return;
            finished=true;
            try{ws.terminate();}catch{}
            resolve(false);
        },2000);

        ws.on('open',()=>{
            if(finished)return;
            finished=true;
            clearTimeout(timeout);
            ws.close();
            resolve(true);
        });

        ws.on('error',()=>{
            if(finished)return;
            finished=true;
            clearTimeout(timeout);
            resolve(false);
        });

        ws.on('unexpected-response',()=>{
            if(finished)return;
            finished=true;
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

            const parsedData=
                typeof data==='string'
                    ? JSON.parse(data)
                    : data;

            const protocol=
                parsedData.secure
                    ? 'wss'
                    : 'ws';

            const address=
                parsedData.host||
                parsedData.ip;

            if(!address){
                await kv.del(key);
                continue;
            }

            const url=
                `${protocol}://${address}:${parsedData.port}`;

            const alive=
                await isAlive(url);

            if(alive){
                activeServers.push(url);
            }else{
                await kv.del(key);
                console.log(`Servidor removido: ${url}`);
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
