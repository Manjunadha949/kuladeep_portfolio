import {db} from '../lib/turso.mjs';
import Home from './home-client';
export const dynamic='force-dynamic';
export default async function Page(){
 const [rows,settings]=await Promise.all([
  db.prepare('SELECT id,kind,title,body,image,published,created FROM (SELECT *,ROW_NUMBER() OVER(PARTITION BY kind ORDER BY created DESC) AS rank FROM content WHERE published = 1) WHERE rank <= 3 ORDER BY created DESC').all(),
  db.prepare('SELECT * FROM settings').all()
 ]);
 const data={items:rows.results,settings:{...{"instagram":"https://www.instagram.com/drkuladeep?stkn=MWZ4MmVkeG9pcWw1eQ==","linkedin":"https://www.linkedin.com/in/kuladeep-l-449406120?utm_source=share_via&utm_content=profile&utm_medium=member_android"},...Object.fromEntries(settings.results.map((s:any)=>[s.id,s.value]))}};
 return <Home initialData={data}/>;
}
