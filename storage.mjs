import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const folder=new URL('./.data/',import.meta.url);mkdirSync(folder,{recursive:true});
const sqlite=new DatabaseSync(fileURLToPath(new URL('game.sqlite',folder)));
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
if(!sqlite.prepare('SELECT name FROM local_migrations WHERE name=?').get('0000_game')){sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(new URL('./drizzle/0000_game.sql',import.meta.url),'utf8'));sqlite.prepare('INSERT INTO local_migrations(name)VALUES(?)').run('0000_game');sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}
export const DB={prepare(sql){let values=[];return {bind(...params){values=params;return this},async first(){return sqlite.prepare(sql).get(...values)||null},async all(){return {results:sqlite.prepare(sql).all(...values)}},async run(){const r=sqlite.prepare(sql).run(...values);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
