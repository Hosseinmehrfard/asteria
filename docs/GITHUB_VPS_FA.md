# راهنمای GitHub ← VPS برای Asteria

این روش برای **یک VPS با Ubuntu Server 24.04 LTS**، یک **دامنه واقعی**، SSH و دسترسی `sudo` نوشته شده است. نصب با Docker Compose انجام می‌شود؛ سایت روی پورت‌های 80 و 443 از طریق Caddy و HTTPS ارائه می‌شود. برنامه React و API در یک سرویس قرار دارند. داده‌ها روی دیسک VPS ذخیره می‌شوند، نه در مخزن GitHub.

## ۱) پیش‌نیازها

- یک دامنه، مثلاً `astro.example.com` (این یک آدرس نمونه است؛ دامنه خودتان را جایگزین کنید).
- رکورد DNS نوع A به IP عمومی VPS و، در صورت استفاده، AAAA به IPv6 واقعی VPS اشاره کند.
- TCP پورت‌های 80/443 در فایروال VPS و پنل سرویس‌دهنده باز باشند. پورت SSH خود را حفظ کنید. در صورت استفاده از UFW، فقط روی سرور خودتان `sudo ufw allow 80/tcp` و `sudo ufw allow 443/tcp` را اجرا کنید. نیازی به باز کردن پورت 4000 نیست.
- هیچ سرویس دیگری (Apache/Nginx/Caddy) روی همان پورت‌های 80/443 میزبان فعال نباشد. برای سرور اشتراکی باید تنظیم reverse proxy موجود را به‌جای افزودن Caddy دوم تطبیق دهید.
- DNS و دسترسی سرور به رجیستری npm / Docker Hub برای ساخت ایمیج.

## ۲) ایجاد مخزن GitHub

در GitHub یک repository جدید با نام دلخواه مثلاً `asteria-platform` ایجاد کنید؛ هنگام ایجاد آن گزینه README یا فایل‌های اضافی را انتخاب نکنید (مخزن خالی). **Private** توصیه می‌شود، زیرا سورس سایت اختصاصی است.

در رایانه شخصی، محتویات *پوشه پروژه* را از ZIP استخراج کنید. فایل ZIP را به عنوان تنها فایل repository آپلود نکنید. از ترمینال همان پوشه:

```bash
git init -b main
git add .
git commit -m "Initial Asteria bilingual platform"
git remote add origin https://github.com/YOUR_USERNAME/asteria-platform.git
git push -u origin main
```

`YOUR_USERNAME` نام کاربری GitHub شما است. برای مخزن Private، GitHub ممکن است توکن دسترسی، Git Credential Manager یا SSH بخواهد. **توکن را هرگز در URL ذخیره‌شده در فایل‌های پروژه یا در دستورهای عمومی سرور قرار ندهید.** فایل‌های `.env` و مسیرهای `storage/`, `server/data/`, `server/uploads/`, `backups/` با `.gitignore` از Git خارج شده‌اند.

می‌توانید پیش از Push اجرا کنید:

```bash
bash scripts/check-repo.sh
```

GitHub Actions با هر push روی `main`، نحو، تست‌های موجود و build رابط را بررسی می‌کند؛ موفق بودن این گردش کار جایگزین آزمون کامل وب‌سایت نیست.

## ۳) اتصال به VPS و دریافت پروژه

```bash
ssh YOUR_VPS_USER@YOUR_VPS_IP
sudo apt-get update
sudo apt-get install -y git
sudo mkdir -p /opt/asteria
sudo chown "$USER":"$(id -gn)" /opt/asteria
cd /opt/asteria
```

برای مخزن **عمومی**:

```bash
git clone https://github.com/YOUR_USERNAME/asteria-platform.git .
```

برای مخزن **خصوصی**، یک کلید SSH اختصاصی Deploy Key با سطح دسترسی read-only را طبق راهنمای GitHub به مخزن وصل کنید و سپس:

```bash
git clone git@github.com:YOUR_USERNAME/asteria-platform.git .
```

کلید خصوصی SSH و توکن دسترسی را داخل پوشه پروژه ذخیره نکنید.

## ۴) نصب یک‌مرحله‌ای سرویس روی VPS

در پوشه `/opt/asteria`:

```bash
bash scripts/install-vps.sh astro.example.com
```

اسکریپت:

1. در Ubuntu 24.04، در صورت فقدان Docker/Compose، آنها را از مخازن Ubuntu نصب می‌کند. اگر Docker موجود باشد، نصب مجدد لازم نیست.
2. `.env` مخصوص همان سرور را با `DOMAIN` و `APP_ORIGIN` ایجاد می‌کند (اگر `.env` وجود داشته باشد و با دامنه ناسازگار باشد، آن را بی‌اجازه بازنویسی نمی‌کند).
3. دایرکتوری پایدار `storage/` را ایجاد می‌کند.
4. اپلیکیشن و Caddy را با Compose می‌سازد و اجرا می‌کند.
5. API سلامت را روی `127.0.0.1:4000/api/health` بررسی می‌کند.
6. در اتصال SSH تعاملی، امکان ایجاد حساب مدیر را می‌دهد.

