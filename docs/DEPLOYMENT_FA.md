> **روش پیشنهادی VPS از GitHub:** راهنمای کامل و اسکریپت‌های نصب، به‌روزرسانی و پشتیبان‌گیری در [`GITHUB_VPS_FA.md`](GITHUB_VPS_FA.md) موجود است. راهنمای زیر برای استقرار دستی و جایگزین است.

# نصب و استقرار روی سرور

## A — بدون Docker

نصب Node.js 22.16+، کپی پروژه، ایجاد `.env` و نصب وابستگی‌ها:

```bash
cp .env.example .env
npm install
npm run setup-admin
npm run build
NODE_ENV=production APP_ORIGIN=https://example.com npm start
```

از یک reverse proxy مثل Caddy/Nginx با TLS معتبر برای پروکسی به `127.0.0.1:4000` استفاده کنید. در محیط production سرور را روی شبکه عمومی بی‌محافظ رها نکنید. برای اجرا به‌عنوان سرویس، systemd یا ابزار مدیریتی مشابه استفاده کنید.

## B — Docker Compose

```bash
mkdir -p storage/data storage/uploads
APP_ORIGIN=https://example.com docker compose up -d --build
docker compose exec web node server/setup-admin.js
```

`compose.yaml` پورت را به `127.0.0.1:4000` bind می‌کند. پراکسی HTTPS بیرونی باید روی همان میزبان باشد. در Docker مقدار `TRUST_PROXY=1` از پیش قرار داده شده است: آن را فقط با reverse proxy قابل‌اعتماد استفاده کنید.

### نمونه Caddyfile

```text
example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:4000
}
```

پس از تأمین رکورد DNS و باز بودن پورت‌های 80/443، Caddy گواهی معتبر را مدیریت می‌کند. در روش دستی این بخش، نصب و راه‌اندازی Caddy با خودتان است؛ روش پیشنهادی VPS در `GITHUB_VPS_FA.md` Caddy را به‌صورت کانتینر اجرا می‌کند.

## نکات عملیاتی ضروری

1. برای URL واقعی در `.env` یا محیط Compose، `APP_ORIGIN=https://your-domain` تنظیم کنید؛ در غیر این صورت فرم‌ها ممکن است به دلیل بررسی Origin رد شوند.
2. `NODE_ENV=production`، HTTPS و reverse proxy را هم‌زمان فعال کنید. کوکی‌های ورود با `Secure` روی HTTP کار نخواهند کرد.
3. فایل `.env`، `storage/`, `server/data/`, `server/uploads/` و `backups/` را خارج از کنترل نسخه نگه دارید. مجوز دسترسی فایل‌ها را محدود کنید.
4. هر شب بکاپ از SQLite و آپلودها، نگهداری چرخشی، آزمایش بازیابی و ثبت وضعیت فضای دیسک اجرا کنید.
5. مدیرها رمز تصادفی طولانی استفاده کنند. پس از اولین نصب نام کاربری مدیر وجود ندارد تا دستور setup اجرا شود.
6. اطلاعات نمایشی در سایت را با دارایی‌های قانونی، اطلاعات تماس و قوانین حریم خصوصی واقعی جایگزین کنید.
7. برای شروع دریافت پول، ابتدا **درگاه واقعی** را با وب‌هوک احراز امضا/استعلام سمت سرور، ثبت شناسه تراکنش و idempotency اضافه و آزمایش کنید؛ این نسخه درگاه ندارد.
8. امنیت عملیاتی، احراز هویت، مدیریت حساب، rate limit توزیع‌شده، ارسال ایمیل، افزایش مقیاس و تست نفوذ باید پیش از انتشار عمومی بررسی شوند.
9. SQLite برای یک سرور و بار عملیاتی متوسط مناسب است؛ برای رشد زیاد داده‌ها و استقرار چند‌نمونه‌ای به معماری بانک متناسب مهاجرت کنید.
10. در صورت تغییر جدی ساختار جدول‌ها، migration نسخه‌دار و سازگاری داده‌های قبلی لازم است؛ این نمونه migration framework مستقل ندارد.

## Backup در محیط Docker

در روش پیشنهادی با هر دو فایل Compose، پوشه `/app/backups` داخل کانتینر به `storage/backups` روی VPS متصل است؛ دستور `bash scripts/backup-vps.sh` برای بکاپ SQLite و آپلودها استفاده شود. در روش دستی تنها با `compose.yaml`، پوشه `/app/backups` پایدار نیست و باید mount جداگانه تنظیم شود.

## تست سرویس

```bash
curl http://127.0.0.1:4000/api/health
```

پاسخ انتظار: `{"service":"asteria","status":"ok","version":"1.1.0"}`.
