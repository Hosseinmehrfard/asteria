import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateChart,moonCalendar} from '../astro.js';
const sample={name:'Example',calendar:'gregorian',year:2000,month:1,day:1,hour:12,minute:0,latitude:35.68,longitude:51.4,timezone:3.5};
test('natal chart creates positions and timezone-correct date',()=>{
 const r=calculateChart(sample);
 assert.equal(r.planets.length,10);
 assert.equal(r.dateUTC,'2000-01-01T08:30:00.000Z');
 assert.ok(r.planets.every(p=>p.longitude>=0&&p.longitude<360&&p.house>=1&&p.house<=12));
 assert.ok(r.ascendant.longitude>=0&&r.ascendant.longitude<360);
 assert.ok(Array.isArray(r.aspects));
});
test('invalid date and invalid coordinates are rejected',()=>{
 assert.throws(()=>calculateChart({...sample,month:2,day:30}),/Invalid calendar date/);
 assert.throws(()=>calculateChart({...sample,latitude:87}),/Invalid time zone or coordinates/);
});
test('Persian and Gregorian calendar dates agree',()=>{
 const g=calculateChart({...sample,year:2021,month:3,day:21});
 const j=calculateChart({...sample,calendar:'jalali',year:1400,month:1,day:1});
 assert.equal(g.dateUTC,j.dateUTC);
});
test('lunar calendar generates daily phases',()=>{
 const rows=moonCalendar(new Date('2026-11-23T00:00:00Z'),7);
 assert.equal(rows.length,7);
 assert.equal(rows[0].date,'2026-11-23');
 assert.equal(rows[6].date,'2026-11-29');
 assert.ok(rows.every(r=>r.illumination>=0&&r.illumination<=100));
});
