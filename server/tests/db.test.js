import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'asteria-db-test-'));
process.env.DB_PATH=path.join(scratch,'site.sqlite');
const {db,get,all,run,uid,audit}=await import('../db.js');

test('SQLite schema initializes all required domain tables',()=>{
 const names=all("SELECT name FROM sqlite_master WHERE type='table'").map(x=>x.name);
 for(const name of ['users','sessions','content','orders','coupons','bookings','messages','newsletter','files','charts','settings','audit','categories','lessons'])assert.ok(names.includes(name),name);
 assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
});
test('seed content is independent and bilingual',()=>{
 const a=get("SELECT * FROM content WHERE slug='reading-your-natal-chart'");
 assert.equal(a.kind,'article');
 assert.ok(a.title_fa.length>5);
 assert.ok(a.title_en.length>5);
 assert.ok(get('SELECT COUNT(*) AS n FROM categories').n>=5);
 assert.ok(get('SELECT COUNT(*) AS n FROM lessons').n>=3);
});
test('different users and audit events are stored',()=>{
 const id=uid();
 run('INSERT INTO users(id,email,name,password_hash) VALUES(?,?,?,?)',id,'qa@example.test','QA Tester','salt:hash');
 assert.equal(get('SELECT role FROM users WHERE id=?',id).role,'customer');
 audit({id},'qa.check','database',{passed:true});
 assert.ok(get("SELECT * FROM audit WHERE user_id=? AND action='qa.check'",id));
});
test('order data retains immutable snapshot and valid total',()=>{
 const id=uid();
 const snapshot=[{id:'test',titleFa:'نمونه',titleEn:'Sample',price:9000,quantity:2,kind:'product'}];
 run('INSERT INTO orders(id,name,email,items,subtotal,total) VALUES(?,?,?,?,?,?)',id,'Test','test@example.test',JSON.stringify(snapshot),18000,18000);
 const row=get('SELECT * FROM orders WHERE id=?',id);
 assert.equal(row.status,'awaiting_payment');
 assert.equal(JSON.parse(row.items)[0].quantity,2);
 assert.equal(row.total,18000);
});
test.after(()=>{db.close();fs.rmSync(scratch,{recursive:true,force:true});});