در صورت رد کردن ایجاد مدیر، از همان پوشه اجرا کنید:

```bash
docker compose -f compose.yaml -f compose.vps.yaml exec web node server/setup-admin.js
```

اگر کاربر لینوکس اجازه ارتباط با Docker را ندارد، به ابتدای دستور بالا `sudo` اضافه کنید. برای مدیر، ایمیل معتبر و **رمز ۱۲ کاراکتر یا بیشتر** انتخاب کنید. در ابزار ساخت مدیر، رمز هنگام تایپ نمایان است؛ فقط در محیط SSH خصوصی اجرا کنید.

آدرس سایت: `https://astro.example.com`  
ورود: `https://astro.example.com/login`  
پنل مدیریت: `https://astro.example.com/admin`

**SSL:** گواهی TLS بعد از صحیح بودن DNS و باز بودن پورت‌های 80/443 توسط Caddy درخواست و نوسازی می‌شود. نصب Docker به‌تنهایی تضمین صدور گواهی نیست. با IP خام، کوکی ورود نسخه production از طریق HTTP کار نمی‌کند؛ برای ورود مدیر به HTTPS دامنه نیاز است.

## ۵) به‌روزرسانی از GitHub بدون پاک شدن داده‌ها

بعد از تغییر کد و `git push` روی کامپیوتر شخصی، در VPS:

```bash
cd /opt/asteria
bash scripts/update-vps.sh
```

این دستور اول از دیتابیس و آپلودها **در `storage/backups`** پشتیبان می‌گیرد، سپس با `git pull --ff-only` تغییرات را دریافت و تصویر Docker را مجدداً build می‌کند. فایل `.env`، دیتابیس SQLite، آپلودها و گواهی‌های SSL خارج از Git و خارج از لایه کانتینر باقی می‌مانند. اگر کد tracked روی VPS به‌طور محلی تغییر کرده باشد، به‌روزرسانی متوقف می‌شود تا تغییری از بین نرود.

این اسکریپت migration پیچیده دیتابیس را اجرا نمی‌کند. در ارتقاهایی که جدول‌ها/فرمت داده تغییر می‌کند، باید قبل از آپدیت migration مخصوص همان نسخه نوشته و تست شود.

## ۶) پشتیبان‌گیری و بازیابی

```bash
cd /opt/asteria
bash scripts/backup-vps.sh
```

دو خروجی به نام‌های دارای زمان UTC در `storage/backups/` تولید می‌شود: یکی **SQLite** (با SQLite Backup API) و یکی **فایل‌های آپلودشده** (`tar.gz`). برای فاجعه سرور، حتماً این خروجی‌ها را روی فضای دیگری منتقل کنید؛ بکاپ در همان VPS کافی نیست.

برای بازیابی (در زمان توقف سرویس و پس از گرفتن کپی جداگانه از داده فعلی):

```bash
cd /opt/asteria
docker compose -f compose.yaml -f compose.vps.yaml stop web
# فایل بکاپ مورد نظر را در storage/data/asteria.sqlite کپی کنید.
# فولدر storage/uploads/ را از آرشیو مربوط به همان بکاپ بازیابی کنید.
docker compose -f compose.yaml -f compose.vps.yaml start web
```

بازیابی **باید با جفت دیتابیس و آپلودهای سازگار** انجام شود. اگر در کانتینر فایل SQLite متعلق به root است، عملیات فایل‌ها را با `sudo` اجرا کنید؛ قبل از جایگزینی داده، `asteria.sqlite-wal` و `asteria.sqlite-shm` مربوط به نسخه قبلی را با احتیاط پس از توقف فرآیند و تهیه نسخه نجات مدیریت کنید. روی داده واقعی بدون آزمایش بازیابی عمل نکنید.

## ۷) دستورات مدیریتی روی سرور

```bash
# وضعیت سرویس‌ها
docker compose -f compose.yaml -f compose.vps.yaml ps

# خطاها و وقایع برنامه
docker compose -f compose.yaml -f compose.vps.yaml logs --tail=100 web

# وقایع HTTPS و Caddy
docker compose -f compose.yaml -f compose.vps.yaml logs --tail=100 caddy

# بررسی API روی خود VPS
curl -fsS http://127.0.0.1:4000/api/health
```

اگر برای اجرای Docker به `sudo` نیاز است، به ابتدای دستورهای Docker آن را اضافه کنید.

## محدودیت‌های فعلی

- این نسخه هنوز درگاه پرداخت واقعی و تأیید وب‌هوکی، ایمیل تراکنشی، بازیابی رمز از ایمیل، و رزرو دارای بررسی تداخل زمانی ندارد.
- پیش از عرضه تجاری، داده‌های نمایشی، محصولات، اطلاعات تماس، خط‌مشی حریم خصوصی و مقررات فروش باید تکمیل شوند.
- آزمون‌های CI هسته و build هستند؛ تضمین بی‌نقص بودن UI، پرداخت یا استحکام در بار بالا نیستند.
- برای VPS که Docker یا Caddy از قبل روی پورت‌های 80/443 دارد، نصب پیش‌فرض را بدون هماهنگی با سرویس موجود اجرا نکنید.
