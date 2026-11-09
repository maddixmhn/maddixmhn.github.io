# سازمان ایجنت‌ها با Paperclip

هر پروژه در Paperclip یک شرکت جدا دارد. بالای هر شرکت ELON OS نشسته و زیرش مدیر دپارتمان‌ها و ایجنت‌ها هستند. Paperclip سرور Node با دیتابیس و پردازش ایجنت‌هاست، پس به همان سرور Docker نیاز دارد که n8n رویش است.

## نصب

از کامیت بررسی‌شدهٔ `0e3fdebea825` شروع کنید. فایل `docker/docker-compose.quickstart.yml` خود پروژه کافی است.

```bash
git clone https://github.com/paperclipai/paperclip && cd paperclip
git checkout 0e3fdebea825
cd docker
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)" > .env
echo "PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=$(openssl rand -hex 32)" >> .env
echo "PAPERCLIP_PUBLIC_URL=https://paperclip.example.com" >> .env
docker compose -f docker-compose.quickstart.yml up -d --build
```

در فایل compose مقدار `PAPERCLIP_DEPLOYMENT_EXPOSURE` را به `public` تغییر دهید، چون Worker باید از اینترنت به API برسد. جلوی آن nginx با TLS بگذارید و پورت 3100 را عمومی نکنید. کلید مدل‌ها را هم در محیط همین کانتینر بدهید.

## ساخت سازمان برای یک پروژه

```bash
git clone https://github.com/msitarzewski/agency-agents ../agency-agents
node org/build-company.mjs --agency ../agency-agents --name "Shiktak" --out org/out/shiktak \
  --elon-url https://<WORKER>/paperclip/heartbeat --size 1000 --adapter opencode_local --model <provider/model>
npx paperclipai company import ./org/out/shiktak --target new
```

اگر `--size` را ندهید، از هر نقش یک نفر ساخته می‌شود. برای رسیدن به ۱۰۰۰ نفر نقش‌ها تکرار می‌شوند. در صفحهٔ Import گزینهٔ شروع متوقف را روشن بگذارید تا هیچ ایجنتی پیش از تعیین بودجه کار نکند.

## وصل کردن ELON OS

1. در Paperclip برای ایجنت ELON OS یک API key بسازید.
2. در تنظیمات آداپتر همین ایجنت هدر `x-elon-secret` را برابر `PAPERCLIP_WEBHOOK_SECRET` روی Worker بگذارید. این مقدار عمداً در بستهٔ سازمان نیست.
3. در داشبورد، بخش «سازمان»، آدرس Paperclip و همان کلید را وارد کنید.

## ظرفیت واقعی

- ۱۰۰۰ ایجنت یعنی ۱۰۰۰ جایگاه تعریف‌شده. تعداد ایجنتی که هم‌زمان کار می‌کند را سقف API مدل‌ها و منابع سرور تعیین می‌کند. پلن‌های رایگان Groq و Gemini برای یک تیم کوچک هم‌زمان کافی‌اند، نه برای ۱۰۰۰ اجرای موازی.
- برای هر ایجنت بودجهٔ ماهانه تعریف می‌شود (پیش‌فرض ۱ دلار). جمع بودجهٔ ۱۰۰۰ ایجنت ۱۰۰۰ دلار در ماه است، پس پیش از روشن کردن همه، این عدد را کم کنید.
- پیشنهاد عملی: برای هر پروژه ELON، مدیران و چند ایجنت را روشن کنید و بقیه را متوقف نگه دارید تا ELON فقط وقتی کار هست صدایشان کند.
