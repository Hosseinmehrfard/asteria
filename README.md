# ASTERIA — وب‌سایت آسترولوژی فارسی و انگلیسی

پروژه مستقل **React + Vite / Express + Node.js / SQLite** با رابط RTL/LTR و پنل مدیریت در `/admin`. مناسب قرار گرفتن در GitHub و استقرار روی **Ubuntu 24.04 VPS** با Docker Compose و Caddy (HTTPS).

> **نسخه 1.1 — MVP توسعه‌پذیر**. اتصال واقعی درگاه پرداخت، ایمیل/پیامک، بازیابی رمز ایمیلی و برخی قابلیت‌های تولیدی هنوز پیاده‌سازی نشده‌اند. اجرای واقعی Docker و تست مرورگر در محیط تولیدکننده تأیید نشده است.

## امکانات

- سایت: صفحه اصلی، مقاله، فروشگاه، دوره و درس، چارت تولد، تقویم ماه، خدمات و رزرو، تماس، صفحات اختصاصی، حساب کاربری و سبد خرید.
- پنل مدیریت: محتوا، محصولات، دوره‌ها، درس‌ها، دسته‌بندی‌ها، صفحات، بنرها، کاربران و نقش‌ها، سفارش‌ها، رزرو، تخفیف‌ها، فایل‌های عمومی/خصوصی، پیام‌ها، خبرنامه، تنظیمات، آمار و گزارش فعالیت‌ها.
- داده‌ها، رمزهای محیطی، آپلودها و بکاپ‌ها در سرور قرار می‌گیرند و نباید وارد GitHub شوند.

## نصب آسان با یک خط روی VPS

**پیش‌نیاز:** دامنه واقعی با رکورد DNS به IP سرور، پورت TCP 80 و 443 آزاد، Ubuntu 24.04 و دسترسی SSH با `sudo`.

جای `example.com`، دامنه واقعی خود را بنویسید. این دستور **اگر `/opt/asteria` قبلاً از همین GitHub کلون شده باشد دوباره clone نمی‌کند**؛ مسیر به‌روزرسانی را انجام می‌دهد و اطلاعات موجود را پاک نمی‌کند.

```bash
sudo apt-get update && sudo apt-get install -y curl git && (set -o pipefail; curl -fsSL https://raw.githubusercontent.com/Hosseinmehrfard/asteria/main/scripts/bootstrap-vps.sh | bash -s -- example.com)
```

**توجه:** ابتدا فایل‌های این نسخه را در شاخه `main` مخزن `Hosseinmehrfard/asteria` آپلود و ثبت کنید؛ دستور بالا اسکریپت همان مخزن را دریافت می‌کند. برای مخزن خصوصی یا URL متفاوت، [راهنمای استقرار](docs/GITHUB_VPS_FA.md) را ببینید.

پس از نصب موفق:

- سایت: `https://example.com`
- پنل مدیریت: `https://example.com/admin`
- ایجاد اولین مدیر (یک بار، در ترمینال SSH):

```bash
cd /opt/asteria && sudo docker compose -f compose.yaml -f compose.vps.yaml exec web node server/setup-admin.js
```

## آپدیت یک‌خطی

پس از ثبت نسخه جدید در GitHub:

```bash
cd /opt/asteria && bash scripts/update-vps.sh
```

اسکریپت ابتدا از پایگاه داده و آپلودها بکاپ می‌گیرد، سپس با `git pull --ff-only` نسخه جدید را دریافت، ایمیج را می‌سازد و سلامت API را بررسی می‌کند.

## دستورات مدیریتی

```bash
cd /opt/asteria && bash scripts/status-vps.sh  # وضعیت و سلامت سایت
cd /opt/asteria && bash scripts/logs-vps.sh    # آخرین خطاهای اپلیکیشن
cd /opt/asteria && bash scripts/backup-vps.sh  # بکاپ دستی
```

بکاپ در `/opt/asteria/storage/backups` ایجاد می‌شود. نسخه‌ای از آن را در محلی خارج از VPS نگه دارید.

## توسعه روی کامپیوتر

با Node.js 22.16 یا جدیدتر:

```bash
npm install
npm run setup-admin
npm run dev
```

- React: `http://localhost:5173`
- بک‌اند: `http://localhost:4000/api/health`
- آزمون پایگاه داده: `node --test server/tests/db.test.js`
- آزمون کامل (پس از نصب وابستگی‌ها): `npm test && npm run build`

## مستندات

- [راهنمای GitHub / VPS](docs/GITHUB_VPS_FA.md)
- [راهنمای پنل مدیریت](docs/ADMIN_GUIDE_FA.md)
- [روش‌های دستی استقرار](docs/DEPLOYMENT_FA.md)
- [گزارش اصلاحات نسخه 1.1](docs/CHANGELOG_FA.md)
- [محدودیت‌های شناخته‌شده](docs/KNOWN_LIMITATIONS.md)

**پرداخت:** سفارش‌ها بدون درگاه واقعی در حالت `awaiting_payment` باقی می‌مانند. تأیید پرداخت در پنل باید فقط پس از دریافت واقعی وجه انجام شود.
