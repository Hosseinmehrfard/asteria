// Structured, bilingual CMS configuration; no executable HTML/JS is stored or rendered.
export const SECTION_TYPES=['hero','shortcuts','highlights','articles','videos','services','quote','course-feature','courses','products','books','founder','research','benefits','tools','newsletter','custom'];
const card=(titleFa,titleEn,descFa,descEn,link,icon='',image='')=>({titleFa,titleEn,descFa,descEn,link,icon,image});
export const defaultBuilder={
 version:2,
 theme:{navy:'#081c27',gold:'#c49a50',teal:'#0d9c99',cream:'#fcfaf6',ink:'#21272b',fontFa:'Vazirmatn',fontEn:'Inter',radius:18},
 brand:{logo:'',logoTextFa:'آستریا',logoTextEn:'ASTERIA',shortFa:'آسترولوژی تکاملی',shortEn:'Evolutionary Astrology',headerImage:'',heroImage:'',favicon:''},
 navigation:[
  {id:'n1',titleFa:'خانه',titleEn:'Home',href:'/',visible:true},
  {id:'n2',titleFa:'مقالات',titleEn:'Articles',href:'/blog',visible:true},
  {id:'n3',titleFa:'ویدئوها',titleEn:'Videos',href:'/videos',visible:true},
  {id:'n4',titleFa:'دوره‌ها',titleEn:'Courses',href:'/academy',visible:true},
  {id:'n5',titleFa:'فروشگاه',titleEn:'Shop',href:'/shop',visible:true},
  {id:'n6',titleFa:'چارت تولد',titleEn:'Birth Chart',href:'/birth-chart',visible:true},
  {id:'n7',titleFa:'درباره ما',titleEn:'About',href:'/about',visible:true},
  {id:'n8',titleFa:'تماس',titleEn:'Contact',href:'/contact',visible:true}
 ],
 footer:{descriptionFa:'آموزش، پژوهش و مطالعه آسترولوژی با نگاهی نو.',descriptionEn:'Explore astrological traditions through learning and research.',copyrightFa:'تمام حقوق محفوظ است.',copyrightEn:'All rights reserved.',backgroundImage:'',links:[{titleFa:'پژوهش',titleEn:'Research',href:'/research'},{titleFa:'پرسش‌های رایج',titleEn:'FAQ',href:'/faq'},{titleFa:'ارتباط',titleEn:'Contact',href:'/contact'}]},
 sections:[
  {id:'hero-main',type:'hero',enabled:true,titleFa:'آسترولوژی تکاملی',titleEn:'Evolutionary Astrology',subtitleFa:'پاسخی برای تحلیل، تحول روح و درک مکان و زمان خاص',subtitleEn:'A space for reflection, growth, time and place',descriptionFa:'آموزش، تحلیل و پژوهش در آسترولوژی و خودشناسی؛ مجموعه‌ای از مقاله‌ها، دوره‌ها و منابع.',descriptionEn:'Education, research and reflection on the symbolic traditions of the cosmos.',image:'',buttonFa:'مشاهده دوره‌ها',buttonEn:'Explore courses',link:'/academy',secondaryFa:'معرفی آسترولوژی',secondaryEn:'About Astrology',secondaryLink:'/about'},
  {id:'quick-links',type:'shortcuts',enabled:true,titleFa:'',titleEn:'',items:[card('آموزش','Education','دوره‌های تخصصی','Guided courses','/academy','school'),card('چارت تولد','Birth Chart','تحلیل شخصی','A celestial map','/birth-chart','orbit'),card('مقالات','Articles','تحلیل‌ها و پژوهش‌ها','Stories and research','/blog','book'),card('ویدئوها','Videos','کلاس‌ها و گفت‌وگوها','Talks and lessons','/videos','video'),card('فروشگاه','Shop','کتاب و دوره','Books and courses','/shop','bag')]},
  {id:'highlights',type:'highlights',enabled:true,titleFa:'کاوش در دنیای آسترولوژی',titleEn:'Explore Astrology',items:[card('آسترولوژی؛ تاریخچه و مبانی','Astrology: Origins','از گذشته تا امروز','From antiquity to today','/blog','star'),card('چارت تولد','Birth chart','تحلیل نقشه آسمانی شما','Explore celestial positions','/birth-chart','orbit'),card('سنگ‌های ماه تولد','Birthstones','معرفی نمادها و کاربردها','Symbols and cultural uses','/blog','spark')]},
  {id:'articles',type:'articles',enabled:true,titleFa:'جدیدترین مقالات آسترولوژی',titleEn:'Latest articles',limit:3,link:'/blog'},
  {id:'videos',type:'videos',enabled:true,titleFa:'ویدئوهای آموزشی برگزیده',titleEn:'Featured videos',limit:3,link:'/videos'},
  {id:'services',type:'services',enabled:true,titleFa:'مدار ۱۸ درجه دوقلو',titleEn:'Your Learning Orbit',items:[card('تحلیل فردی','Personal reading','چارت تولد','Birth chart','/birth-chart','orbit'),card('بررسی روابط','Relationships','سیناستری','Synastry','/services','heart'),card('زمان‌بندی‌ها','Timing','ترانزیت‌ها','Transits','/moon','clock'),card('رشد و تحول','Growth','خودشناسی','Reflection','/academy','leaf'),card('انتخاب زمان','Select a date','موارد مهم','Important events','/services','calendar')]},
  {id:'quote',type:'quote',enabled:true,titleFa:'«آسترولوژی، زبان نمادین آسمان است؛ راهی برای طرح پرسش‌های عمیق‌تر.»',titleEn:'“Astrology is a symbolic language of the sky, inviting new questions.”',descriptionFa:'نگاهی به تاریخ، روایت‌ها و معناها',descriptionEn:'History, stories and meanings',image:''},
  {id:'course-feature',type:'course-feature',enabled:true,titleFa:'مجموعه دوره‌های تخصصی آسترولوژی',titleEn:'Specialized courses',subtitleFa:'یادگیری منظم، از اصول تا مباحث پیشرفته',subtitleEn:'Learn from essentials to advanced concepts',image:'',buttonFa:'مشاهده دوره‌ها',buttonEn:'Explore courses',link:'/academy'},
  {id:'courses',type:'courses',enabled:true,titleFa:'دوره‌های منتخب',titleEn:'Featured courses',limit:4,link:'/academy'},
  {id:'books',type:'books',enabled:true,titleFa:'آثار و کتاب‌های ما',titleEn:'Our books and resources',limit:4,link:'/shop'},
  {id:'founder',type:'founder',enabled:true,titleFa:'درباره پژوهشگر و مدرس آستریا',titleEn:'Meet our educator',descriptionFa:'در این بخش می‌توانید معرفی مدرس و مسیر پژوهشی مجموعه را از پنل مدیریت ویرایش کنید.',descriptionEn:'Introduce your educator and research approach in the admin panel.',image:'',link:'/about',buttonFa:'اطلاعات بیشتر',buttonEn:'Learn more'},
  {id:'research',type:'research',enabled:true,titleFa:'بنیاد پژوهشی آستریا',titleEn:'Asteria Research Foundation',descriptionFa:'مجموعه‌ای برای مطالعه و پژوهش در تاریخ و روش‌های تفسیری آسترولوژی.',descriptionEn:'An initiative to explore the history and interpretative traditions of astrology.',image:'',link:'/research',buttonFa:'درباره بنیاد',buttonEn:'About our research'},
  {id:'benefits',type:'benefits',enabled:true,titleFa:'و برای اولین بار در ایران',titleEn:'Ways to learn and explore',items:[card('استادان و پژوهشگران','Educators','با سابقه علمی و آموزشی','Expert perspectives','/about','star'),card('دوره‌های جامع عملی','Practical courses','مطالعه مرحله‌به‌مرحله','Structured learning','/academy','school'),card('آموزش سازمان‌یافته','Structured education','از مقدماتی تا پیشرفته','Beginner to advanced','/academy','book')]},
  {id:'tools',type:'tools',enabled:true,titleFa:'ابزارها و خدمات آسترولوژی',titleEn:'Astrology tools and services',items:[card('اپلیکیشن','Web app','دسترسی آسان','Install the app','/','spark'),card('تقویم نجومی','Lunar calendar','ماه و سیارات','Moon phases','/moon','calendar'),card('چارت تولد','Birth chart','نقشه نجومی','Birth sky map','/birth-chart','orbit'),card('کتابخانه منابع','Resource library','کتاب‌ها و فایل‌ها','Books and resources','/shop','book')]},
  {id:'newsletter',type:'newsletter',enabled:true,titleFa:'با آستریا همراه باشید',titleEn:'Stay connected with Asteria',descriptionFa:'تازه‌ترین مقاله‌ها، رویدادها و دوره‌ها را در خبرنامه دنبال کنید.',descriptionEn:'Get news about articles, events and courses.'}
 ]
};
const cleanText=(v,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
const validUrl=(v)=>{const s=cleanText(v,900);if(!s)return '';if(s.startsWith('/')&&!s.startsWith('//')&&!s.includes('\\'))return s;try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?s:'';}catch{return '';}};
const internalLink=v=>{const s=cleanText(v,180);return s.startsWith('/')&&!s.startsWith('//')&&!s.includes('\\')?s:'/';};
const safeColor=(v,f)=>/^#[0-9a-fA-F]{6}$/.test(v||'')?v:f;
const safeFont=(v,kind)=>{const allowed=kind==='fa'?['Vazirmatn','Sahel','Tahoma']:['Inter','Georgia','Arial'];return allowed.includes(v)?v:allowed[0];};
const simpleItem=(v,i)=>({id:cleanText(v?.id||`i${i}`,80),titleFa:cleanText(v?.titleFa,180),titleEn:cleanText(v?.titleEn,180),descFa:cleanText(v?.descFa,280),descEn:cleanText(v?.descEn,280),link:internalLink(v?.link),icon:cleanText(v?.icon,30),image:validUrl(v?.image)});
export function normalizeBuilder(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid site builder payload');
 const b=input,theme=b.theme||{},brand=b.brand||{},footer=b.footer||{};
 if(!Array.isArray(b.sections)||b.sections.length>48||!Array.isArray(b.navigation)||b.navigation.length>35)throw new Error('Too many sections or navigation items');
 const sections=b.sections.map((s,i)=>{
  if(!SECTION_TYPES.includes(s?.type))throw new Error('Invalid section type');
  if(!Array.isArray(s.items)&&s.items!==undefined)throw new Error('Invalid section items');
  if((s.items||[]).length>24)throw new Error('Too many cards');
  return {id:cleanText(s.id||`section-${i}`,80)||`section-${i}`,type:s.type,enabled:s.enabled!==false,
   titleFa:cleanText(s.titleFa,320),titleEn:cleanText(s.titleEn,320),subtitleFa:cleanText(s.subtitleFa,600),subtitleEn:cleanText(s.subtitleEn,600),
   descriptionFa:cleanText(s.descriptionFa,3000),descriptionEn:cleanText(s.descriptionEn,3000),buttonFa:cleanText(s.buttonFa,120),buttonEn:cleanText(s.buttonEn,120),
   secondaryFa:cleanText(s.secondaryFa,120),secondaryEn:cleanText(s.secondaryEn,120),secondaryLink:internalLink(s.secondaryLink),link:internalLink(s.link),
   image:validUrl(s.image),limit:Math.min(12,Math.max(1,Number(s.limit)||3)),items:(s.items||[]).map(simpleItem)};
 });
 const ids=sections.map(s=>s.id);if(new Set(ids).size!==ids.length)throw new Error('Duplicate section IDs');
 return {version:2,theme:{navy:safeColor(theme.navy,defaultBuilder.theme.navy),gold:safeColor(theme.gold,defaultBuilder.theme.gold),teal:safeColor(theme.teal,defaultBuilder.theme.teal),cream:safeColor(theme.cream,defaultBuilder.theme.cream),ink:safeColor(theme.ink,defaultBuilder.theme.ink),fontFa:safeFont(theme.fontFa,'fa'),fontEn:safeFont(theme.fontEn,'en'),radius:Math.min(28,Math.max(0,Number(theme.radius)||18))},
 brand:{logo:validUrl(brand.logo),logoTextFa:cleanText(brand.logoTextFa,120),logoTextEn:cleanText(brand.logoTextEn,120),shortFa:cleanText(brand.shortFa,180),shortEn:cleanText(brand.shortEn,180),headerImage:validUrl(brand.headerImage),heroImage:validUrl(brand.heroImage),favicon:validUrl(brand.favicon)},
 navigation:b.navigation.map((n,i)=>({id:cleanText(n.id||`nav${i}`,60),titleFa:cleanText(n.titleFa,80),titleEn:cleanText(n.titleEn,80),href:internalLink(n.href),visible:n.visible!==false})),
 footer:{descriptionFa:cleanText(footer.descriptionFa,1500),descriptionEn:cleanText(footer.descriptionEn,1500),copyrightFa:cleanText(footer.copyrightFa,150),copyrightEn:cleanText(footer.copyrightEn,150),backgroundImage:validUrl(footer.backgroundImage),links:(Array.isArray(footer.links)?footer.links:[]).slice(0,24).map((l,i)=>({id:cleanText(l.id||`f${i}`,70),titleFa:cleanText(l.titleFa,100),titleEn:cleanText(l.titleEn,100),href:internalLink(l.href)}))},
 sections};
}
