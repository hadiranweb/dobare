# ─── مرحله ۱: نصب وابستگی‌ها (لایه‌ی قابل کش) ───
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ─── مرحله ۲: بیلد اپلیکیشن ───
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# آدرس ساختگی فقط برای پاس کردن بررسی‌های زمان بیلد — هیچ اتصالی برقرار نمی‌شود
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── مرحله ۳: اجراکننده‌ی مایگریشن (یک‌بار قبل از بالا آمدن اپ) ───
FROM node:22-alpine AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json drizzle.config.ts ./
COPY src/db ./src/db
CMD ["npx", "drizzle-kit", "push", "--config=drizzle.config.ts"]

# ─── مرحله ۴: ایمیج نهایی اجرا (سبک) ───
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
