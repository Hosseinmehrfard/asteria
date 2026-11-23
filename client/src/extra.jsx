import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {UploadCloud,Film,Image as ImageIcon,Copy,Trash2,Search,Plus,Save,X,Play,Link2,Check,CloudUpload,Download,Smartphone,ExternalLink,Video,FolderOpen,CheckCircle2} from 'lucide-react';

const m={
 fa:{media:'کتابخانه رسانه',upload:'آپلود عکس و ویدئو',uploadHelp:'انتخاب چند فایل، رها کردن روی کادر یا انتخاب از سیستم. حجم هر فایل طبق تنظیم سرور محدود می‌شود.',photos:'تصاویر',videos:'ویدئوها',other:'سایر فایل‌ها',all:'همه',copy:'کپی لینک',delete:'حذف دائمی',private:'فایل خصوصی (فقط برای تحویل محصول)',public:'رسانه عمومی قابل نمایش در سایت',empty:'هنوز رسانه‌ای ثبت نشده است',view:'پیش‌نمایش',title:'عنوان',source:'لینک ویدئو YouTube، Aparat یا ویدئوی آپلودشده',save:'ذخیره',cancel:'انصراف',new:'ویدئوی جدید',draft:'پیش‌نویس',published:'منتشرشده',paste:'لینک معتبر را وارد کنید',invalid:'لینک پشتیبانی نمی‌شود',learn:'برای استفاده از ویدئوی آپلودشده، لینک عمومی آن را از کتابخانه رسانه کپی کنید.',install:'نصب وب‌اپلیکیشن',ios:'در Safari از گزینه Share و سپس Add to Home Screen استفاده کنید.',already:'اپلیکیشن نصب شده است'},
 en:{media:'Media Library',upload:'Upload images & videos',uploadHelp:'Drop or select multiple files. The server controls the per-file size limit.',photos:'Images',videos:'Videos',other:'Other files',all:'All',copy:'Copy URL',delete:'Delete permanently',private:'Private file (digital delivery only)',public:'Public media visible on the site',empty:'No files yet',view:'Preview',title:'Title',source:'YouTube, Aparat, or hosted video URL',save:'Save',cancel:'Cancel',new:'Add video',draft:'Draft',published:'Published',paste:'Paste a supported URL',invalid:'Unsupported video URL',learn:'To use an uploaded video, copy its public URL from Media Library.',install:'Install web app',ios:'In Safari, choose Share, then Add to Home Screen.',already:'App installed'}
};
const tx=(lang,k)=>m[lang]?.[k]||k;
async function request(url,options={}){
 const res=await fetch('/api'+url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});
 const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||`HTTP ${res.status}`);return json;
}
export function parseVideoUrl(raw){
 if(!raw||typeof raw!=='string')return null;
 if(/^\/uploads\/[a-f0-9]{40}\.(mp4|webm)$/i.test(raw))return {kind:'file',url:raw};
 let u;try{u=new URL(raw);}catch{return null;}
 if(u.protocol!=='https:'||u.port||u.username||u.password)return null;
 const host=u.hostname.toLowerCase().replace(/^www\./,'');let id='';const seg=u.pathname.split('/').filter(Boolean);
 if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','youtu.be'].includes(host)){
  if(host==='youtu.be')id=seg[0];else if(seg[0]==='watch')id=u.searchParams.get('v');else if(['embed','shorts','live','v'].includes(seg[0]))id=seg[1];
  if(!/^[\w-]{11}$/.test(id||''))return null;
  return {kind:'youtube',url:`https://www.youtube-nocookie.com/embed/${id}?rel=0`};
 }
 if(host==='aparat.com'||host==='m.aparat.com'){
  if(seg[0]==='v')id=seg[1];else if(seg[0]==='embed')id=seg[1];else if(seg[0]==='video'&&seg[1]==='video'&&seg[2]==='embed')id=seg[3]==='videohash'?seg[4]:seg[4]==='videohash'?seg[5]:seg[3];
  if(!/^[A-Za-z0-9_-]{4,32}$/.test(id||''))return null;
  return {kind:'aparat',url:`https://www.aparat.com/video/video/embed/videohash/${id}/vt/frame`};
 }
 return null;
}
export function VideoPlayer({url,title,poster}){
 const v=parseVideoUrl(url);
 if(!v)return <div className="video-error"><Film size={25}/><span>Video unavailable / ویدئو در دسترس نیست</span></div>;
 return <div className="asteria-video-frame">{v.kind==='file'?<video controls playsInline preload="metadata" poster={poster||undefined} controlsList="nodownload"><source src={v.url} type={v.url.endsWith('.webm')?'video/webm':'video/mp4'}/></video>:<iframe src={v.url} title={title||'Asteria video'} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>}</div>;
}
const getMediaKind=file=>file.mime?.startsWith('image/')?'image':file.mime?.startsWith('video/')?'video':'file';

