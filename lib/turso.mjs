/** Server-only Turso HTTP transport. No database credentials are sent to browsers. */
function endpoint(){
 const raw=process.env.TURSO_DATABASE_URL;
 if(!raw||!process.env.TURSO_AUTH_TOKEN)throw new Error('Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
 const url=new URL(raw.replace(/^libsql:/,'https:'));
 if(url.protocol!=='https:'||!url.hostname.endsWith('.turso.io'))throw new Error('Use an HTTPS or libsql Turso database URL.');
 return url.origin+'/v2/pipeline';
}
function encode(value){
 if(value===null||value===undefined)return {type:'null'};
 if(value instanceof Uint8Array)return {type:'blob',base64:Buffer.from(value).toString('base64')};
 if(typeof value==='boolean')return {type:'integer',value:value?'1':'0'};
 if(typeof value==='number')return {type:Number.isInteger(value)?'integer':'float',value:Number.isInteger(value)?String(value):value};
 return {type:'text',value:String(value)};
}
function decode(value){if(value.type==='null')return null;if(value.type==='blob')return Buffer.from(value.base64,'base64');if(value.type==='integer'||value.type==='float')return Number(value.value);return value.value;}
async function pipeline(requests,baton){
 const response=await fetch(endpoint(),{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+process.env.TURSO_AUTH_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({requests,...(baton?{baton}:{})}),signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!response.ok)throw new Error('Turso request failed (HTTP '+response.status+').');
 const body=await response.json();
 if(!Array.isArray(body.results))throw new Error('Invalid Turso response.');
 return body;
}
function result(item){
 if(item?.type!=='ok')throw new Error('Turso SQL operation failed: '+(item?.error?.code||'UNKNOWN'));
 const value=item.response.result;
 return {results:(value.rows||[]).map(row=>Object.fromEntries(value.cols.map((column,index)=>[column.name,decode(row[index])]))),success:true,meta:{changes:value.affected_row_count||0}};
}
class Statement{
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 request(){return {type:'execute',stmt:{sql:this.sql,args:this.args.map(encode)}};}
 async all(){const response=await pipeline([this.request(),{type:'close'}]);return result(response.results[0]);}
 async first(){return (await this.all()).results[0]||null;}
 async run(){return this.all();}
}
export const db={
 prepare(sql){return new Statement(sql);},
 async batch(statements){
  if(!statements.length)return [];
  const steps=[{stmt:{sql:'BEGIN IMMEDIATE'}}];
  for(const statement of statements)steps.push({condition:{type:'ok',step:steps.length-1},stmt:statement.request().stmt});
  const commitIndex=steps.length;
  steps.push({condition:{type:'ok',step:commitIndex-1},stmt:{sql:'COMMIT'}});
  steps.push({condition:{type:'not',cond:{type:'ok',step:commitIndex}},stmt:{sql:'ROLLBACK'}});
  const response=await pipeline([{type:'batch',batch:{steps}},{type:'close'}]);
  const item=response.results[0];
  if(item?.type!=='ok')throw new Error('Turso batch failed: '+(item?.error?.code||'UNKNOWN'));
  const output=item.response.result;
  const failure=output.step_errors?.find(Boolean);
  if(failure)throw new Error('Turso SQL operation failed: '+failure.code);
  if(!output.step_results?.[commitIndex])throw new Error('Turso transaction was not committed.');
  return output.step_results.slice(1,commitIndex).map(value=>result({type:'ok',response:{result:value}}));

 }
};
