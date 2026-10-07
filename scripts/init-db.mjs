import {readFile} from 'node:fs/promises';
import {db} from '../lib/turso.mjs';
export async function initialize(){
 const schema=[
 'CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,image TEXT,published INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,value TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS chat_limits(id TEXT PRIMARY KEY,count INTEGER NOT NULL DEFAULT 0,window INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS images(id TEXT PRIMARY KEY,mime TEXT NOT NULL,data BLOB NOT NULL,created TEXT NOT NULL)',
 'CREATE INDEX IF NOT EXISTS idx_content_published_kind_created ON content(published,kind,created DESC)'
 ];
 for(const [index,sql] of schema.entries()){await db.prepare(sql).run();console.log("Schema check",index+1,"of",schema.length,"passed.");}
 const seed=JSON.parse(await readFile(new URL('../data-migration.json',import.meta.url),'utf8'));
 // Import only missing rows. Existing Turso edits are never overwritten.
 const statements=[];
 for(const [id,value] of Object.entries(seed.settings))statements.push(db.prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(id,value));
 for(const row of seed.items)statements.push(db.prepare('INSERT INTO content(id,kind,title,body,image,published,created) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(row.id,row.kind,row.title,row.body,row.image,row.published,row.created));
 if(statements.length)await db.batch(statements);
 console.log('Turso schema ready; imported missing portfolio settings and content.');
 const check=await db.prepare('SELECT (SELECT count(*) FROM settings) AS settings,(SELECT count(*) FROM content) AS content').first();
 console.log('Verified records:',JSON.stringify(check));
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].split('/').pop()))initialize().catch(()=>{console.error('Database initialization failed. Check Turso connection, credentials, and write permissions.');process.exitCode=1;});
