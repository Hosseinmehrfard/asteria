import {db,get,run,uid} from './db.js';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
const rl=readline.createInterface({input,output});
try{
 const email=(await rl.question('Administrator email: ')).trim().toLowerCase();
 const name=(await rl.question('Administrator display name: ')).trim();
 const password=await rl.question('Administrator password (minimum 12 characters; input is visible): ');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||password.length<12)throw new Error('Invalid credentials. Password must be at least 12 characters.');
 if(get('SELECT id FROM users WHERE email=?',email))throw new Error('This email is already registered.');
 const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync(password,salt,64).toString('hex');
 run('INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)',uid(),email,name,`${salt}:${hash}`,'admin');
 console.log('Administrator created. Sign in via /login, then open /admin.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{rl.close();db.close();}
