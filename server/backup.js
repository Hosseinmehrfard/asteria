import { backup } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {db} from './db.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const backupDir=path.join(root,'backups');
fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
const target=path.join(backupDir,'asteria-'+new Date().toISOString().replace(/[.:]/g,'-')+'.sqlite');
try{
 await backup(db,target);
 fs.chmodSync(target,0o600);
 console.log('Complete SQLite backup:',target);
}catch(e){console.error('Backup failed:',e.message);process.exitCode=1;}finally{db.close();}
