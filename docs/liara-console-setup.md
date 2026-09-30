# راه‌اندازی کنسول لیارا برای دوباره 🌿

این سند کارهای **دستی داخل کنسول لیارا و گیت‌هاب** است — کد و اتوماسیون از قبل در ریپو آماده‌اند (`liara.json`، `.github/workflows/ci.yml`، هوک‌ها و مایگریشن‌ها).

> ⚠️ توکن لیارا، `DATABASE_URL` و رمزها **فقط** در کنسول لیارا و GitHub Secrets وارد می‌شوند — هرگز در چت، فایل‌های ریپو یا کد.

## ۱) تیم و شبکه

1. وارد حساب لیارا شوید — **همان تیمی** که Team ID آن را در GitHub Environment گذاشته‌اید.
2. از بخش Networks یک **شبکه خصوصی جدید** بسازید با نام `dobare` (جدا از شبکه‌های هادیران).

## ۲) دیتابیس

1. یک سرویس **PostgreSQL** بسازید با شناسه‌ی `dobare-db` و آن را روی شبکه‌ی `dobare` بگذارید.
2. **دسترسی عمومی (Public) دیتابیس را خاموش نگه دارید.**
3. `DATABASE_URL` را از بخش **شبکه خصوصی** بردارید — شکل کلی:
   ```
   postgresql://USER:PASSWORD@dobare-db:5432/postgres
   ```
   (هست = شناسه‌ی دیتابیس یعنی `dobare-db`؛ نه آدرس عمومی `*.liara.cloud` و نه پورت تصادفی عمومی)

## ۳) برنامه

1. یک برنامه‌ی جدید با پلتفرم **Next.js** بسازید با شناسه‌ی `dobare` روی همان شبکه‌ی `dobare`.
   - Node نسخه **۲۲**، پورت **۳۰۰۰**
2. کد را به‌صورت zip آپلود **نکنید** — استقرار از GitHub Actions انجام می‌شود.
3. **دیسک پایدار:** در صفحه‌ی خود برنامه، بخش **دیسک‌ها** ← «ایجاد دیسک» ← شناسه: `uploads`، حجم مثلاً ۱ گیگابایت (از فضای پلن برنامه کسر می‌شود؛ نیازی به خرید جداگانه نیست).
   - مسیر اتصال دیسک در فایل `liara.json` ریپو تعریف شده است (`/app/data/uploads`) — کاری از سمت شما لازم نیست.
   - متغیر `UPLOAD_DIR` برنامه را دقیقاً `/app/data/uploads` بگذارید (وگرنه عکس‌ها بعد از هر دیپلوی پاک می‌شوند).

## ۴) متغیرهای ران‌تایم (بخش Settings → ENV Vars برنامه)

| متغیر | الزامی؟ | توضیح |
|---|---|---|
| `DATABASE_URL` | ✅ اجباری | URI شبکه خصوصی از بخش ۲ |
| `ADMIN_PASSWORD` | ✅ اجباری | رمز ورود به `/admin` |
| `UPLOAD_DIR` | ✅ | همان مسیر Disk، مثل `/app/data/uploads` |
| `NEXT_PUBLIC_SITE_URL` | توصیه | مثل `https://dobare.liara.run` — **بیلدتایم است؛ بعد از تغییر، دیپلوی جدید لازم است** |
| `RESERVATION_HOURS` | اختیاری | پیش‌فرض ۶ |
| `SELLER_PHONE` و `SELLER_TELEGRAM` | اختیاری | نمایش به خریدار بعد از ثبت درخواست |
| `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID` | اختیاری | اعلان درخواست‌ها + دستورهای مدیریتی |
| `TELEGRAM_WEBHOOK_SECRET` | برای بات | رشته‌ی تصادفی (مثلاً خروجی `openssl rand -hex 24`) — امنیت وب‌هوک |
| `TELEGRAM_ADMIN_IDS` | اختیاری | شناسه‌های چت مجاز برای دستورهای بات، جدا با کاما |

## ۵) گیت‌هاب — Environment و سکرت‌ها

1. در ریپو: **Settings → Environments → New environment** → نام دقیقاً `production`
2. داخل همان Environment (نه repo secrets کلی!) دو Environment secret بسازید:
   - `LIARA_API_TOKEN` — توکن API لیارا
   - `LIARA_TEAM_ID` — اگر برنامه داخل تیم است
3. Required reviewers لازم نیست (دیپلوی را معطل می‌کند).

> 🔁 جاب Deploy از **Environment production** می‌خواند. اگر سکرت فقط روی repo گذاشته شود، خطای `Authentication failed` تکرار می‌شود.

## ۶) دیپلوی و دود-تست

هر push به `main` (به‌جز تغییرات صرفاً `docs/**` و `*.md`) ورک‌فلو را اجرا می‌کند:
`Typecheck` → `Next build` → `Deploy to Liara` (لینت فقط اطلاع‌رسانی است و مانع نمی‌شود).

پیشرفت را از **Actions ریپو** ببینید: https://github.com/hadiranweb/dobare/actions

بعد از سبز شدن:

- `https://dobare.liara.run/` باید ویترین دوباره باشد
- `https://dobare.liara.run/api/health` باید `{"ok":true}` بدهد
- ورود به `/admin` با `ADMIN_PASSWORD`

## رفع اشکال سریع

| علامت | راه‌حل |
|---|---|
| `Missing LIARA_API_TOKEN` | سکرت را روی Environment production بگذارید (نه فقط repo) و همان run را rerun کنید |
| `Authentication failed` | توکن Environment کهنه است — Environment secret را تازه کنید و بعد rerun |
| `app does not exist` | شناسه‌ی برنامه در کنسول باید دقیقاً `dobare` و در همان تیم باشد |
| `/api/health` → `ok:false` | `DATABASE_URL` شبکه خصوصی + برنامه و دیتابیس روی یک شبکه |
| عکس‌ها بعد از دیپلوی پریدند | Disk لیارا + `UPLOAD_DIR` همان مسیر |
| تایم‌اوت کش (~۱۲ دقیقه) | یک‌بار `workflow_dispatch` با no_cache=true یا پیام کامیت شامل `[no-cache]` |
