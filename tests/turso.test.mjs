import test from 'node:test';import assert from 'node:assert/strict';import {db} from '../lib/turso.mjs';
process.env.TURSO_DATABASE_URL='libsql://test.turso.io';process.env.TURSO_AUTH_TOKEN='test-only';
const original=globalThis.fetch;
const ok=(result)=>({type:'ok',response:{type:'execute',result:result||{rows:[],cols:[],affected_row_count:0}}});
test('positional values are bound, blobs and SQL rows decode correctly',async()=>{
 let payload;
 globalThis.fetch=async(_,options)=>{payload=JSON.parse(options.body);return Response.json({results:[ok({cols:[{name:'data'},{name:'count'}],rows:[[{type:'blob',base64:'AQID'},{type:'integer',value:'3'}]],affected_row_count:0}),{type:'ok',response:{type:'close'}}]});};
 try{const row=await db.prepare('SELECT ?, ?').bind(new Uint8Array([1,2,3]),"x';DROP TABLE content;--").first();assert.deepEqual([...row.data],[1,2,3]);assert.equal(row.count,3);assert.equal(payload.requests[0].stmt.sql,'SELECT ?, ?');assert.equal(payload.requests[0].stmt.args[1].value,"x';DROP TABLE content;--");assert.equal(payload.requests[0].stmt.args[0].base64,'AQID');}finally{globalThis.fetch=original;}
});
test('SQL failure is rejected and transactional batch contains guarded rollback',async()=>{
 let steps;
 globalThis.fetch=async(_,options)=>{const payload=JSON.parse(options.body);steps=payload.requests[0].batch.steps;return Response.json({results:[{type:'ok',response:{type:'batch',result:{step_results:[{rows:[],cols:[]},null,null,{rows:[],cols:[]}],step_errors:[null,{code:'CONSTRAINT'},null,null]}}},{type:'ok',response:{type:'close'}}]});};
 try{await assert.rejects(db.batch([db.prepare('INSERT INTO content VALUES(?)').bind('x')]),/CONSTRAINT/);assert.equal(steps[2].stmt.sql,'COMMIT');assert.deepEqual(steps[2].condition,{type:'ok',step:1});assert.equal(steps[3].stmt.sql,'ROLLBACK');assert.deepEqual(steps[3].condition,{type:'not',cond:{type:'ok',step:2}});}finally{globalThis.fetch=original;}
});
