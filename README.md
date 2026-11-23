# ASTERIA  — React | پنل مدیریت کامل | فارسی / انگلیسی | PWA


## نصب یک‌خطی از مخزن GitHub روی VPS


```bash
sudo apt-get update && sudo apt-get install -y curl git && (set -o pipefail; curl -fsSL https://raw.githubusercontent.com/Hosseinmehrfard/asteria/main/scripts/bootstrap-vps.sh | bash -s -- example.com)
```


**ایجاد اولین مدیر (یک بار):**

```bash
cd /opt/asteria && docker compose -f compose.yaml -f compose.vps.yaml exec web node server/setup-admin.js
```

سایت: `https://example.com` · پنل: `https://example.com/admin`

## آپدیت / بررسی وضعیت / بکاپ

```bash
cd /opt/asteria && bash scripts/update-vps.sh
cd /opt/asteria && bash scripts/status-vps.sh
cd /opt/asteria && bash scripts/backup-vps.sh
```

دستور آپدیت ابتدا بکاپ می‌گیرد، سپس فقط با `git pull --ff-only` نسخه جدید را دریافت کرده و سرویس را مجدداً می‌سازد. بکاپ‌ها در `storage/backups` قرار می‌گیرند؛ نسخه خارج از VPS نیز نگهداری شود. عملیات آپدیت به مخزن تمیز و بدون تغییر فایل‌های تحت Git نیاز دارد.


## توسعه و آزمون محلی

Node.js 22.16 یا جدیدتر:

```bash
npm install
npm run setup-admin
npm run dev
npm test
npm run build
```

فرانت‌اند: `http://localhost:5173` · API: `http://localhost:4000/api/health`. برای نسخه تولیدی از `npm start` بعد از `npm run build` استفاده کنید. CI در GitHub Actions تست‌های سرور، ساخت React، بررسی PWA و Docker را اجرا می‌کند.

## محدودیت‌های مهم

درگاه پرداخت واقعی و ایمیل/پیامک تراکنشی وصل نشده‌اند. سفارش در انتظار تأیید دستی پرداخت می‌ماند. ویدئوی عمومی تعبیه‌شده و URL ویدئوی آپلودشده DRM یا محافظت در برابر بازنشر ندارد. نقشه تولد محاسبه نجومی/نمایش نمادین است، نه پیش‌بینی علمی. HTTPS و تنظیم صحیح DNS برای PWA و SSL ضروری است. نتیجه آزمون‌های محلی و CI باید پیش از استقرار تجاری بررسی شود.
