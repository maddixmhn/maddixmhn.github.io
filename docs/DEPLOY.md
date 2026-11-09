# راه‌اندازی پلتفرم

ترتیب زیر مهم است، چون هر مرحله خروجی مرحلهٔ قبل را لازم دارد. سرویس‌ها جدا از هم روشن می‌شوند و سایت قدیمی تا مرحلهٔ آخر دست نمی‌خورد.

## ۱. Supabase

یک پروژهٔ رایگان جدید بسازید و فایل `supabase/migrations/20261109000000_platform.sql` را اجرا کنید. پروژهٔ `drkimiahabibi-db` متعلق به مشتری است و برای این کار استفاده نمی‌شود.

در Authentication ثبت‌نام عمومی را ببندید و فقط حساب خودتان را از Users بسازید. سه مقدار لازم است: آدرس پروژه، کلید publishable برای مرورگر و کلید secret برای Worker.

## ۲. ربات تلگرام

از BotFather ربات بسازید و توکن را نگه دارید. یک رشتهٔ تصادفی هم برای `TELEGRAM_WEBHOOK_SECRET` بسازید.

## ۳. Cloudflare Worker

```bash
cd worker
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ELON_MASTER_KEY
npx wrangler deploy
```

مقدار `ELON_MASTER_KEY` باید ۳۲ بایت base64 باشد و با `openssl rand -base64 32` ساخته می‌شود. اگر گم شود، کلیدهای ذخیره‌شدهٔ ELON دیگر باز نمی‌شوند.

بعد وبهوک تلگرام را وصل کنید:

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://<WORKER>/telegram/webhook" -d "secret_token=<SECRET>"
```

به ربات `/start` بدهید؛ شناسهٔ چت را برمی‌گرداند. آن را در `TELEGRAM_ADMIN_CHAT_ID` بگذارید و دوباره دیپلوی کنید.

## ۴. n8n

n8n روی GitHub Pages یا Worker اجرا نمی‌شود و به یک سرور با Docker نیاز دارد. راهنمای کامل در `infra/n8n/README.md` است. بعد از بالا آمدن، از Settings یک API key بسازید و `N8N_BASE_URL` و `N8N_API_KEY` را روی Worker بگذارید.

## ۴٫۵. سازمان ایجنت‌ها

طبق `infra/paperclip/README.md` پیش بروید و روی Worker سکرت `PAPERCLIP_WEBHOOK_SECRET` را بسازید. مایگریشن `20261110000000_elon_org.sql` هم باید اجرا شده باشد.

## ۵. متغیرهای build سایت

در GitHub، مسیر Settings > Secrets and variables > Actions > Variables:

- `PUBLIC_API_URL`
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_N8N_EDITOR_URL`

این‌ها در خروجی سایت عمومی می‌شوند، پس کلید secret هرگز اینجا نمی‌آید.

## ۶. انتقال

انتقال با تغییر `.github/workflows/static.yml` انجام می‌شود تا به‌جای ریشهٔ ریپو، خروجی `site/dist` منتشر شود. برگشت با revert همان کامیت انجام می‌شود.

بعد از انتشار این موارد را با دست بررسی کنید: ارسال یک پیام آزمایشی و رسیدن آن به تلگرام، پاسخ در تلگرام و دیده‌شدن آن در ویجت، ورود به داشبورد، باز شدن ادیتور n8n و ثبت سایت در Google Search Console.
