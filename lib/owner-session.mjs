import {createHmac,timingSafeEqual,randomBytes} from 'node:crypto';
export const cookieName=process.env.NODE_ENV==='production'?'__Host-owner_session':'owner_session';
function secret(){const value=process.env.SESSION_SECRET;if(!value||value.length<32)throw new Error('Set SESSION_SECRET to at least 32 random characters.');return value;}
function signature(value){return createHmac('sha256',secret()).update(value).digest('base64url');}
export function equal(a,b){const first=createHmac('sha256','comparison').update(a).digest();const second=createHmac('sha256','comparison').update(b).digest();return timingSafeEqual(first,second);}
export function createSession(now=Date.now()){const value='owner.'+(now+8*60*60*1000)+'.'+randomBytes(24).toString('base64url');return value+'.'+signature(value);}
export function validSession(token,now=Date.now()){if(typeof token!=='string')return false;const parts=token.split('.');if(parts.length!==4||parts[0]!=='owner'||!/^\d+$/.test(parts[1]))return false;if(Number(parts[1])<=now||Number(parts[1])>now+8*60*60*1000)return false;try{return equal(parts[3],signature(parts.slice(0,3).join('.')))}catch{return false}}
export function safeReturn(path){return typeof path==='string'&&path.startsWith('/')&&!path.startsWith('//')&&!path.includes('\\')?path:'/admin';}
export function sameOrigin(req){const origin=req.headers.get('origin');if(!origin)return false;const target=new URL(req.url);if(origin===target.origin)return true;const host=req.headers.get('host');const protocol=req.headers.get('x-forwarded-proto')==='https'?'https:':target.protocol;return !!host&&origin===protocol+'//'+host;}
