# نصب Asteria از GitHub روی Ubuntu 24.04

## پیش‌نیاز

- مخزن GitHub: `https://github.com/Hosseinmehrfard/asteria` با فایل‌های **استخراج‌شده** پروژه در ریشه شاخه `main`؛ خود ZIP را به‌تنهایی آپلود نکنید.
- دامنه متصل به IP VPS و پورت‌های TCP 80 و 443 آزاد؛ HTTPS را Caddy مدیریت می‌کند.
- دسترسی SSH و `sudo`، اینترنت سرور برای دانلود Docker image و پکیج‌های npm.

## نصب یک‌خطی (هم برای نصب جدید، هم پوشه موجود)

`example.com` را با دامنه سایت جایگزین کنید:

```bash
sudo apt-get update && sudo apt-get install -y curl git && (set -o pipefail; curl -fsSL https://raw.githubusercontent.com/Hosseinmehrfard/asteria/main/scripts/bootstrap-vps.sh | bash -s -- example.com)
```

این نصب‌کننده:

1. اگر `/opt/asteria` خالی یا غایب باشد، مخزن را دریافت می‌کند.
2. اگر `/opt/asteria/.git` موجود و متعلق به همان مخزن باشد، دوباره clone نمی‌کند.
3. اگر `.env` موجود باشد، هنگام اجرای سرویس بکاپ و آپدیت می‌کند؛ اگر سرویس متوقف یا نصب نیمه‌تمام باشد، ابتدا بکاپ سازگار می‌گیرد و نصب را ترمیم می‌کند. اگر نصب هنوز انجام نشده باشد، کد را می‌گیرد و نصب می‌کند.
4. پوشه نامرتبط یا دارای فایل‌های غیر Git را حذف یا بازنویسی نمی‌کند.

**در مخزن خصوصی** URL خام GitHub معمولاً نیاز به احراز هویت دارد. به‌جای دستور بالا، پس از تنظیم دسترسی Git، روی VPS دستور زیر را اجرا کنید (در صورت وجود مخزن، clone نکنید):

```bash
cd /opt/asteria && git pull --ff-only && bash scripts/install-vps.sh example.com
```

در صورت داشتن یک نصب فعال، برای حفظ بکاپ قبل از `git pull` از **دستور آپدیت** استفاده کنید، نه دستور نمونه فوق.

## ایجاد مدیر

نصب اولیه معمولاً ساخت مدیر را پیشنهاد می‌دهد. اگر آن مرحله رد شد:

```bash
cd /opt/asteria && sudo docker compose -f compose.yaml -f compose.vps.yaml exec web node server/setup-admin.js
```

رمز مدیر حداقل ۱۲ نویسه باشد. هنگام ورود رمز در ترمینال نسخه فعلی، ورودی ممکن است نمایش داده شود؛ در محیط خصوصی آن را وارد کنید.

## آپدیت یک‌خطی (با بکاپ قبل از تغییر کد)

```bash
cd /opt/asteria && bash scripts/update-vps.sh
```

فایل‌های دائمی در `/opt/asteria/storage/` باقی می‌مانند؛ `.env` به GitHub نمی‌رود. آپدیت خودکار فقط fast-forward Git را می‌پذیرد و تغییرات محلی فایل‌های tracked را بازنویسی نمی‌کند.

## وضعیت، خطاها و بکاپ

```bash
cd /opt/asteria && bash scripts/status-vps.sh
cd /opt/asteria && bash scripts/logs-vps.sh caddy
cd /opt/asteria && bash scripts/backup-vps.sh
```

بکاپ‌ها: `/opt/asteria/storage/backups/`. هنگام توقف برنامه، اسکریپت از API رسمی SQLite برای بکاپ سالم استفاده می‌کند؛ کپی ساده فایل اصلی دیتابیس به‌تنهایی کافی نیست. بکاپ باید خارج از VPS هم ذخیره شود.

## خطاهای رایج

- `destination path ... already exists`: از دستور نصب جدید بالا استفاده کنید؛ پوشه موجود را پاک نکنید.
- `Directory ... is not empty`: پوشه مربوط به مخزن نیست. محتویات را بررسی کنید؛ اسکریپت چیزی حذف نمی‌کند.
- `Docker daemon not reachable`: وضعیت سرویس Docker و دسترسی کاربر را بررسی کنید.
- `Address already in use`: پورت 80، 443 یا 4000 قبلاً استفاده شده؛ پورت‌های سایر سایت‌ها را بدون بررسی آزاد نکنید.
- `HTTPS not ready`: رکورد DNS، فایروال و لاگ Caddy را بررسی کنید. تأیید سلامت محلی API به معنای صدور موفق گواهی SSL نیست.
- `npm install/build error`: خطا از مخزن npm یا وابستگی‌های پروژه است؛ `bash scripts/logs-vps.sh web` و خروجی build را بررسی کنید.

## تنظیمات فنی

مقدارهای `DOMAIN` و `APP_ORIGIN` در `.env` برای هر VPS ذخیره می‌شوند. تغییر دامنه نیازمند ویرایش آگاهانه این فایل و اجرای مجدد سرویس‌هاست. سرور برنامه فقط روی `127.0.0.1:4000` منتشر می‌شود و Caddy درخواست‌های HTTPS را به آن هدایت می‌کند.

درگاه پرداخت واقعی، ایمیل تراکنشی و سیستم بازیابی رمز هنوز پیاده‌سازی نشده‌اند. این نسخه تا پیش از آزمون روی VPS واقعی، انتشار عمومی تجاری تأییدشده محسوب نمی‌شود.
