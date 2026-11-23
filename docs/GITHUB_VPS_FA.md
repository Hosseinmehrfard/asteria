# راهنمای کوتاه نصب Asteria از GitHub روی VPS

**مناسب برای:** Ubuntu Server 24.04، دامنه اختصاصی، دسترسی SSH و `sudo`؛ نصب با Docker Compose و HTTPS خودکار Caddy.

## ۱. آماده‌سازی GitHub

ZIP پروژه را استخراج کرده و **فایل‌های داخل پوشه** را در یک مخزن GitHub خالی بارگذاری کنید؛ خود ZIP را به‌جای سورس قرار ندهید.

```bash
git init -b main && git add . && git commit -m "Initial Asteria" && git remote add origin https://github.com/USERNAME/REPO.git && git push -u origin main
```

پوشه‌های `storage/`، `server/data/`، `server/uploads/` و فایل `.env` نباید به GitHub بروند. برای مخزن Private، دسترسی Git روی VPS را پیشاپیش تنظیم کنید.

## ۲. نصب یک‌خطی روی VPS

ابتدا DNS دامنه را به IP سرور متصل کنید؛ پورت‌های TCP **80 و 443** باید باز باشند. روی سرور دیگری که همین پورت‌ها را اشغال کرده است، نصب پیش‌فرض مناسب نیست.

`USERNAME/REPO` را به نام مخزن و `example.com` را به دامنه واقعی تغییر دهید:

```bash
sudo apt-get update && sudo apt-get install -y git && sudo mkdir -p /opt/asteria && sudo chown "$(id -u):$(id -g)" /opt/asteria && git clone https://github.com/USERNAME/REPO.git /opt/asteria && cd /opt/asteria && bash scripts/install-vps.sh example.com
```

پس از اجرای موفق: `https://example.com` و `https://example.com/admin`. صدور گواهی HTTPS به DNS و دسترسی شبکه بستگی دارد.

## ۳. آپدیت یک‌خطی از GitHub

ابتدا تغییرات را در GitHub ثبت کنید، سپس روی VPS:

```bash
cd /opt/asteria && bash scripts/update-vps.sh
```

این اسکریپت پیش از `git pull --ff-only` از دیتابیس SQLite و آپلودها بکاپ می‌گیرد، سرویس را بازسازی می‌کند و سلامت API را بررسی می‌کند. فایل‌ها و داده‌های ماندگار در `storage/` باقی می‌مانند.

## ۴. فرمان‌های ضروری

**ساخت اولین مدیر** (در صورت رد کردن مرحله ایجاد مدیر در نصب):

```bash
cd /opt/asteria && sudo docker compose -f compose.yaml -f compose.vps.yaml exec web node server/setup-admin.js
```

**بکاپ دستی:**

```bash
cd /opt/asteria && bash scripts/backup-vps.sh
```

**بررسی وضعیت سایت:**

```bash
cd /opt/asteria && sudo docker compose -f compose.yaml -f compose.vps.yaml ps
```

**مشاهده خطاها:**

```bash
cd /opt/asteria && sudo docker compose -f compose.yaml -f compose.vps.yaml logs --tail=100 web
```

بکاپ‌ها در `storage/backups/` قرار می‌گیرند؛ نسخه‌ای جداگانه خارج از VPS نگهداری شود.

## نکات مهم

- دستور نصب فقط برای **نصب اولیه در `/opt/asteria`** است؛ برای نسخه‌های بعدی دستور آپدیت را اجرا کنید.
- فایل `.env`، اطلاعات کاربران و فایل‌های آپلودشده را به GitHub انتقال ندهید.
- سرویس پرداخت واقعی و ایمیل تراکنشی هنوز متصل نشده‌اند. آزمون استقرار واقعی VPS انجام نشده است.
- جزئیات بیشتر: [استقرار پیشرفته](DEPLOYMENT_FA.md)، [پنل مدیریت](ADMIN_GUIDE_FA.md)، [محدودیت‌ها](KNOWN_LIMITATIONS.md).
