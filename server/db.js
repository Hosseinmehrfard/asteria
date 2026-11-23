import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(fs.existsSync(path.join(projectRoot,'.env'))&&typeof process.loadEnvFile==='function')process.loadEnvFile(path.join(projectRoot,'.env'));
const pathFromEnv = process.env.DB_PATH || './server/data/asteria.sqlite';
export const databasePath = path.resolve(projectRoot, pathFromEnv);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
export const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin','editor','support','customer')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS content (
 id TEXT PRIMARY KEY,kind TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,
 title_fa TEXT NOT NULL,title_en TEXT NOT NULL DEFAULT '',summary_fa TEXT NOT NULL DEFAULT '',summary_en TEXT NOT NULL DEFAULT '',
 body_fa TEXT NOT NULL DEFAULT '',body_en TEXT NOT NULL DEFAULT '',image TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 price INTEGER NOT NULL DEFAULT 0,sale_price INTEGER NOT NULL DEFAULT 0,
 stock INTEGER NOT NULL DEFAULT -1, sort_order INTEGER NOT NULL DEFAULT 0,extra TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT (datetime('now')),updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_content_kind_status ON content(kind,status,sort_order);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),name TEXT NOT NULL,email TEXT NOT NULL,
 phone TEXT NOT NULL DEFAULT '',address TEXT NOT NULL DEFAULT '',items TEXT NOT NULL,
 subtotal INTEGER NOT NULL,discount INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL,
 coupon TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'awaiting_payment',
 note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT (datetime('now')),updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS coupons (
 code TEXT PRIMARY KEY,kind TEXT NOT NULL DEFAULT 'percent',value INTEGER NOT NULL,
 min_total INTEGER NOT NULL DEFAULT 0,max_uses INTEGER NOT NULL DEFAULT 0,
 used_count INTEGER NOT NULL DEFAULT 0,expires_at TEXT,active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bookings (
 id TEXT PRIMARY KEY,service_id TEXT REFERENCES content(id) ON DELETE SET NULL,user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',desired_date TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'unread',created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS newsletter (email TEXT PRIMARY KEY,created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS files (
 id TEXT PRIMARY KEY,original_name TEXT NOT NULL,stored_name TEXT NOT NULL,mime TEXT NOT NULL,
 size INTEGER NOT NULL,is_private INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS videos (
 id TEXT PRIMARY KEY,title_fa TEXT NOT NULL,title_en TEXT NOT NULL DEFAULT '',
 description_fa TEXT NOT NULL DEFAULT '',description_en TEXT NOT NULL DEFAULT '',
 source_url TEXT NOT NULL,embed_url TEXT NOT NULL,provider TEXT NOT NULL,
 thumbnail TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status,sort_order,created_at);
CREATE TABLE IF NOT EXISTS charts (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,birth_date TEXT NOT NULL,birth_time TEXT NOT NULL,timezone REAL NOT NULL,
 latitude REAL NOT NULL,longitude REAL NOT NULL,result TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS categories (
 id TEXT PRIMARY KEY,kind TEXT NOT NULL,slug TEXT NOT NULL,title_fa TEXT NOT NULL,title_en TEXT NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0,UNIQUE(kind,slug)
);
CREATE TABLE IF NOT EXISTS lessons (
 id TEXT PRIMARY KEY,course_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
 title_fa TEXT NOT NULL,title_en TEXT NOT NULL,body_fa TEXT NOT NULL DEFAULT '',body_en TEXT NOT NULL DEFAULT '',
 video_url TEXT NOT NULL DEFAULT '',preview INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id,sort_order);
CREATE TABLE IF NOT EXISTS audit (
 id TEXT PRIMARY KEY,user_id TEXT,action TEXT NOT NULL,target TEXT NOT NULL,
 details TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
export const get = (sql,...params) => db.prepare(sql).get(...params);
export const all = (sql,...params) => db.prepare(sql).all(...params);
export const run = (sql,...params) => db.prepare(sql).run(...params);
export const uid = () => randomUUID();
export const audit = (user,action,target,details={}) => run('INSERT INTO audit(id,user_id,action,target,details) VALUES(?,?,?,?,?)',uid(),user?.id||null,action,target,JSON.stringify(details));
// Existing databases must never be reseeded after an administrator deletes demo items.
const isFreshDatabase=!get('SELECT key FROM settings LIMIT 1') && get('SELECT COUNT(*) n FROM content').n===0;
const defaultSettings={
  siteNameFa:'آستریا',siteNameEn:'ASTERIA',taglineFa:'روایتی نو از آسمان و خودشناسی',taglineEn:'A different perspective on the sky and the self',
  heroTitleFa:'آسمان را از زاویه‌ای تازه ببینید',heroTitleEn:'Discover the sky from a new perspective',
  heroDescFa:'مقالات، آموزش‌های تخصصی و نقشه تولد در یک مسیر روشن برای مطالعه آسترولوژی.',
  heroDescEn:'Explore celestial studies through thoughtful articles, guided courses and personalized birth charts.',
  contactEmail:'hello@example.com',contactPhone:'',instagram:'',telegram:'',footerNoteFa:'آسترولوژی یک سنت تفسیری است و جایگزین دانش تجربی یا مشاوره تخصصی نیست.',
  footerNoteEn:'Astrology is an interpretive tradition, not a substitute for scientific evidence or professional advice.',
  customMenu:'[]',seoDescriptionFa:'مطالعه آسمان و سنت‌های آسترولوژی، دوره‌ها و چارت تولد',seoDescriptionEn:'Asteria celestial studies, thoughtful courses and astronomical birth charts',allowRegistration:true,announcementFa:'به آستریا خوش آمدید؛ مسیر یادگیری از اینجا آغاز می‌شود.',
  announcementEn:'Welcome to Asteria — your journey begins here.'
};
for(const [key,val] of Object.entries(defaultSettings))run('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)',key,JSON.stringify(val));
if(isFreshDatabase){
function seed(kind,slug,fa,en,summaryFa,summaryEn,bodyFa,bodyEn,opts={}){
 if(get('SELECT id FROM content WHERE slug=?',slug))return;
 run(`INSERT INTO content(id,kind,slug,title_fa,title_en,summary_fa,summary_en,body_fa,body_en,image,category,status,price,sale_price,stock,sort_order,extra)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,uid(),kind,slug,fa,en,summaryFa,summaryEn,bodyFa,bodyEn,opts.image||'',opts.category||'', 'published',opts.price||0,opts.sale_price||0,opts.stock??-1,opts.sort_order||0,JSON.stringify(opts.extra||{}));
}
seed('article','reading-your-natal-chart','چارت تولد چیست و چگونه آن را بخوانیم؟','What is a birth chart and how do you read it?',
 'راهنمایی برای شناخت سیارات، خانه‌ها و نشانه‌های زودیاک در نقشه تولد.','A beginner’s guide to planets, signs and houses.',
 'چارت تولد تصویری نمادین از موقعیت اجرام آسمانی در زمان تولد است. در سنت آسترولوژی، دوازده خانه به حوزه‌های مختلف زندگی نسبت داده می‌شوند. برای شروع، می‌توانید به موقعیت خورشید، ماه و طالع توجه کنید. این روش تفسیر نمادین است و پشتوانه تجربی برای پیش‌گویی ندارد.',
 'A birth chart is a symbolic map of celestial positions at the time of birth. In astrology, twelve houses correspond to different life themes. Start by examining the Sun, Moon and Ascendant. Interpretations are symbolic rather than scientifically established predictions.',{category:'fundamentals',sort_order:1});
seed('article','the-moon-and-its-phases','چرخه ماه؛ از ماه نو تا ماه کامل','The lunar cycle: from new to full Moon',
 'آشنایی با فازهای ماه و روش‌های مشاهده آن در آسمان.','Understand the Moon’s phases and how to observe them.',
 'فازهای ماه از تغییر زاویه بین خورشید، زمین و ماه به وجود می‌آیند. یک چرخه هلالی حدود ۲۹٫۵ روز طول می‌کشد. بسیاری از فرهنگ‌ها برای این چرخه معناهای نمادین ساخته‌اند؛ این معناها را باید از توضیح علمی چرخه ماه جدا کرد.',
 'Moon phases result from the changing geometry of the Sun, Earth and Moon. A synodic lunar month is about 29.5 days. Cultures have assigned symbolic meanings to these phases, which are distinct from the physical explanation.',{category:'moon',sort_order:2});
seed('article','planets-and-symbolism','سیارات در سنت آسترولوژی','Planets and symbolism in astrology',
 'از عطارد تا زحل؛ نگاهی مقدماتی به زبان نمادین سیارات.','A first look at the symbolic vocabulary of the planets.',
 'در آسترولوژی غربی هر سیاره به مجموعه‌ای از استعاره‌ها پیوند داده می‌شود. این پیوندها بخشی از تاریخ فرهنگ و تفسیرند؛ نه شواهدی برای اثر مستقیم سیارات بر شخصیت یا تصمیم‌های انسان.',
 'Western astrology connects planets to sets of metaphors. These associations belong to cultural and interpretive history, not evidence of direct planetary influence on human behavior.',{category:'fundamentals',sort_order:3});
seed('article','skywatching-basics','راهنمای مقدماتی رصد آسمان','A practical introduction to skywatching',
 'با چند گام ساده، صورت‌های فلکی را در آسمان پیدا کنید.','Simple steps to observing constellations and planets.',
 'برای شروع رصد آسمان، نقطه‌ای با نور مصنوعی کم انتخاب کنید و از نقشه آسمان متناسب با تاریخ و مکان خود کمک بگیرید. تلسکوپ الزامی نیست؛ ماه و سیارات درخشان را می‌توان با چشم یا دوربین دوچشمی مشاهده کرد.',
 'To start skywatching, choose a dark location and use a sky map for your date and location. You do not need a telescope to appreciate the Moon and bright planets.',{category:'skywatching',sort_order:4});
seed('product','celestial-journal','دفترچه سفر آسمانی','Celestial Journal',
 'دفتر تمرین و یادداشت‌های شخصی برای مطالعه آسمان.','A printable journal for celestial studies.',
 'نسخه PDF شامل صفحه‌های تمرین، ثبت مشاهدات و یادداشت‌های شخصی. فایل نمونه است و باید از پنل مدیریت جایگزین شود.',
 'A printable PDF workbook for observation and reflection. Demo entry; add a real file in the admin dashboard.',{category:'digital',price:350000,sale_price:265000,stock:-1,extra:{type:'digital'}});
seed('product','introductory-guide','راهنمای مقدماتی نشانه‌ها','Introduction to Zodiac Symbols',
 'مجموعه آموزشی مفاهیم پایه، مناسب شروع یادگیری.','An introductory digital guide to zodiac symbolism.',
 'کتاب آموزشی آشنایی با تاریخ و نمادهای زودیاک. برای عرضه واقعی باید فایل مجاز را به محصول اضافه کنید.',
 'Learn the history and symbolism of the zodiac. Attach a licensed file before selling.',{category:'digital',price:420000,stock:-1,extra:{type:'digital'}});
seed('product','moon-observation-calendar','تقویم ثبت فازهای ماه','Moon Observation Calendar',
 'تقویم چاپی مشاهده و ثبت چرخه‌های ماه.','A physical observation calendar for the lunar cycle.',
 'تقویم رومیزی برای ثبت مشاهده‌های شخصی. این یک محصول نمونه است.',
 'A desk calendar for recording your observations. Sample product.',{category:'physical',price:570000,sale_price:490000,stock:18,extra:{type:'physical'}});
seed('course','cosmic-foundations','مبانی آسترولوژی؛ از صفر','Astrology Foundations',
 'مسیر آموزشی گام‌به‌گام با مثال و تمرین.','A structured learning pathway with lessons and activities.',
 'سرفصل‌ها: تاریخ آسترولوژی، دایره بروج، سیارات، خانه‌ها و اخلاق تفسیر. محتوای نمونه برای مدیریت دوره.',
 'Syllabus: history of astrology, zodiac, planets, houses and interpretive ethics. Demo course content.',{price:1200000,sale_price:990000,extra:{lessons:12,duration:'8h',level:'beginner'}});
seed('course','lunar-symbols','نمادشناسی ماه','Lunar Symbolism',
 'مطالعه چرخه ماه در فرهنگ‌ها و روایت‌های تاریخی.','Moon symbolism across cultures and historical traditions.',
 'نگاهی فرهنگی و تاریخی به تفسیر نمادهای ماه و شیوه مشاهده چرخه‌های آن.',
 'A cultural and historical examination of lunar symbolism and observation.',{price:740000,extra:{lessons:8,duration:'5h',level:'intermediate'}});
seed('service','birth-chart-consultation','جلسه تفسیر نمادین چارت','Birth Chart Interpretation Session',
 'گفت‌وگوی آموزشی درباره مفاهیم نقشه تولد.','An educational session exploring the symbolism of a birth chart.',
 'جلسه ۶۰ دقیقه‌ای آنلاین. رزرو به معنای تایید نهایی زمان نیست و مدیر باید درخواست را بررسی کند.',
 'A 60-minute online session. Submitting a request does not confirm the appointment; staff will review availability.',{price:990000,extra:{duration:60}});
seed('service','learning-consultation','مشاوره مسیر یادگیری','Learning Path Consultation',
 'انتخاب منابع و برنامه مناسب برای مطالعه آسترولوژی.','Choose a suitable learning program and resources.',
 'جلسه ۴۵ دقیقه‌ای برای آشنایی با منابع و مسیرهای آموزشی.',
 'A 45-minute session about learning resources and study plans.',{price:490000,extra:{duration:45}});
seed('page','about','درباره آستریا','About Asteria',
 'فضایی برای مطالعه، یادگیری و گفت‌وگو درباره آسمان.','A place to study, learn and talk about the sky.',
 'آستریا بستری مستقل برای یادگیری مفاهیم نجومی و شناخت سنت‌های نمادین آسترولوژی است. تلاش می‌کنیم روایت تاریخی و نمادین را با دقت از یافته‌های علمی تفکیک کنیم.',
 'Asteria is an independent space for exploring astronomy and the symbolic traditions of astrology. We distinguish historical interpretation from established science.');
seed('page','research','پژوهش و انتشارات','Research & Publications',
 'منابع، مطالعات و پروژه‌های پژوهشی آستریا.','Resources, essays and Asteria research initiatives.',
 'این صفحه برای انتشار پروژه‌های پژوهشی، ترجمه‌ها، همکاری‌های علمی و معرفی منابع اختصاص یافته است. محتوای آن از پنل مدیریت ویرایش می‌شود.',
 'This page is dedicated to research projects, translations, collaborations and curated reading. Its content is editable in the dashboard.');
seed('faq','first-chart','برای دریافت چارت چه اطلاعاتی لازم است؟','What information is needed for a birth chart?',
 'تاریخ، ساعت، منطقه زمانی و مختصات جغرافیایی محل تولد.','Birth date, local time, UTC offset, and location coordinates.',
 'ساعت دقیق و منطقه زمانی تاریخی برای محاسبه طالع اهمیت دارند. ساعت تابستانی گذشته را هنگام تعیین اختلاف با UTC بررسی کنید.',
 'Accurate birth time and historical UTC offset matter for the Ascendant. Account for past daylight-saving rules.');
seed('faq','astrology-scientific','آیا آسترولوژی یک علم تجربی است؟','Is astrology an empirical science?',
 'خیر؛ تفسیرهای شخصیتی و پیش‌گویی‌های آسترولوژی پشتوانه علمی قابل اتکایی ندارند.','No. Its personality and predictive claims lack reliable scientific support.',
 'موقعیت سیارات را می‌توان به صورت نجومی محاسبه کرد، اما استنتاج شخصیت یا آینده از آن‌ها تایید علمی ندارد.',
 'Planetary positions can be computed astronomically, but inferring personality or the future from them is not scientifically validated.');
seed('testimonial','learner-a','تجربه هنرجو','Learner experience','محیط مطالعه منظم و قابل فهم بود.','A clear and accessible learning experience.','','',{extra:{authorFa:'یک هنرجو',authorEn:'A learner',rating:5}});
seed('banner','intro-banner','راهی تازه برای شناخت آسمان','A fresh approach to the sky',
 'مقاله‌های تازه و مسیرهای آموزشی را کاوش کنید.','Discover new essays and learning paths.','','',{extra:{link:'/blog',buttonFa:'مطالعه مقالات',buttonEn:'Explore articles'}});

for(const [kind,slug,fa,en,sort] of [
 ['article','fundamentals','مبانی آسترولوژی','Foundations',1],['article','moon','ماه و فازها','Moon & phases',2],
 ['article','skywatching','رصد آسمان','Skywatching',3],['product','digital','محصول دیجیتال','Digital',1],
 ['product','physical','محصول فیزیکی','Physical',2]]){
 run('INSERT OR IGNORE INTO categories(id,kind,slug,title_fa,title_en,sort_order) VALUES(?,?,?,?,?,?)',uid(),kind,slug,fa,en,sort);
}
const demoCourse=get("SELECT id FROM content WHERE slug='cosmic-foundations'");
if(demoCourse&&!get('SELECT id FROM lessons WHERE course_id=?',demoCourse.id)){
 for(const [idx,fa,en,textFa,textEn,preview] of [
 [1,'درآمدی بر تاریخ آسترولوژی','The history of astrology','آشنایی با زمینه فرهنگی شکل‌گیری آسترولوژی و تفاوت آن با ستاره‌شناسی علمی.','A cultural introduction to astrology and its differences from scientific astronomy.',1],
 [2,'نشانه‌های دوازده‌گانه','The twelve signs','آشنایی با نظام نمادین بروج و کاربرد آن در سنت‌های تفسیر.','An introduction to the zodiac as a symbolic system.',0],
 [3,'خانه‌های چارت','Chart houses','آشنایی با انواع خانه‌بندی و محدودیت‌های تفسیر نمادین.','Learn about astrological house systems and interpretive limitations.',0]])
 run('INSERT INTO lessons(id,course_id,title_fa,title_en,body_fa,body_en,preview,sort_order) VALUES(?,?,?,?,?,?,?,?)',uid(),demoCourse.id,fa,en,textFa,textEn,preview,idx);
}

}
run('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)','demoSeedCompleted',JSON.stringify(true));
