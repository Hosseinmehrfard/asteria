import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultBuilder,normalizeBuilder,SECTION_TYPES} from '../site-builder.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'asteria-builder-test-'));
process.env.DB_PATH=path.join(scratch,'test.sqlite');
const {db,get,run}=await import('../db.js');
test.after(()=>{db.close();fs.rmSync(scratch,{recursive:true,force:true});});

test('all reference layout sections have supported types and unique identifiers',()=>{
 const normalized=normalizeBuilder(defaultBuilder);
 assert.equal(normalized.sections.length,defaultBuilder.sections.length);
 assert.equal(new Set(normalized.sections.map(s=>s.id)).size,normalized.sections.length);
 assert.ok(normalized.sections.every(s=>SECTION_TYPES.includes(s.type)));
});
test('site builder can persist bilingual changes and section ordering',()=>{
 const draft=structuredClone(defaultBuilder);
 draft.sections.reverse();draft.sections[0].titleFa='متن دلخواه';draft.sections[0].titleEn='Custom text';draft.sections[0].enabled=false;
 const data=normalizeBuilder(draft);
 assert.equal(data.sections[0].titleFa,'متن دلخواه');
 assert.equal(data.sections[0].titleEn,'Custom text');
 assert.equal(data.sections[0].enabled,false);
 assert.equal(data.sections[0].id,draft.sections[0].id);
 db.exec('SAVEPOINT layout_test');
 try{
  run('UPDATE settings SET value=? WHERE key=?',JSON.stringify(data),'siteBuilder');
  const persisted=JSON.parse(get('SELECT value FROM settings WHERE key=?','siteBuilder').value);
  assert.deepEqual(persisted.sections.map(s=>s.id),data.sections.map(s=>s.id));
 }finally{db.exec('ROLLBACK TO layout_test; RELEASE layout_test');}
});
test('unsafe external URLs and invalid colors are discarded',()=>{
 const draft=structuredClone(defaultBuilder);
 draft.sections[0].image='javascript:alert(1)';
 draft.sections[0].link='//evil.example/';
 draft.theme.gold='not-a-color';
 draft.sections[0].descriptionFa='<script>alert(1)</script>';
 const out=normalizeBuilder(draft);
 assert.equal(out.sections[0].image,'');
 assert.equal(out.sections[0].link,'/');
 assert.equal(out.theme.gold,defaultBuilder.theme.gold);
 assert.ok(out.sections[0].descriptionFa.includes('<script>'));// Plain React text, not interpreted as HTML.
});
test('unrecognized widgets and duplicate section IDs are rejected',()=>{
 const unknown=structuredClone(defaultBuilder);unknown.sections[0].type='javascript';
 assert.throws(()=>normalizeBuilder(unknown),/Invalid section/);
 const dup=structuredClone(defaultBuilder);dup.sections[1].id=dup.sections[0].id;
 assert.throws(()=>normalizeBuilder(dup),/Duplicate section/);
});
test('section limit prevents oversized layout submissions',()=>{
 const lots=structuredClone(defaultBuilder);lots.sections=Array.from({length:49},(_,i)=>({...defaultBuilder.sections[0],id:'s'+i}));
 assert.throws(()=>normalizeBuilder(lots),/Too many/);
});
