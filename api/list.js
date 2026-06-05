import { Redis } from '@upstash/redis';

const kv=new Redis({
    url:process.env.KV_REST_API_URL,
    token:process.env.KV_REST_API_TOKEN,
    keepAlive:false
});

export default async function handler(req,res){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Content-Type','application/json');

    if(req.method!=='GET'){
        return res.status(405).json({
            error:'Use GET'
        });
    }

    try{
        const keys=await kv.keys('server:*');

        const servers=[];

        for(const key of keys){

            const data=await kv.get(key);

            if(!data){
                continue;
            }

            const protocol=
                data.secure
                    ? 'wss'
                    : 'ws';

            servers.push(
                `${protocol}://${data.host||data.ip}:${data.port}`
            );
        }

        return res.status(200).json({
            servers
        });

    }catch(error){
        return res.status(500).json({
            error:error.message
        });
    }
}
