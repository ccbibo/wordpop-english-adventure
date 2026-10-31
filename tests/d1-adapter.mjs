// Test/local D1 adapter: prepared statements execute real SQLite, not canned results.
export function createD1(sqlite){
 const prepare=sql=>{
  let values=[];const statement=sqlite.prepare(sql);
  return {bind(...args){values=args;return this},async first(column){const row=statement.get(...values);return column?row?.[column]:row||null},async all(){return {success:true,results:statement.all(...values)}},async run(){const r=statement.run(...values);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}}};
 };
 return {prepare,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
}
