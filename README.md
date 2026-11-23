# Asteria | وب‌سایت دو‌زبانه آسترولوژی

وب‌سایت فارسی/انگلیسی (RTL/LTR) با **React + Vite**، **Node.js + Express**، **SQLite** و پنل مدیریت اختصاصی. طراحی و محتوای اولیه مستقل از سایت مرجع هستند.

> **وضعیت:** نسخه اولیه (MVP). پرداخت آنلاین، ارسال ایمیل و بازیابی رمز ایمیلی فعال نیستند. پیش از استفاده تجاری باید سرویس‌ها و تنظیمات تکمیل و روی سرور واقعی آزموده شوند.

## امکانات

- **سایت:** صفحه اصلی، وبلاگ، فروشگاه، آکادمی و درس‌ها، چارت تولد، تقویم ماه، خدمات و رزرو درخواست، صفحات اختصاصی، تماس، سبد خرید و حساب کاربری.
- **پنل مدیریت `/admin`:** ۲۲ بخش شامل مدیریت مقاله، محصول، دوره، درس، دسته‌بندی، سفارش، کاربر و نقش، رزرو، تخفیف، رسانه و فایل خصوصی، صفحات، بنر، پیام، خبرنامه، تنظیمات، گزارش‌ها و سوابق اقدامات.
- **داده‌ها:** پایگاه داده و فایل‌های کاربر روی VPS ذخیره می‌شوند، نه در GitHub. اسکریپت به‌روزرسانی قبل از دریافت کد جدید، پشتیبان تهیه می‌کند.

## نصب آسان از GitHub روی VPS

**پیش‌نیاز:** Ubuntu 24.04، دسترسی SSH و `sudo`، دامنه با DNS متصل به IP سرور، پورت‌های باز 80/443، مخزن GitHub قابل‌دسترسی.

**۱. نصب یک‌خطی** — `USERNAME/REPO` و `example.com` را با اطلاعات خود جایگزین کنید:

```bash
sudo apt-get update && sudo apt-get install -y git && sudo mkdir -p /opt/asteria && sudo chown "$(id -u):$(id -g)" /opt/asteria && git clone https://github.com/USERNAME/REPO.git /opt/asteria && cd /opt/asteria && bash scripts/install-vps.sh example.com
```

اسکریپت، Docker/Compose (در صورت نیاز) را نصب می‌کند و سایت را با Caddy و HTTPS اجرا می‌کند. برای GitHub خصوصی، احراز هویت Git باید قبلاً تنظیم شده باشد.

**۲. آپدیت یک‌خطی** — همراه با بکاپ خودکار قبل از دریافت نسخه جدید:

```bash
cd /opt/asteria && bash scripts/update-vps.sh
```

**۳. ساخت حساب مدیر** (اگر در نصب اولیه ایجاد نشده است):

```bash
cd /opt/asteria && sudo docker compose -f compose.yaml -f compose.vps.yaml exec web node server/setup-admin.js
```

**۴. بکاپ دستی:**

```bash
cd /opt/asteria && bash scripts/backup-vps.sh
```

پس از نصب: `https://example.com` | پنل: `https://example.com/admin`

## بارگذاری روی GitHub

محتویات پوشه استخراج‌شده را در یک **repository خالی** قرار دهید؛ خود فایل ZIP را به‌تنهایی بارگذاری نکنید. در همان پوشه:

```bash
git init -b main && git add . && git commit -m "Initial Asteria" && git remote add origin https://github.com/USERNAME/REPO.git && git push -u origin main
```

**مهم:** فایل `.env`، پوشه `storage/`، پایگاه داده، آپلودها و بکاپ‌ها را در GitHub قرار ندهید؛ در `.gitignore` مستثنا شده‌اند. مخزن Private برای سورس اختصاصی مناسب‌تر است.

## راهنماها

- [راهنمای کوتاه نصب و آپدیت GitHub/VPS](docs/GITHUB_VPS_FA.md)
- [راهنمای پنل مدیریت](docs/ADMIN_GUIDE_FA.md)
- [استقرار پیشرفته](docs/DEPLOYMENT_FA.md)
- [محدودیت‌های شناخته‌شده](docs/KNOWN_LIMITATIONS.md)

**یادآوری:** سفارش‌ها بدون اتصال درگاه، در انتظار پرداخت ثبت می‌شوند و فقط پس از تأیید واقعی وجه توسط مدیر قابل تأیید هستند. آزمون یکپارچه رابط در مرورگر و استقرار واقعی روی VPS هنوز تأیید نشده است.