export function AdminMediaLibrary({lang='fa',canDelete=false}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[priv,setPriv]=useState(false),[files,setFiles]=useState([]),[dragging,setDragging]=useState(false),[jobs,setJobs]=useState([]),[busy,setBusy]=useState(false),[selected,setSelected]=useState(null),[notice,setNotice]=useState('');const input=useRef(null);
 const refresh=async()=>{try{setItems((await request('/admin/files')).items||[]);}catch(e){setNotice(e.message);}finally{setLoading(false);}};
 useEffect(()=>{refresh();},[]);
 const displayed=useMemo(()=>items.filter(f=>(filter==='all'||getMediaKind(f)===filter)&&f.original_name.toLowerCase().includes(query.toLowerCase())),[items,filter,query]);
 const pick=fs=>{const next=Array.from(fs||[]).slice(0,20);setFiles(next);};
 const uploadOne=(file,i)=>new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest();const fd=new FormData();fd.append('file',file);
  xhr.open('POST','/api/admin/files?private='+(priv?'1':'0'));
  xhr.upload.onprogress=e=>{if(e.lengthComputable)setJobs(j=>j.map((x,k)=>k===i?{...x,percent:Math.round(e.loaded/e.total*100)}:x));};
  xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText);}catch{data={};}
   if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new Error(data.error||`HTTP ${xhr.status}`));};
  xhr.onerror=()=>reject(Error('Network error'));xhr.send(fd);
 });
 const send=async e=>{e.preventDefault();if(!files.length)return;setBusy(true);setJobs(files.map(file=>({name:file.name,percent:0,status:'uploading'})));
  let ok=0;for(let i=0;i<files.length;i++){try{await uploadOne(files[i],i);ok++;setJobs(j=>j.map((x,k)=>k===i?{...x,percent:100,status:'done'}:x));}
   catch(err){setJobs(j=>j.map((x,k)=>k===i?{...x,status:'error',error:err.message}:x));}}
  setNotice(`${ok}/${files.length} ${lang==='fa'?'فایل آپلود شد':'files uploaded'}`);setFiles([]);if(input.current)input.current.value='';setBusy(false);refresh();};
 const copy=async value=>{try{await navigator.clipboard.writeText(value);setNotice(lang==='fa'?'کپی شد':'Copied');}catch{setNotice(value);}};
 const remove=async f=>{if(!window.confirm(`${tx(lang,'delete')}؟ ${f.original_name}`))return;try{await request('/admin/files/'+f.id,{method:'DELETE'});setSelected(null);setNotice('Deleted');await refresh();}catch(e){setNotice(e.message);}};
 return <div className="media-manager">
  <div className="media-intro"><div><span className="eyebrow">ASTERIA MEDIA STUDIO</span><h2>{tx(lang,'media')}</h2><p>{lang==='fa'?'همه تصویرها، ویدئوها و فایل‌های سایت را از یک‌جا مدیریت کنید.':'Manage photos, videos and downloads in one place.'}</p></div><div className="media-totals"><div><strong>{items.filter(x=>getMediaKind(x)==='image').length}</strong><small>{tx(lang,'photos')}</small></div><div><strong>{items.filter(x=>getMediaKind(x)==='video').length}</strong><small>{tx(lang,'videos')}</small></div><div><strong>{items.length}</strong><small>{tx(lang,'all')}</small></div></div></div>
  <form onSubmit={send} className="admin-card upload-studio">
   <div className={'drop-studio '+(dragging?'drag-active':'')} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{e.preventDefault();setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);pick(e.dataTransfer.files);}} onClick={()=>input.current?.click()} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&input.current?.click()}>
    <div className="upload-bubble"><CloudUpload size={30}/></div><strong>{tx(lang,'upload')}</strong><small>{files.length?files.map(f=>f.name).join(' • '):tx(lang,'uploadHelp')}</small><input ref={input} type="file" multiple hidden accept={priv?'.pdf,.zip,.epub,.mp3,.mp4,.webm':'.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm'} onChange={e=>pick(e.target.files)}/>
   </div>
   <div className="upload-controls"><label className="checkbox-line"><input type="checkbox" checked={priv} onChange={e=>{setPriv(e.target.checked);setFiles([]);if(input.current)input.current.value='';}}/>{priv?tx(lang,'private'):tx(lang,'public')}</label><button type="submit" className="btn btn-admin" disabled={!files.length||busy}><UploadCloud size={18}/>{busy?(lang==='fa'?'در حال بارگذاری…':'Uploading…'):(lang==='fa'?`آپلود ${files.length||''} فایل`:`Upload ${files.length||''} files`)}</button></div>
   {!!jobs.length&&<div className="upload-jobs">{jobs.map((job,i)=><div key={i} className="upload-job"><small>{job.name} · {job.error||`${job.percent}%`}</small><div className="progress-track"><span style={{width:job.percent+'%',background:job.status==='error'?'#ce5b5b':undefined}}/></div></div>)}</div>}
  </form>
  <div className="media-toolbar"><div className="media-filters">{[['all',tx(lang,'all')],['image',tx(lang,'photos')],['video',tx(lang,'videos')],['file',tx(lang,'other')]].map(([value,label])=><button key={value} className={filter===value?'selected':''} onClick={()=>setFilter(value)}>{label}</button>)}</div><div className="search-field"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={lang==='fa'?'جست‌وجوی نام فایل…':'Search files...'}/></div></div>
  {loading?<p>Loading…</p>:displayed.length?<div className="media-library-grid">{displayed.map(f=><button key={f.id} type="button" className={'media-library-tile '+(selected?.id===f.id?'chosen':'')} onClick={()=>setSelected(f)}>
   <div className="library-preview">{!f.is_private&&getMediaKind(f)==='image'?<img src={f.url} loading="lazy" alt=""/>:!f.is_private&&getMediaKind(f)==='video'?<><video src={f.url} preload="metadata" muted playsInline/><span className="play-overlay"><Play size={23}/></span></>:<FolderOpen size={42}/>}</div>
   <div className="library-tile-details"><strong title={f.original_name}>{f.original_name}</strong><small>{(f.size/1024/1024).toFixed(2)} MB · {f.is_private?'PRIVATE':getMediaKind(f).toUpperCase()}</small></div></button>)}</div>:<div className="admin-card media-empty"><FolderOpen size={38}/>{tx(lang,'empty')}</div>}
  {selected&&<div className="media-modal-backdrop" onClick={()=>setSelected(null)}><div className="media-modal admin-card" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={selected.original_name}>
   <header><strong>{selected.original_name}</strong><button className="tiny-button" aria-label="Close" onClick={()=>setSelected(null)}><X size={20}/></button></header>
   <div className="media-modal-preview">{selected.is_private?<FolderOpen size={66}/>:getMediaKind(selected)==='image'?<img src={selected.url} alt={selected.original_name}/>:getMediaKind(selected)==='video'?<VideoPlayer url={selected.url} title={selected.original_name}/>:<FolderOpen size={65}/>}</div>
   <small>{selected.mime} · {(selected.size/1024/1024).toFixed(2)} MB</small><code>{selected.is_private?selected.id:selected.url}</code>
   <div className="media-modal-actions"><button className="btn btn-admin" onClick={()=>copy(selected.is_private?selected.id:selected.url)}><Copy size={17}/>{tx(lang,'copy')}</button>{!selected.is_private&&<a className="btn btn-plain" href={selected.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{tx(lang,'view')}</a>}{canDelete&&<button className="btn btn-danger" onClick={()=>remove(selected)}><Trash2 size={16}/>{tx(lang,'delete')}</button>}</div>
  </div></div>}
  {!!notice&&<div role="status" className="media-toast" onClick={()=>setNotice('')}>{notice} <X size={16}/></div>}
 </div>;
}
const blankVideo={title_fa:'',title_en:'',description_fa:'',description_en:'',source_url:'',thumbnail:'',status:'draft',sort_order:0};
export function AdminVideoCatalog({lang='fa',canDelete=false}){
 const [videos,setVideos]=useState([]),[editing,setEditing]=useState(false),[form,setForm]=useState(blankVideo),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const refresh=async()=>{try{setVideos((await request('/admin/videos')).items||[]);}catch(e){setNotice(e.message);}};
 useEffect(()=>{refresh();},[]);
 const start=item=>{setForm(item?{...item}:blankVideo);setEditing(true);window.scrollTo({top:0,behavior:'smooth'});};
 const change=(k,v)=>setForm(f=>({...f,[k]:v}));const valid=parseVideoUrl(form.source_url);
 const save=async e=>{e.preventDefault();setBusy(true);try{await request('/admin/videos'+(form.id?'/'+form.id:''),{method:form.id?'PATCH':'POST',body:JSON.stringify(form)});setNotice(lang==='fa'?'ویدئو ذخیره شد':'Video saved');setEditing(false);await refresh();}catch(e){setNotice(e.message);}finally{setBusy(false);}};
 const remove=async v=>{if(!confirm(`${tx(lang,'delete')}؟`))return;try{await request('/admin/videos/'+v.id,{method:'DELETE'});refresh();}catch(e){setNotice(e.message);}};
 return <div className="video-admin"><div className="admin-panel-toolbar"><div><span className="eyebrow">VIDEO LIBRARY</span><h2>{lang==='fa'?'مدیریت ویدئوهای سایت':'Site videos'}</h2><p>{lang==='fa'?'لینک یوتیوب، آپارات یا ویدئوی آپلودشده را ثبت کنید و داخل سایت نمایش دهید.':'Embed YouTube, Aparat or uploaded videos directly.'}</p></div><button className="btn btn-admin" onClick={()=>start(null)}><Plus size={19}/>{tx(lang,'new')}</button></div>
 {editing&&<form onSubmit={save} className="admin-card video-editor"><div className="editor-head"><h3>{form.id?(lang==='fa'?'ویرایش ویدئو':'Edit video'):tx(lang,'new')}</h3><button type="button" className="tiny-button" onClick={()=>setEditing(false)}><X/></button></div>
 <div className="form-2"><label>عنوان فارسی<input required value={form.title_fa} onChange={e=>change('title_fa',e.target.value)}/></label><label>English title<input required value={form.title_en} onChange={e=>change('title_en',e.target.value)}/></label></div>
 <label>{tx(lang,'source')}<input dir="ltr" required type="text" value={form.source_url} placeholder="https://www.youtube.com/watch?v=..." onChange={e=>change('source_url',e.target.value)}/></label>
 <small className="hint">{tx(lang,'learn')}</small>{!!form.source_url&&(valid?<VideoPlayer url={form.source_url} title={form.title_fa}/>:<div className="field-error">{tx(lang,'invalid')}</div>)}
 <div className="form-2"><label>توضیح فارسی<textarea rows="3" value={form.description_fa} onChange={e=>change('description_fa',e.target.value)}/></label><label>English description<textarea rows="3" value={form.description_en} onChange={e=>change('description_en',e.target.value)}/></label></div>
 <div className="form-3"><label>{lang==='fa'?'تصویر کاور (URL)':'Thumbnail URL'}<input dir="ltr" value={form.thumbnail} onChange={e=>change('thumbnail',e.target.value)}/></label><label>{lang==='fa'?'وضعیت':'Status'}<select value={form.status} onChange={e=>change('status',e.target.value)}><option value="draft">{tx(lang,'draft')}</option><option value="published">{tx(lang,'published')}</option></select></label><label>{lang==='fa'?'ترتیب':'Sort order'}<input type="number" value={form.sort_order} onChange={e=>change('sort_order',Number(e.target.value))}/></label></div>
 <div className="form-actions"><button disabled={!valid||busy} className="btn btn-admin"><Save size={17}/>{tx(lang,'save')}</button><button type="button" className="btn btn-plain" onClick={()=>setEditing(false)}>{tx(lang,'cancel')}</button></div></form>}
 <div className="video-admin-grid">{videos.map(v=><div className="admin-card video-admin-card" key={v.id}><div className="video-card-cover">{v.thumbnail?<img src={v.thumbnail} alt=""/>:<Film size={42}/>}<span className="video-source-badge">{v.provider}</span></div><div className="video-card-info"><span className={'status-label '+v.status}>{v.status}</span><h3>{v['title_'+lang]||v.title_fa}</h3><p>{v['description_'+lang]||''}</p><div className="table-actions"><button onClick={()=>start(v)}>Edit</button><button onClick={()=>remove(v)} className="danger" disabled={!canDelete} title={!canDelete?"Admin only":undefined}><Trash2 size={16}/></button></div></div></div>)}</div>
 {!videos.length&&<div className="admin-card media-empty"><Film size={38}/>{lang==='fa'?'هنوز ویدئویی ثبت نشده است':'No videos added'}</div>}
 {!!notice&&<div className="media-toast" role="status" onClick={()=>setNotice('')}>{notice} <X size={15}/></div>}
 </div>;
}
export function VideoGallery({lang='fa',compact=false}){
 const [items,setItems]=useState([]),[error,setError]=useState(''),[active,setActive]=useState(null);
 useEffect(()=>{let alive=true;request('/videos').then(d=>{if(alive)setItems(d.items||[]);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
 if(compact&&!items.length)return null;
 return <section className={compact?'container video-home-section':'container video-gallery-page'}>
  <div className="section-header"><div><div className="eyebrow">ASTERIA VISUAL ACADEMY</div><h2>{lang==='fa'?'ویدئوهای آموزشی و پژوهشی':'Video learning & insights'}</h2><p>{lang==='fa'?'تماشای آموزش‌ها و گفتگوها بدون خروج از سایت':'Watch curated lessons without leaving the website.'}</p></div>{compact&&<Link to="/videos" className="text-link">{lang==='fa'?'همه ویدئوها':'All videos'} →</Link>}</div>
  {error&&<p>{error}</p>}
  <div className="video-public-grid">{items.slice(0,compact?3:100).map(v=><article className="video-public-card" key={v.id}><button className="video-public-cover" onClick={()=>setActive(v)} aria-label={v['title_'+lang]}>{v.thumbnail?<img src={v.thumbnail} alt="" loading="lazy"/>:<div className="video-cover-fallback"><span>✳</span></div>}<span className="video-play-button"><Play size={25} fill="currentColor"/></span><small>{v.provider}</small></button><div className="video-public-info"><h3>{v['title_'+lang]||v.title_fa}</h3><p>{v['description_'+lang]||v.description_fa}</p><button className="under-link" onClick={()=>setActive(v)}><Play size={16}/>{lang==='fa'?'پخش ویدئو':'Play video'}</button></div></article>)}</div>
  {active&&<div className="media-modal-backdrop video-lightbox" onClick={()=>setActive(null)}><div className="video-lightbox-inner" onClick={e=>e.stopPropagation()}><div className="video-lightbox-header"><h3>{active['title_'+lang]}</h3><button onClick={()=>setActive(null)} aria-label="Close"><X size={23}/></button></div><VideoPlayer url={active.source_url} title={active['title_'+lang]} poster={active.thumbnail}/></div></div>}
  {!compact&&!items.length&&!error&&<div className="media-empty">{lang==='fa'?'ویدئوی منتشرشده‌ای وجود ندارد':'No published videos yet'}</div>}
 </section>;
}
export function ImageChooser({lang='fa',value,onSelect}){
 const [open,setOpen]=useState(false),[items,setItems]=useState([]),[loading,setLoading]=useState(false);
 const show=async()=>{setOpen(true);setLoading(true);try{setItems((await request('/admin/files')).items.filter(f=>!f.is_private&&f.mime.startsWith('image/')));}finally{setLoading(false);}};
 return <><button type="button" className="btn btn-plain image-pick-button" onClick={show}><ImageIcon size={17}/>{lang==='fa'?'انتخاب از کتابخانه':'Pick from media'}</button>{value?.startsWith('/uploads/')&&<img className="image-field-preview" src={value} alt=""/>}
 {open&&<div className="media-modal-backdrop" onClick={()=>setOpen(false)}><div className="admin-card media-picker" onClick={e=>e.stopPropagation()}><header><h3>{lang==='fa'?'انتخاب تصویر':'Choose image'}</h3><button type="button" onClick={()=>setOpen(false)}><X/></button></header>{loading?'Loading...':<div className="media-picker-grid">{items.map(f=><button type="button" key={f.id} onClick={()=>{onSelect(f.url);setOpen(false);}}><img src={f.url} alt={f.original_name} loading="lazy"/><small>{f.original_name}</small></button>)}</div>}</div></div>}</>;
}
export function InstallApp({lang='fa'}){
 const [prompt,setPrompt]=useState(null),[installed,setInstalled]=useState(false),[help,setHelp]=useState(false);
 useEffect(()=>{
  const onPrompt=e=>{e.preventDefault();setPrompt(e);};const onInstalled=()=>{setInstalled(true);setPrompt(null);};
  window.addEventListener('beforeinstallprompt',onPrompt);window.addEventListener('appinstalled',onInstalled);
  if(window.matchMedia('(display-mode: standalone)').matches)setInstalled(true);
  return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled);};
 },[]);
 if(installed)return null;
 return <div className="install-bar"><div className="install-icon">✳</div><div><strong>{lang==='fa'?'آستریا را مثل یک اپلیکیشن نصب کنید':'Install Asteria as an app'}</strong><small>{lang==='fa'?'دسترسی سریع از صفحه اصلی موبایل و دسکتاپ':'Quick access from your home screen'}</small></div><button className="btn btn-admin" onClick={async()=>{if(prompt){await prompt.prompt();await prompt.userChoice;setPrompt(null);}else setHelp(!help);}}><Download size={17}/>{tx(lang,'install')}</button>{help&&<p className="install-help">{tx(lang,'ios')}</p>}</div>;
}
