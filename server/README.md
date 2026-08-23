# maddix bridge — Telegram ↔ سایت

پل ارتباط دوطرفه بین ویجت تماس سایت و تلگرام maddix (`@MadiM1992`).

## راهاندازی (یکبار — ۲ دقیقه)

1. در تلگرام به **@BotFather** پیام بده:
   - `/newbot` → اسم: `maddix site bot` → یوزرنیم: مثلا `maddix_site_bot`
   - توکن `123456:ABC...` را کپی کن
2. **با اکانت خودت (MadiM1992)** به ربات `/start` بده — سرور خودکار تو را بهعنوان ادمین ثبت میکند
3. روی VPS:

```bash
sudo mkdir -p /opt/maddix-bridge && cd /opt/maddix-bridge
# فایل index.js را همینجا بگذار
sudo tee .env >/dev/null <<'EOF'
TG_TOKEN=123456:ABC-your-token-here
ADMIN_USERNAME=MadiM1992
ALLOWED_ORIGINS=https://maddixmhn.github.io
PORT=8787
EOF
sudo cp chatpaw-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now chatpaw-bridge
```

4. nginx (سرور shiktak.com) — داخل بلاک https:

```nginx
location /ai/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

`sudo nginx -t && sudo systemctl reload nginx`

## تست

```bash
curl -s https://shiktak.com/healthz          # {"ok":true,"admin":true}
curl -X POST https://shiktak.com/ai/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"test","message":"سلام از تست","sid":"test01","lang":"fa"}'
# → باید همان لحظه در تلگرامت بیاید؛ ریپلای کن → در پاسخ polling میآید
```

## نکتهها
- `state.json` ترد‌ها را نگه میدارد؛ پاک کردنش = ریست تاریخچه
- ریپلای ادمین فقط با **swipe-reply روی پیام دارای #تیکت** مسیردهی میشود
- rate limit ‏۶ پیام/دقیقه برای هر IP
