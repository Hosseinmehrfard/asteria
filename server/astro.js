import * as astro from 'astronomy-engine';
import jalaali from 'jalaali-js';
const names=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const namesFa=['حمل','ثور','جوزا','سرطان','اسد','سنبله','میزان','عقرب','قوس','جدی','دلو','حوت'];
const mod=(n,m)=>(n%m+m)%m;
function rad(d){return d*Math.PI/180;}
function deg(r){return r*180/Math.PI;}
const sign = longitude => ({index: Math.floor(mod(longitude,360)/30),nameEn:names[Math.floor(mod(longitude,360)/30)],nameFa:namesFa[Math.floor(mod(longitude,360)/30)],degree:Number(mod(longitude,30).toFixed(2))});
function validate(input){
 const name=String(input.name||'').trim().slice(0,100);
 let year=Number(input.year),month=Number(input.month),day=Number(input.day),hour=Number(input.hour),minute=Number(input.minute||0);
 const timezone=Number(input.timezone),latitude=Number(input.latitude),longitude=Number(input.longitude);
 if(input.calendar==='jalali'){
  if(!jalaali.isValidJalaaliDate(year,month,day))throw new Error('Invalid Jalali date');
  const g=jalaali.toGregorian(year,month,day);year=g.gy;month=g.gm;day=g.gd;
 }
 if(!Number.isInteger(year)||year<1600||year>2200||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(day)||day<1||day>31||!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw new Error('Invalid birth date or time');
 const local=new Date(Date.UTC(year,month-1,day,hour,minute));
 if(local.getUTCFullYear()!==year||local.getUTCMonth()!==month-1||local.getUTCDate()!==day)throw new Error('Invalid calendar date');
 if(!Number.isFinite(timezone)||timezone< -12||timezone>14||!Number.isFinite(latitude)||Math.abs(latitude)>66||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error('Invalid time zone or coordinates. Latitude must be within 66° of equator for this simple house model.');
 return {name,year,month,day,hour,minute,timezone,latitude,longitude,date:new Date(local.getTime()-timezone*3600000)};
}
export function calculateChart(input){
 const d=validate(input);
 const bodies=[['Sun',astro.Body.Sun],['Moon',astro.Body.Moon],['Mercury',astro.Body.Mercury],['Venus',astro.Body.Venus],['Mars',astro.Body.Mars],['Jupiter',astro.Body.Jupiter],['Saturn',astro.Body.Saturn],['Uranus',astro.Body.Uranus],['Neptune',astro.Body.Neptune],['Pluto',astro.Body.Pluto]];
 const planets=bodies.map(([name,body])=>{
  const longitude=name==='Sun'?astro.SunPosition(d.date).elon:name==='Moon'?astro.EclipticGeoMoon(d.date).lon:astro.Ecliptic(astro.GeoVector(body,d.date,true)).elon;
  return {name,longitude:Number(mod(longitude,360).toFixed(3)),sign:sign(longitude)};
 });
 // Equal-house astrology model: astronomical ecliptic longitudes; simplified ascending degree.
 const lst=mod(astro.SiderealTime(d.date)*15+d.longitude,360);
 const eps=23.439291;
 const asc=mod(deg(Math.atan2(-Math.cos(rad(lst)),Math.sin(rad(lst))*Math.cos(rad(eps))+Math.tan(rad(d.latitude))*Math.sin(rad(eps)))),360);
 for(const p of planets)p.house=Math.floor(mod(p.longitude-asc,360)/30)+1;
 const aspects=[];
 const types=[['Conjunction',0,8],['Sextile',60,5],['Square',90,6],['Trine',120,6],['Opposition',180,8]];
 for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){
  const angle=Math.abs(planets[i].longitude-planets[j].longitude),separation=Math.min(angle,360-angle);
  const candidate=types.map(([name,target,orb])=>({name,deviation:Math.abs(separation-target),orb})).sort((a,b)=>a.deviation-b.deviation)[0];
  if(candidate.deviation<=candidate.orb)aspects.push({a:planets[i].name,b:planets[j].name,name:candidate.name,orb:Number(candidate.deviation.toFixed(2))});
 }
 return {
  name:d.name,dateUTC:d.date.toISOString(),coordinates:{latitude:d.latitude,longitude:d.longitude},timezone:d.timezone,
  model:'Tropical zodiac; geocentric ecliptic longitudes; equal houses; simplified Ascendant.',
  ascendant:{longitude:Number(asc.toFixed(3)),sign:sign(asc)},
  planets,aspects,
  disclaimer:'Astronomical positions are calculated; astrological interpretations are not scientific predictions. Historical time zones must be supplied correctly.'
 };
}
export function moonCalendar(startDate=new Date(),days=30){
 const arr=[];
 for(let n=0;n<days;n++){
  const d=new Date(startDate);d.setUTCDate(d.getUTCDate()+n);d.setUTCHours(12,0,0,0);
  const angle=mod(astro.MoonPhase(d),360);
  const illumination=(1-Math.cos(rad(angle)))/2;
  arr.push({date:d.toISOString().slice(0,10),phase:Math.round(angle),illumination:Math.round(illumination*100),label:angle<45?'New / Waxing crescent':angle<135?'Waxing':angle<225?'Full / Waning gibbous':angle<315?'Waning':'New / Waning crescent'});
 }
 return arr;
}
