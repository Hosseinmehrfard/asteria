import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {db,get,all,run,uid,audit} from './db.js';
import {calculateChart,moonCalendar} from './astro.js';
import {normalizeVideo} from './video.js';
import {defaultBuilder,normalizeBuilder} from './site-builder.js';

const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
const publicUploads=path.join(__dirname,'uploads','public');
const privateUploads=path.join(__dirname,'uploads','private');
for(const dir of [publicUploads,privateUploads])fs.mkdirSync(dir,{recursive:true});
app.disable('x-powered-by');
if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
app.use((req,res,next)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 next();
});
app.use(express.json({limit:'250kb'}));
app.use('/api',(req,res,next)=>{if(req.body==null)req.body={};next();});
const APP_ORIGIN=process.env.APP_ORIGIN||'http://localhost:5173';
app.use('/api',(req,res,next)=>{
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
  const origin=req.headers.origin;
  if(origin){
   let allowed=[];
   try{allowed=[new URL(APP_ORIGIN).origin,`${req.protocol}://${req.get('host')}`];}catch{}
   if(!allowed.includes(origin))return res.status(403).json({error:'Origin not allowed'});
  }
 }
 next();
});
function asyncHandler(fn){return (req,res,next)=>Promise.resolve().then(()=>fn(req,res,next)).catch(next);}
const error=(res,status,message)=>res.status(status).json({error:message});
const str=(val,max=2000)=>typeof val==='string'?val.trim().slice(0,max):'';
const emailValid=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=254;
const parseJSON=(v,fallback={})=>{try{return JSON.parse(v||'null')??fallback;}catch{return fallback;}};
const userPublic=u=>u?({id:u.id,email:u.email,name:u.name,role:u.role,status:u.status,created_at:u.created_at}):null;
function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync(password,salt,64).toString('hex');return `${salt}:${hash}`;}
function verifyPassword(pass,stored){try{const [salt,hash]=stored.split(':');const actual=crypto.scryptSync(pass,salt,64);return crypto.timingSafeEqual(Buffer.from(hash,'hex'),actual);}catch{return false;}}
const tokenHash=token=>crypto.createHash('sha256').update(token).digest('hex');
function cookies(req){const out={};for(const entry of String(req.headers.cookie||'').split(';')){const i=entry.indexOf('=');if(i<1)continue;try{out[decodeURIComponent(entry.slice(0,i).trim())]=decodeURIComponent(entry.slice(i+1).trim());}catch{}}return out;}
function setCookie(res,token,age){const isSecure=process.env.NODE_ENV==='production';res.setHeader('Set-Cookie',`asteria_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${age}${isSecure?'; Secure':''}`);}
app.use((req,res,next)=>{
 const token=cookies(req).asteria_session;
 if(token){const row=get(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > datetime('now')`,tokenHash(token));if(row&&row.status==='active')req.user=row;}
 next();
});
const auth=(req,res,next)=>req.user?next():error(res,401,'Sign in required');
const role=(...roles)=>(req,res,next)=>req.user&&roles.includes(req.user.role)?next():error(res,403,'Insufficient permissions');
const editor=role('admin','editor');
const staff=role('admin','editor','support');
const admin=role('admin');
const rateLimit=new Map();
function throttle(req,res,next){
 const ip=String(req.ip||req.socket.remoteAddress),key=`${ip}:${req.path}`;
 const now=Date.now(),recent=(rateLimit.get(key)||[]).filter(t=>now-t<10*60*1000);
 if(recent.length>=25)return error(res,429,'Too many requests. Try again later.');
 recent.push(now);rateLimit.set(key,recent);
 if(rateLimit.size>2000){for(const [k,v] of rateLimit){if(!v.some(t=>now-t<600000))rateLimit.delete(k);}}
 next();
}
const kinds=['article','product','course','service','page','faq','testimonial','banner'];
function contentOutput(row){if(!row)return row;return {...row,extra:parseJSON(row.extra)};}
function publicContentOutput(row){const item=contentOutput(row);if(item?.kind==='course'&&item.extra?.videoPreview!==true)delete item.extra.videoUrl;return item;}
function settings(){return Object.fromEntries(all('SELECT key,value FROM settings').map(({key,value})=>[key,parseJSON(value,null)]));}
app.get('/api/health',(req,res)=>res.json({service:'asteria',status:'ok',version:'1.3.0'}));
app.get('/api/public/settings',(req,res)=>res.json(settings()));
app.get('/api/public/site-builder',(req,res)=>res.json(settings().siteBuilder||defaultBuilder));
// The installed app name, description and accent color track admin-managed branding.
app.get('/manifest.webmanifest',(req,res)=>{
 const b=settings().siteBuilder||defaultBuilder;
 const fa=b.brand?.logoTextFa||'آستریا',en=b.brand?.logoTextEn||'Asteria';
 const icons=[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}];
 const icon=b.brand?.favicon||b.brand?.logo;
 if(icon&&/^\/uploads\/[a-f0-9]{40}\.(png|webp)$/i.test(icon))icons.unshift({src:icon,sizes:'any',type:icon.endsWith('.webp')?'image/webp':'image/png',purpose:'any'});
 res.setHeader('Cache-Control','no-store');res.type('application/manifest+json').json({id:'/',name:`${fa} · ${en}`,short_name:fa,description:b.footer?.descriptionFa||'',lang:'fa',dir:'rtl',start_url:'/',scope:'/',display:'standalone',orientation:'any',background_color:b.theme?.cream||'#fcfaf6',theme_color:b.theme?.navy||'#081c27',icons});
});

app.get('/api/content',(req,res)=>{
 const kind=str(req.query.kind,30),category=str(req.query.category,80),q=str(req.query.q,100);
 if(kind&&!kinds.includes(kind))return error(res,400,'Invalid content kind');
 const page=Math.max(1,Math.min(10000,Number(req.query.page)||1)),limit=Math.max(1,Math.min(60,Number(req.query.limit)||12));
 let where="WHERE status='published'",params=[];
 if(kind){where+=' AND kind=?';params.push(kind);}
 if(category){where+=' AND category=?';params.push(category);}
 if(q){where+=' AND (title_fa LIKE ? OR title_en LIKE ? OR summary_fa LIKE ? OR summary_en LIKE ?)';params.push(...Array(4).fill(`%${q}%`));}
 const total=get(`SELECT COUNT(*) AS n FROM content ${where}`,...params).n;
 const items=all(`SELECT * FROM content ${where} ORDER BY sort_order ASC,created_at DESC LIMIT ? OFFSET ?`,...params,limit,(page-1)*limit).map(publicContentOutput);
 res.json({items,total,page,pages:Math.ceil(total/limit)});
});
app.get('/api/content/:slug',(req,res)=>{
 const row=get("SELECT * FROM content WHERE slug=? AND status='published'",req.params.slug);
 row?res.json(publicContentOutput(row)):error(res,404,'Content not found');
});
app.get('/api/moon',(req,res)=>res.json({items:moonCalendar(new Date(),30)}));
app.post('/api/chart',throttle,(req,res)=>{
 try{
  const result=calculateChart(req.body||{});
  if(req.body.save){if(!req.user)return error(res,401,'Sign in to save a chart');
   const id=uid();run('INSERT INTO charts(id,user_id,name,birth_date,birth_time,timezone,latitude,longitude,result) VALUES(?,?,?,?,?,?,?,?,?)',id,req.user.id,str(req.body.name,100)||'Birth chart',`${req.body.year}-${req.body.month}-${req.body.day}`,`${req.body.hour}:${req.body.minute||0}`,Number(req.body.timezone),Number(req.body.latitude),Number(req.body.longitude),JSON.stringify(result));result.savedId=id;
  }
  res.json(result);
 }catch(e){error(res,400,e.message);}
});
app.get('/api/auth/me',(req,res)=>res.json({user:userPublic(req.user)}));
app.post('/api/auth/register',throttle,(req,res)=>{
 if(settings().allowRegistration===false)return error(res,403,'Registration is disabled');
 const name=str(req.body.name,100),email=str(req.body.email,254).toLowerCase(),password=req.body.password||'';
 if(!name||!emailValid(email)||typeof password!=='string'||password.length<12||password.length>128)return error(res,400,'Name, valid email and password of at least 12 characters required');
 if(get('SELECT id FROM users WHERE email=?',email))return error(res,409,'Email already registered');
 const id=uid();run('INSERT INTO users(id,email,name,password_hash) VALUES(?,?,?,?)',id,email,name,hashPassword(password));
 loginWithId(res,id);audit({id},'register','user');res.status(201).json({user:userPublic(get('SELECT * FROM users WHERE id=?',id))});
});
function loginWithId(res,id){const token=crypto.randomBytes(32).toString('hex');const expire=new Date(Date.now()+14*86400000).toISOString().slice(0,19).replace('T',' ');run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',tokenHash(token),id,expire);setCookie(res,token,14*86400);}
app.post('/api/auth/login',throttle,(req,res)=>{
 const email=str(req.body.email,254).toLowerCase(),password=req.body.password;
 if(typeof password!=='string')return error(res,400,'Invalid credentials');
 const u=get('SELECT * FROM users WHERE email=?',email);
 if(!u||u.status!=='active'||!verifyPassword(password,u.password_hash))return error(res,401,'Invalid credentials');
 loginWithId(res,u.id);audit(u,'login','auth');res.json({user:userPublic(u)});
});
app.post('/api/auth/logout',(req,res)=>{
 const token=cookies(req).asteria_session;
 if(token)run('DELETE FROM sessions WHERE token_hash=?',tokenHash(token));
 setCookie(res,'',0);res.json({ok:true});
});
app.patch('/api/account/profile',auth,(req,res)=>{
 const name=str(req.body.name,100);if(!name)return error(res,400,'Name is required');
 run('UPDATE users SET name=? WHERE id=?',name,req.user.id);res.json({user:userPublic(get('SELECT * FROM users WHERE id=?',req.user.id))});
});
app.patch('/api/account/password',auth,(req,res)=>{
 const {oldPassword,newPassword}=req.body;
 if(!verifyPassword(oldPassword||'',req.user.password_hash)||typeof newPassword!=='string'||newPassword.length<12||newPassword.length>128)return error(res,400,'Invalid current password or new password too short');
 run('UPDATE users SET password_hash=? WHERE id=?',hashPassword(newPassword),req.user.id);
 run('DELETE FROM sessions WHERE user_id=?',req.user.id);setCookie(res,'',0);audit(req.user,'change_password','auth');res.json({ok:true});
});
app.get('/api/account/orders',auth,(req,res)=>res.json({items:all('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC',req.user.id).map(r=>({...r,items:parseJSON(r.items,[])}))}));
app.get('/api/account/bookings',auth,(req,res)=>res.json({items:all('SELECT * FROM bookings WHERE user_id=? ORDER BY created_at DESC',req.user.id)}));
app.get('/api/account/charts',auth,(req,res)=>res.json({items:all('SELECT * FROM charts WHERE user_id=? ORDER BY created_at DESC',req.user.id).map(r=>({...r,result:parseJSON(r.result)}))}));
app.delete('/api/account/charts/:id',auth,(req,res)=>{
 const r=run('DELETE FROM charts WHERE id=? AND user_id=?',req.params.id,req.user.id);r.changes?res.json({ok:true}):error(res,404,'Chart not found');
});
app.post('/api/messages',throttle,(req,res)=>{
 if(req.body.website)return res.json({ok:true});
 const name=str(req.body.name,100),email=str(req.body.email,254),subject=str(req.body.subject,150),body=str(req.body.body,3000);
 if(!name||!emailValid(email)||!subject||body.length<8)return error(res,400,'Please complete all fields');
 run('INSERT INTO messages(id,name,email,subject,body) VALUES(?,?,?,?,?)',uid(),name,email,subject,body);res.status(201).json({ok:true});
});
app.post('/api/newsletter',throttle,(req,res)=>{
 const email=str(req.body.email,254).toLowerCase();if(!emailValid(email))return error(res,400,'Invalid email');
 run('INSERT OR IGNORE INTO newsletter(email) VALUES(?)',email);res.json({ok:true});
});
app.post('/api/bookings',throttle,(req,res)=>{
 const service=get("SELECT * FROM content WHERE id=? AND kind='service' AND status='published'",str(req.body.serviceId,100));
 const name=str(req.body.name,100),email=str(req.body.email,254),phone=str(req.body.phone,30),desired=str(req.body.desiredDate,40),note=str(req.body.note,1500);
 if(!service||!name||!emailValid(email)||!/^\d{4}-\d\d-\d\d/.test(desired)||Number.isNaN(Date.parse(desired))||new Date(desired)<new Date(Date.now()-86400000))return error(res,400,'Invalid booking details');
 const id=uid();run('INSERT INTO bookings(id,service_id,user_id,name,email,phone,desired_date,note) VALUES(?,?,?,?,?,?,?,?)',id,service.id,req.user?.id||null,name,email,phone,desired,note);
 res.status(201).json({id,status:'pending'});
});
function prices(items){
 if(!Array.isArray(items)||items.length<1||items.length>30)throw new Error('Invalid cart');
 let subtotal=0,physical=false;
 const stored=items.map(item=>{
  const quantity=Number(item.quantity);
  if(!Number.isInteger(quantity)||quantity<1||quantity>20)throw new Error('Invalid quantity');
  const c=get("SELECT * FROM content WHERE id=? AND status='published' AND kind IN ('product','course')",str(item.id,100));
  if(!c)throw new Error('Product unavailable');
  if(c.stock>=0&&c.stock<quantity)throw new Error('Insufficient stock');
  const price=c.sale_price>0?c.sale_price:c.price;
  if(!Number.isSafeInteger(price)||price<0)throw new Error('Invalid price');
  const line=price*quantity;if(!Number.isSafeInteger(line))throw new Error('Invalid total');
  subtotal+=line;if(!Number.isSafeInteger(subtotal)||subtotal>2e12)throw new Error('Cart too large');
  if(c.kind==='product'&&parseJSON(c.extra).type==='physical')physical=true;
  return {id:c.id,titleFa:c.title_fa,titleEn:c.title_en,price,quantity,kind:c.kind};
 });return {stored,subtotal,physical};
}
function couponDiscount(code,subtotal){
 if(!code)return 0;
 const c=get('SELECT * FROM coupons WHERE code=?',code.toUpperCase());
 if(!c||!c.active||(c.expires_at&&c.expires_at<new Date().toISOString().slice(0,10))||c.min_total>subtotal||(c.max_uses>0&&c.used_count>=c.max_uses))throw new Error('Coupon invalid or expired');
 return Math.min(subtotal,c.kind==='percent'?Math.floor(subtotal*c.value/100):c.value);
}
app.post('/api/orders',throttle,(req,res)=>{
 const name=str(req.body.name,100),email=str(req.body.email,254),phone=str(req.body.phone,30),address=str(req.body.address,500),coupon=str(req.body.coupon,40).toUpperCase(),note=str(req.body.note,700);
 if(!name||!emailValid(email))return error(res,400,'Name and email required');
 try{
  const {stored,subtotal,physical}=prices(req.body.items);
  const needsAccount=stored.some(item=>item.kind==='course'||(item.kind==='product'&&parseJSON(get('SELECT extra FROM content WHERE id=?',item.id)?.extra).type!=='physical'));
  if(needsAccount&&!req.user)return error(res,401,'Sign in before purchasing digital products or courses');
  if(physical&&!address)return error(res,400,'Shipping address required');
  const discount=couponDiscount(coupon,subtotal),total=subtotal-discount,id=uid();
  run('INSERT INTO orders(id,user_id,name,email,phone,address,items,subtotal,discount,total,coupon,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,req.user?.id||null,name,email,phone,address,JSON.stringify(stored),subtotal,discount,total,coupon,note);
  res.status(201).json({id,status:'awaiting_payment',total,message:'Order created. Awaiting payment confirmation; no payment gateway is connected.'});
 }catch(e){error(res,400,e.message);}
});
function contentPayload(body){
 const kind=str(body.kind,30);if(!kinds.includes(kind))throw new Error('Invalid content kind');
 const slug=str(body.slug,150).toLowerCase();if(!/^[a-z0-9][a-z0-9-]{1,149}$/.test(slug))throw new Error('Slug requires Latin letters, digits or hyphens');
 const status=['draft','published','archived'].includes(body.status)?body.status:'draft';
 const price=Number(body.price||0),sale=Number(body.sale_price||0),stock=body.stock==null||body.stock===''?-1:Number(body.stock),sort=Number(body.sort_order||0);
 if(![price,sale,stock,sort].every(Number.isSafeInteger)||price<0||sale<0||(sale>0&&sale>price)||stock< -1)throw new Error('Invalid pricing, stock or sort order');
 const extra=body.extra&&typeof body.extra==='object'&&!Array.isArray(body.extra)?body.extra:{};
 if(JSON.stringify(extra).length>5000)throw new Error('Extra metadata too large');
 const data={kind,slug,status,price,sale_price:sale,stock,sort_order:sort,extra:JSON.stringify(extra)};
 for(const key of ['title_fa','title_en','summary_fa','summary_en','body_fa','body_en','image','category'])data[key]=str(body[key],key.startsWith('body')?30000: key==='image'?500:1500);
 if(!data.title_fa&&!data.title_en)throw new Error('Title required');
 return data;
}
app.get('/api/admin/stats',auth,staff,(req,res)=>{
 const counts=Object.fromEntries(kinds.map(k=>[k,get('SELECT COUNT(*) n FROM content WHERE kind=?',k).n]));
 const sums=get("SELECT COUNT(*) orders,COALESCE(SUM(CASE WHEN status IN ('paid','processing','completed') THEN total ELSE 0 END),0) revenue FROM orders");
 const recent=all('SELECT id,name,email,total,status,created_at FROM orders ORDER BY created_at DESC LIMIT 8');
 const monthly=all("SELECT substr(created_at,1,7) AS month,SUM(total) AS revenue FROM orders WHERE status IN ('paid','processing','completed') GROUP BY substr(created_at,1,7) ORDER BY month DESC LIMIT 8").reverse();
 res.json({monthly,counts,orders:sums.orders,revenue:sums.revenue,users:get('SELECT COUNT(*) n FROM users').n,bookings:get("SELECT COUNT(*) n FROM bookings WHERE status='pending'").n,messages:get("SELECT COUNT(*) n FROM messages WHERE status='unread'").n,newsletter:get('SELECT COUNT(*) n FROM newsletter').n,recent});
});
app.get('/api/admin/content',auth,staff,(req,res)=>{
 const kind=str(req.query.kind,30);if(kind&&!kinds.includes(kind))return error(res,400,'Invalid kind');
 const rows=kind?all('SELECT * FROM content WHERE kind=? ORDER BY updated_at DESC',kind):all('SELECT * FROM content ORDER BY updated_at DESC');
 res.json({items:rows.map(contentOutput)});
});
app.post('/api/admin/content',auth,editor,(req,res)=>{
 try{
  const data=contentPayload(req.body),id=uid(),keys=Object.keys(data);
  run(`INSERT INTO content(id,${keys.join(',')}) VALUES(${Array(keys.length+1).fill('?').join(',')})`,id,...keys.map(k=>data[k]));
  audit(req.user,'content.create',id,{kind:data.kind});res.status(201).json(contentOutput(get('SELECT * FROM content WHERE id=?',id)));
 }catch(e){error(res,e.message.includes('UNIQUE')?409:400,e.message);}
});
app.patch('/api/admin/content/:id',auth,editor,(req,res)=>{
 const old=get('SELECT * FROM content WHERE id=?',req.params.id);if(!old)return error(res,404,'Not found');
 try{
  const data=contentPayload({...old,...req.body}),keys=Object.keys(data);
  run(`UPDATE content SET ${keys.map(k=>`${k}=?`).join(',')},updated_at=datetime('now') WHERE id=?`,...keys.map(k=>data[k]),req.params.id);
  audit(req.user,'content.update',req.params.id,{kind:data.kind});res.json(contentOutput(get('SELECT * FROM content WHERE id=?',req.params.id)));
 }catch(e){error(res,e.message.includes('UNIQUE')?409:400,e.message);}
});
app.delete('/api/admin/content/:id',auth,editor,(req,res)=>{
 const old=get('SELECT * FROM content WHERE id=?',req.params.id);if(!old)return error(res,404,'Not found');
 // Existing orders retain immutable purchased item snapshots. Bookings retain independent records.
 run('DELETE FROM content WHERE id=?',req.params.id);audit(req.user,'content.delete',req.params.id,{kind:old.kind});res.json({ok:true});
});
app.get('/api/admin/orders',auth,staff,(req,res)=>res.json({items:all('SELECT * FROM orders ORDER BY created_at DESC').map(r=>({...r,items:parseJSON(r.items,[])}))}));
const allowedTransitions={awaiting_payment:['paid','cancelled'],paid:['processing','completed','refunded'],processing:['completed','refunded'],completed:['refunded'],cancelled:[],refunded:[]};
app.patch('/api/admin/orders/:id',auth,role('admin','support'),(req,res)=>{
 const next=str(req.body.status,30);const old=get('SELECT * FROM orders WHERE id=?',req.params.id);
 if(!old)return error(res,404,'Order not found');
 if(!allowedTransitions[old.status]?.includes(next))return error(res,400,'Invalid order status transition');
 try{
  db.exec('BEGIN IMMEDIATE');
  const items=parseJSON(old.items,[]);
  if(next==='paid'){
   if(old.coupon){const c=get('SELECT * FROM coupons WHERE code=?',old.coupon);if(!c||!c.active||(c.max_uses>0&&c.used_count>=c.max_uses))throw new Error('Coupon usage limit reached');run('UPDATE coupons SET used_count=used_count+1 WHERE code=?',old.coupon);}
   for(const item of items){const p=get('SELECT stock FROM content WHERE id=?',item.id);if(p&&p.stock>=0){if(p.stock<item.quantity)throw new Error('Insufficient stock: '+item.titleEn);run('UPDATE content SET stock=stock-? WHERE id=?',item.quantity,item.id);}}
  }
  if(next==='refunded'){
   if(old.coupon)run('UPDATE coupons SET used_count=MAX(0,used_count-1) WHERE code=?',old.coupon);
   for(const item of items)run('UPDATE content SET stock=stock+? WHERE id=? AND stock>=0',item.quantity,item.id);
  }
  run("UPDATE orders SET status=?,updated_at=datetime('now') WHERE id=?",next,old.id);
  audit(req.user,'order.status',old.id,{from:old.status,to:next});db.exec('COMMIT');res.json({ok:true,status:next});
 }catch(e){db.exec('ROLLBACK');error(res,400,e.message);}
});
app.get('/api/admin/bookings',auth,staff,(req,res)=>res.json({items:all('SELECT b.*,c.title_fa service_title FROM bookings b LEFT JOIN content c ON c.id=b.service_id ORDER BY b.created_at DESC')}));
app.patch('/api/admin/bookings/:id',auth,staff,(req,res)=>{
 const status=str(req.body.status,30);if(!['pending','confirmed','completed','cancelled'].includes(status))return error(res,400,'Invalid status');
 const r=run('UPDATE bookings SET status=? WHERE id=?',status,req.params.id);if(!r.changes)return error(res,404,'Not found');audit(req.user,'booking.status',req.params.id,{status});res.json({ok:true});
});
app.get('/api/admin/messages',auth,staff,(req,res)=>res.json({items:all('SELECT * FROM messages ORDER BY created_at DESC')}));
app.patch('/api/admin/messages/:id',auth,staff,(req,res)=>{
 const status=str(req.body.status,30);if(!['read','unread','resolved'].includes(status))return error(res,400,'Invalid status');
 const r=run('UPDATE messages SET status=? WHERE id=?',status,req.params.id);if(!r.changes)return error(res,404,'Not found');audit(req.user,'message.status',req.params.id,{status});res.json({ok:true});
});
app.get('/api/admin/users',auth,admin,(req,res)=>res.json({items:all('SELECT id,email,name,role,status,created_at FROM users ORDER BY created_at DESC')}));
app.patch('/api/admin/users/:id',auth,admin,(req,res)=>{
 const target=get('SELECT * FROM users WHERE id=?',req.params.id);if(!target)return error(res,404,'User not found');
 const newRole=str(req.body.role,30)||target.role,newStatus=str(req.body.status,30)||target.status;
 if(!['admin','editor','support','customer'].includes(newRole)||!['active','blocked'].includes(newStatus))return error(res,400,'Invalid user role/status');
 if(target.id===req.user.id&&(newRole!=='admin'||newStatus!=='active'))return error(res,400,'Cannot disable or demote current admin');
 if(target.role==='admin'&&(newRole!=='admin'||newStatus==='blocked')&&get("SELECT COUNT(*) n FROM users WHERE role='admin' AND status='active'").n<2)return error(res,400,'Cannot remove the last active administrator');
 run('UPDATE users SET role=?,status=? WHERE id=?',newRole,newStatus,target.id);
 if(newStatus==='blocked')run('DELETE FROM sessions WHERE user_id=?',target.id);
 audit(req.user,'user.update',target.id,{role:newRole,status:newStatus});res.json({ok:true});
});
app.get('/api/admin/coupons',auth,staff,(req,res)=>res.json({items:all('SELECT * FROM coupons ORDER BY created_at DESC')}));
app.post('/api/admin/coupons',auth,editor,(req,res)=>{
 const code=str(req.body.code,40).toUpperCase(),kind=str(req.body.kind,10),value=Number(req.body.value),min=Number(req.body.min_total||0),max=Number(req.body.max_uses||0),expires=str(req.body.expires_at,40)||null;
 if(!/^[A-Z0-9_-]{3,40}$/.test(code)||!['percent','fixed'].includes(kind)||!Number.isSafeInteger(value)||value<=0||(kind==='percent'&&value>100)||![min,max].every(v=>Number.isSafeInteger(v)&&v>=0)||(expires&&!/^\d{4}-\d\d-\d\d$/.test(expires)))return error(res,400,'Invalid coupon');
 try{run('INSERT INTO coupons(code,kind,value,min_total,max_uses,expires_at) VALUES(?,?,?,?,?,?)',code,kind,value,min,max,expires);audit(req.user,'coupon.create',code);res.status(201).json({ok:true});}catch(e){error(res,409,'Coupon exists');}
});
app.patch('/api/admin/coupons/:code',auth,editor,(req,res)=>{
 const c=get('SELECT * FROM coupons WHERE code=?',req.params.code);if(!c)return error(res,404,'Not found');
 const next={...c,...req.body};
 if(!['fixed','percent'].includes(next.kind)||!Number.isSafeInteger(Number(next.value))||Number(next.value)<=0||(next.kind==='percent'&&Number(next.value)>100)||!Number.isSafeInteger(Number(next.min_total))||Number(next.min_total)<0||!Number.isSafeInteger(Number(next.max_uses))||Number(next.max_uses)<0)return error(res,400,'Invalid coupon');
 run('UPDATE coupons SET kind=?,value=?,min_total=?,max_uses=?,expires_at=?,active=? WHERE code=?',next.kind,Number(next.value),Number(next.min_total),Number(next.max_uses),next.expires_at||null,next.active?1:0,c.code);
 audit(req.user,'coupon.update',c.code);res.json({ok:true});
});
app.delete('/api/admin/coupons/:code',auth,editor,(req,res)=>{
 run('DELETE FROM coupons WHERE code=?',req.params.code);audit(req.user,'coupon.delete',req.params.code);res.json({ok:true});
});
app.get('/api/admin/newsletter',auth,staff,(req,res)=>res.json({items:all('SELECT * FROM newsletter ORDER BY created_at DESC')}));
app.delete('/api/admin/newsletter/:email',auth,staff,(req,res)=>{
 run('DELETE FROM newsletter WHERE email=?',req.params.email);audit(req.user,'newsletter.delete',req.params.email);res.json({ok:true});
});
app.get('/api/admin/charts',auth,admin,(req,res)=>res.json({items:all('SELECT c.id,c.name,c.birth_date,c.created_at,u.email FROM charts c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 100')}));
app.get('/api/admin/settings',auth,staff,(req,res)=>res.json(settings()));
app.patch('/api/admin/settings',auth,admin,(req,res)=>{
 const defaults=settings();let changed=[];
 for(const [key,v] of Object.entries(req.body||{})){
  if(key==='siteBuilder'||!(key in defaults)||!['string','boolean','number'].includes(typeof v)||JSON.stringify(v).length>3000)continue;
  run('UPDATE settings SET value=? WHERE key=?',JSON.stringify(v),key);changed.push(key);
 }
 audit(req.user,'settings.update','site',{keys:changed});res.json(settings());
});
// Dedicated layout endpoint: admin-only writes, bounded JSON, audit trail, SQLite persistence.
app.get('/api/admin/site-builder',auth,staff,(req,res)=>res.json(settings().siteBuilder||defaultBuilder));
app.put('/api/admin/site-builder',auth,admin,(req,res)=>{
 try{
  const data=normalizeBuilder(req.body);
  if(JSON.stringify(data).length>110000)return error(res,413,'Layout payload too large');
  run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','siteBuilder',JSON.stringify(data));
  audit(req.user,'site-builder.update','homepage',{sections:data.sections.length});
  res.json(data);
 }catch(e){error(res,400,e.message);}
});
const storage=multer.diskStorage({destination(req,file,cb){cb(null,req.query.private==='1'?privateUploads:publicUploads);},filename(req,file,cb){cb(null,crypto.randomBytes(20).toString('hex')+path.extname(file.originalname).toLowerCase());}});
const upload=multer({storage,limits:{fileSize:Math.min(500,Math.max(1,Number(process.env.MAX_UPLOAD_MB||100)))*1024*1024},fileFilter(req,file,cb){
 const priv=req.query.private==='1';const ext=path.extname(file.originalname).toLowerCase();
 const allow=priv?['.pdf','.zip','.epub','.mp3','.mp4','.webm']:['.png','.jpg','.jpeg','.webp','.gif','.mp4','.webm'];
 const mimetypes=priv?['application/pdf','application/zip','application/x-zip-compressed','application/epub+zip','audio/mpeg','video/mp4','video/webm','application/octet-stream']:['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'];
 if(!allow.includes(ext)||!mimetypes.includes(file.mimetype))return cb(new Error('Unsupported file type'));
 const mediaTypes={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm'};
 if(!priv&&mediaTypes[ext]!==file.mimetype)return cb(new Error('File extension and MIME do not match'));
 cb(null,true);
 }});
app.use('/uploads',express.static(publicUploads,{index:false,dotfiles:'deny',setHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'none'; sandbox");}}));
app.post('/api/admin/files',auth,editor,upload.single('file'),(req,res)=>{
 if(!req.file)return error(res,400,'File required');
 const id=uid(),priv=req.query.private==='1';
 run('INSERT INTO files(id,original_name,stored_name,mime,size,is_private) VALUES(?,?,?,?,?,?)',id,str(req.file.originalname,255),req.file.filename,req.file.mimetype,req.file.size,priv?1:0);
 audit(req.user,'file.upload',id,{private:priv});res.status(201).json({id,private:priv,url:priv?null:`/uploads/${req.file.filename}`});
});
app.get('/api/admin/files',auth,staff,(req,res)=>res.json({items:all('SELECT * FROM files ORDER BY created_at DESC').map(f=>({...f,url:f.is_private?null:`/uploads/${f.stored_name}`}))}));
app.delete('/api/admin/files/:id',auth,admin,(req,res)=>{
 const f=get('SELECT * FROM files WHERE id=?',req.params.id);if(!f)return error(res,404,'Not found');
 const dir=f.is_private?privateUploads:publicUploads;fs.rmSync(path.join(dir,f.stored_name),{force:true});run('DELETE FROM files WHERE id=?',f.id);
 audit(req.user,'file.delete',f.id);res.json({ok:true});
});
// Dedicated reusable embedded-video catalog. The API never accepts raw iframe HTML.
app.get('/api/videos',(req,res)=>res.json({items:all("SELECT id,title_fa,title_en,description_fa,description_en,source_url,embed_url,provider,thumbnail FROM videos WHERE status='published' ORDER BY sort_order,created_at DESC LIMIT 150")}));
app.get('/api/admin/videos',auth,staff,(req,res)=>res.json({items:all('SELECT * FROM videos ORDER BY created_at DESC')}));
const readVideoInput=(body,old={})=>{
 const titleFa=str(body.title_fa??old.title_fa,180),titleEn=str(body.title_en??old.title_en,180);
 const descriptionFa=str(body.description_fa??old.description_fa,4000),descriptionEn=str(body.description_en??old.description_en,4000);
 const source=str(body.source_url??old.source_url,1200),thumbnail=str(body.thumbnail??old.thumbnail,500);
 const status=str(body.status??old.status??'draft',20),sort=Number(body.sort_order??old.sort_order??0);
 const info=normalizeVideo(source);
 if(info?.provider==='file'&&!get('SELECT id FROM files WHERE stored_name=? AND is_private=0 AND mime IN (\'video/mp4\',\'video/webm\')',path.basename(source)))return null;
 if(!titleFa||!titleEn||!info||!['draft','published'].includes(status)||!Number.isSafeInteger(sort))return null;
 if(thumbnail && !(thumbnail.startsWith('/uploads/') || /^https:\/\/(?:images\.unsplash\.com|i\.ytimg\.com)\//.test(thumbnail)))return null;
 return {titleFa,titleEn,descriptionFa,descriptionEn,...info,thumbnail,status,sort};
};
app.post('/api/admin/videos',auth,editor,(req,res)=>{
 const v=readVideoInput(req.body);if(!v)return error(res,400,'Invalid video data or unsupported URL');
 const id=uid();run(`INSERT INTO videos(id,title_fa,title_en,description_fa,description_en,source_url,embed_url,provider,thumbnail,status,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,id,v.titleFa,v.titleEn,v.descriptionFa,v.descriptionEn,v.source_url,v.embed_url,v.provider,v.thumbnail,v.status,v.sort);
 audit(req.user,'video.create',id);res.status(201).json({id});
});
app.patch('/api/admin/videos/:id',auth,editor,(req,res)=>{
 const old=get('SELECT * FROM videos WHERE id=?',req.params.id);if(!old)return error(res,404,'Video not found');
 const v=readVideoInput(req.body,old);if(!v)return error(res,400,'Invalid video data or unsupported URL');
 run(`UPDATE videos SET title_fa=?,title_en=?,description_fa=?,description_en=?,source_url=?,embed_url=?,provider=?,thumbnail=?,status=?,sort_order=?,updated_at=datetime('now') WHERE id=?`,v.titleFa,v.titleEn,v.descriptionFa,v.descriptionEn,v.source_url,v.embed_url,v.provider,v.thumbnail,v.status,v.sort,old.id);
 audit(req.user,'video.update',old.id);res.json({ok:true});
});
app.delete('/api/admin/videos/:id',auth,admin,(req,res)=>{
 const n=run('DELETE FROM videos WHERE id=?',req.params.id);if(!n.changes)return error(res,404,'Video not found');audit(req.user,'video.delete',req.params.id);res.json({ok:true});
});
app.get('/api/account/download/:id',auth,(req,res)=>{
 const p=get("SELECT * FROM content WHERE id=? AND kind IN ('product','course')",req.params.id);if(!p)return error(res,404,'Product not found');
 const fileId=parseJSON(p.extra).fileId,file=get('SELECT * FROM files WHERE id=? AND is_private=1',fileId||'');
 if(!file)return error(res,404,'No downloadable file is configured');
 const paid=all("SELECT items FROM orders WHERE user_id=? AND status IN ('paid','processing','completed')",req.user.id)
  .some(o=>parseJSON(o.items,[]).some(i=>i.id===p.id));
 if(!paid)return error(res,403,'Paid order required');
 res.setHeader('Cache-Control','private, no-store');res.download(path.join(privateUploads,file.stored_name),file.original_name);
});
app.get('/api/admin/audit',auth,admin,(req,res)=>res.json({items:all('SELECT a.*,u.email FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 250').map(a=>({...a,details:parseJSON(a.details)}))}));
app.get('/api/admin/export',auth,admin,(req,res)=>{
 const tables=['content','categories','lessons','videos','orders','coupons','bookings','messages','newsletter','files','charts','settings','audit'];
 const data={generatedAt:new Date().toISOString(),notice:'Data export (not a restorable database backup). Keep private.',users:all('SELECT id,email,name,role,status,created_at FROM users'),tables:Object.fromEntries(tables.map(t=>[t,all(`SELECT * FROM ${t}`)]))};
 audit(req.user,'data.export','database');res.setHeader('Content-Disposition','attachment; filename="asteria-export.json"');res.setHeader('Cache-Control','no-store');res.json(data);
});
// Categories are reusable across public filters and all content editors.
app.get('/api/categories',(req,res)=>{
 const kind=str(req.query.kind,30);if(kind&&!kinds.includes(kind))return error(res,400,'Invalid category kind');
 res.json({items:kind?all('SELECT * FROM categories WHERE kind=? ORDER BY sort_order,slug',kind):all('SELECT * FROM categories ORDER BY kind,sort_order,slug')});
});
app.get('/api/admin/categories',auth,staff,(req,res)=>res.json({items:all('SELECT * FROM categories ORDER BY kind,sort_order,slug')}));
app.post('/api/admin/categories',auth,editor,(req,res)=>{
 const kind=str(req.body.kind,30),slug=str(req.body.slug,90),fa=str(req.body.title_fa,100),en=str(req.body.title_en,100),sort=Number(req.body.sort_order||0);
 if(!kinds.includes(kind)||!['article','product','course','service'].includes(kind)||!/^[a-z0-9][a-z0-9-]*$/.test(slug)||!fa||!en||!Number.isSafeInteger(sort))return error(res,400,'Invalid category');
 try{const id=uid();run('INSERT INTO categories(id,kind,slug,title_fa,title_en,sort_order) VALUES(?,?,?,?,?,?)',id,kind,slug,fa,en,sort);audit(req.user,'category.create',id);res.status(201).json({id});}catch(e){error(res,409,'Category already exists');}
});
app.patch('/api/admin/categories/:id',auth,editor,(req,res)=>{
 const old=get('SELECT * FROM categories WHERE id=?',req.params.id);if(!old)return error(res,404,'Category not found');
 const fa=str(req.body.title_fa??old.title_fa,100),en=str(req.body.title_en??old.title_en,100),sort=Number(req.body.sort_order??old.sort_order);
 if(!fa||!en||!Number.isSafeInteger(sort))return error(res,400,'Invalid category');
 run('UPDATE categories SET title_fa=?,title_en=?,sort_order=? WHERE id=?',fa,en,sort,old.id);audit(req.user,'category.update',old.id);res.json({ok:true});
});
app.delete('/api/admin/categories/:id',auth,editor,(req,res)=>{
 const old=get('SELECT * FROM categories WHERE id=?',req.params.id);if(!old)return error(res,404,'Category not found');
 if(get('SELECT COUNT(*) n FROM content WHERE kind=? AND category=?',old.kind,old.slug).n)return error(res,409,'Category is used by content');
 run('DELETE FROM categories WHERE id=?',old.id);audit(req.user,'category.delete',old.id);res.json({ok:true});
});
function courseAccess(req,courseId){
 if(req.user&&['admin','editor'].includes(req.user.role))return true;
 if(!req.user)return false;
 return all("SELECT items FROM orders WHERE user_id=? AND status IN ('paid','processing','completed')",req.user.id)
   .some(o=>parseJSON(o.items,[]).some(item=>item.id===courseId));
}
function videoAllowed(source){const info=normalizeVideo(source);return !!info&&(info.provider!=='file'||!!get("SELECT id FROM files WHERE stored_name=? AND is_private=0 AND mime IN ('video/mp4','video/webm')",path.basename(source)));}
app.get('/api/course/:slug/lessons',(req,res)=>{
 const course=get("SELECT * FROM content WHERE slug=? AND kind='course' AND status='published'",req.params.slug);
 if(!course)return error(res,404,'Course not found');
 const access=courseAccess(req,course.id);
 const lessons=all('SELECT * FROM lessons WHERE course_id=? ORDER BY sort_order,created_at',course.id)
  .map(l=>access||l.preview?l:{id:l.id,course_id:l.course_id,title_fa:l.title_fa,title_en:l.title_en,sort_order:l.sort_order,preview:l.preview,locked:true});
 res.json({access,items:lessons});
});
app.get('/api/admin/lessons',auth,editor,(req,res)=>{
 const courseId=str(req.query.courseId,80);res.json({items:all('SELECT * FROM lessons WHERE course_id=? ORDER BY sort_order,created_at',courseId)});
});
app.post('/api/admin/lessons',auth,editor,(req,res)=>{
 const course=get("SELECT id FROM content WHERE id=? AND kind='course'",str(req.body.course_id,80));if(!course)return error(res,404,'Course not found');
 const fa=str(req.body.title_fa,150),en=str(req.body.title_en,150),bodyFa=str(req.body.body_fa,30000),bodyEn=str(req.body.body_en,30000),video=str(req.body.video_url,1000),sort=Number(req.body.sort_order||0),preview=req.body.preview?1:0;
 if(!fa||!en||!Number.isSafeInteger(sort)||(video&&!videoAllowed(video)))return error(res,400,'Invalid lesson');
 const id=uid();run('INSERT INTO lessons(id,course_id,title_fa,title_en,body_fa,body_en,video_url,preview,sort_order) VALUES(?,?,?,?,?,?,?,?,?)',id,course.id,fa,en,bodyFa,bodyEn,video,preview,sort);
 audit(req.user,'lesson.create',id);res.status(201).json({id});
});
app.patch('/api/admin/lessons/:id',auth,editor,(req,res)=>{
 const old=get('SELECT * FROM lessons WHERE id=?',req.params.id);if(!old)return error(res,404,'Lesson not found');
 const fields=['title_fa','title_en','body_fa','body_en','video_url'];const vals=fields.map(k=>str(req.body[k]??old[k],k.startsWith('body')?30000:1000));
 const sort=Number(req.body.sort_order??old.sort_order),preview=req.body.preview==null?old.preview:(req.body.preview?1:0);
 if(!vals[0]||!vals[1]||!Number.isSafeInteger(sort)||(vals[4]&&!videoAllowed(vals[4])))return error(res,400,'Invalid lesson');
 run(`UPDATE lessons SET ${fields.map(k=>k+'=?').join(',')},sort_order=?,preview=? WHERE id=?`,...vals,sort,preview,old.id);
 audit(req.user,'lesson.update',old.id);res.json({ok:true});
});
app.delete('/api/admin/lessons/:id',auth,editor,(req,res)=>{
 const n=run('DELETE FROM lessons WHERE id=?',req.params.id);if(!n.changes)return error(res,404,'Lesson not found');audit(req.user,'lesson.delete',req.params.id);res.json({ok:true});
});

app.get('/robots.txt',(req,res)=>{
 const base=APP_ORIGIN.replace(/\/$/,'');
 res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nSitemap: ${base}/sitemap.xml\n`);
});
app.get('/sitemap.xml',(req,res)=>{
 const base=APP_ORIGIN.replace(/\/$/,'');
 const staticPaths=['/','/blog','/shop','/academy','/videos','/birth-chart','/services','/moon','/about','/research','/faq','/contact'];
 const entries=all("SELECT kind,slug,updated_at FROM content WHERE status='published' AND kind IN ('article','product','course','page')");
 const dynamic=entries.map(c=>c.kind==='article'?'/blog/'+c.slug:c.kind==='product'?'/shop/'+c.slug:c.kind==='course'?'/academy/'+c.slug:'/p/'+c.slug);
 const xmlEscape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');
 const urls=[...staticPaths,...dynamic].map(p=>`<url><loc>${xmlEscape(base+p)}</loc></url>`).join('');
 res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>');
});
const dist=path.join(ROOT,'client','dist');
if(fs.existsSync(dist)){
 app.use(express.static(dist,{index:false}));
 app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return error(res,404,'Endpoint not found');res.sendFile(path.join(dist,'index.html'));});
}else{
 app.get('/',(req,res)=>res.type('text').send('Asteria API is running. Start the React app with npm run dev, or npm run build then npm start.'));
}
app.use((err,req,res,next)=>{
 if(err instanceof multer.MulterError)return error(res,400,err.message);
 if(err instanceof SyntaxError&&err.type==='entity.parse.failed')return error(res,400,'Invalid JSON');
 console.error(err);
 if(res.headersSent)return next(err);
 error(res,err.status||500,err.status&&err.status<500?err.message:'Internal server error');
});
const port=Number(process.env.PORT)||4000;
app.listen(port,()=>console.log(`Asteria API listening on http://localhost:${port}`));
