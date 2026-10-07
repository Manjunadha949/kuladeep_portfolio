import {sameOrigin} from '../../owner-auth';
import {getOwnerUser} from '../../chatgpt-auth';
import {db} from '../../../lib/turso.mjs';
import {chatSystem,emergencyReply} from '../../chat-grounding';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const model=()=>process.env.GROQ_MODEL?.trim()||'openai/gpt-oss-120b';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});

// Owner-only configuration check. Never return the API key or provider response body.
export async function GET(){
  try{
    if(!await getOwnerUser())return json({error:'Unauthorized'},401);
    const key=process.env.GROQ_API_KEY?.trim();
    if(!key)return json({configured:false,connected:false,code:'GROQ_KEY_MISSING',message:'Set GROQ_API_KEY in Netlify environment variables for Functions and this deploy context, then redeploy.'});
    const response=await fetch('https://api.groq.com/openai/v1/models',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(!response.ok)return json({configured:true,connected:false,providerStatus:response.status,code:response.status===401?'GROQ_KEY_INVALID':response.status===403?'GROQ_ACCESS_DENIED':'GROQ_CONNECTION_FAILED',message:response.status===401?'Groq rejected the API key. Replace it with a valid key and redeploy.':'Groq did not accept the connection check. Check account access and provider status.'});
    const data:any=await response.json();
    const available=Array.isArray(data.data)&&data.data.some((item:any)=>item.id===model());
    return json({configured:true,connected:true,model:model(),modelAvailable:available,message:available?'Groq authentication and model listing succeeded. Send a chat message to verify answer generation.':'The configured model is not in the available model list. Check GROQ_MODEL and account permissions.'});
  }catch{return json({connected:false,code:'CONNECTION_CHECK_FAILED',message:'The connection check could not finish. Check the server logs and try again.'},503)}
}

export async function POST(req:Request){
  if(req.headers.get('origin')&&!sameOrigin(req))return json({error:'Invalid request origin'},403);
  let input:any;
  try{input=await req.json()}catch{return json({error:'Invalid message'},400)}
  if(!input||!Array.isArray(input.messages)||input.messages.length>20||input.messages.some((m:any)=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>(m.role==='assistant'?30000:2000)))return json({error:'Please send a shorter message.'},400);
  const messages=input.messages.slice(-10).map((m:any)=>({role:m.role,content:m.content.trim()}));
  const last=messages.at(-1);
  if(!last||last.role!=='user'||!last.content)return json({error:'Type a question to begin.'},400);
  const urgent=emergencyReply(last.content);
  if(urgent)return json({reply:urgent});
  const key=process.env.GROQ_API_KEY?.trim();
  if(!key){
    console.error('Clinic chat configuration: GROQ_KEY_MISSING');
    return json({error:'The AI assistant is not configured yet. Please contact the clinic on WhatsApp.',code:'GROQ_KEY_MISSING'},503);
  }
  let settings:Record<string,string>,articles:any[];
  try{
    const identity=req.headers.get('x-nf-client-connection-ip')||req.headers.get('x-forwarded-for')||'shared';
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
    const fingerprint=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
    const window=Math.floor(Date.now()/3600000),id=fingerprint+':'+window;
    await db.prepare('INSERT INTO chat_limits(id,count,window) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1').bind(id,window).run();
    const limit:any=await db.prepare('SELECT count FROM chat_limits WHERE id=?').bind(id).first();
    if(limit?.count>40)return json({error:'The hourly chat limit has been reached. Please contact the clinic on WhatsApp.'},429);
    await db.prepare('DELETE FROM chat_limits WHERE window < ?').bind(window-24).run();
    const rows=await db.prepare('SELECT * FROM settings').all();
    settings=Object.fromEntries(rows.results.map((x:any)=>[x.id,x.value]));
    const content=await db.prepare("SELECT title,body FROM content WHERE published=1 AND kind='blog' ORDER BY created DESC LIMIT 8").all();
    articles=content.results;
  }catch{
    console.error('Clinic chat: CLINIC_DATABASE_UNAVAILABLE');
    return json({error:'Clinic information is temporarily unavailable. Please try again or contact the clinic on WhatsApp.',code:'CLINIC_DATABASE_UNAVAILABLE'},503);
  }
  try{
    // All normal questions go to Groq, grounded in the current portfolio and medical summaries.
    const selectedModel=model();
    const body:any={model:selectedModel,messages:[{role:'system',content:chatSystem(settings,articles)},...messages],temperature:0.2,max_completion_tokens:3500};
    if(selectedModel.startsWith('openai/gpt-oss-'))body.reasoning_effort='low';
    const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000),cache:'no-store'});
    if(!response.ok){
      const code=response.status===401?'GROQ_KEY_INVALID':response.status===403?'GROQ_ACCESS_DENIED':response.status===429?'GROQ_RATE_LIMITED':response.status===400||response.status===404?'GROQ_MODEL_OR_REQUEST_ERROR':'GROQ_PROVIDER_ERROR';
      console.error('Clinic chat provider failure',code,'HTTP',response.status);
      return json({error:response.status===429?'The assistant is busy. Please try again shortly.':'The AI assistant could not connect. Please contact the clinic on WhatsApp.',code},503);
    }
    const data:any=await response.json();
    const reply=data.choices?.[0]?.message?.content;
    if(typeof reply!=='string'||!reply.trim()){console.error('Clinic chat: GROQ_EMPTY_RESPONSE');return json({error:'The assistant could not prepare an answer. Please try again.',code:'GROQ_EMPTY_RESPONSE'},503)}
    return json({reply:reply.trim(),provider:'groq'});
  }catch{
    console.error('Clinic chat: GROQ_NETWORK_OR_TIMEOUT');
    return json({error:'The assistant could not connect in time. Please try again or contact the clinic on WhatsApp.',code:'GROQ_NETWORK_OR_TIMEOUT'},503);
  }
}
