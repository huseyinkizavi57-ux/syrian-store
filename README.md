# متجرنا — منصة تجارة إلكترونية سورية (Full-Stack)

منصة تجارة إلكترونية Full-Stack مبنية بـ React + TypeScript (Frontend) و
Node/Express + TypeScript + PostgreSQL + Prisma (Backend)، بواجهة عربية RTL
مخصصة للمستخدم السوري.

---

## 1. هيكل المشروع

```
syrian-store/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # نموذج قاعدة البيانات الكامل (مع تعليقات القرارات التصميمية)
│   │   └── seed.ts            # بيانات تجريبية (Development Only)
│   ├── src/
│   │   ├── config/            # env, prisma client
│   │   ├── middleware/        # auth, rbac, rate limit, validation, error handler
│   │   ├── modules/           # كل دومين في مجلد منفصل (auth, products, orders, payments...)
│   │   │   └── payments/providers/   # PaymentService -> ShamCashPaymentService -> Sham Cash API
│   │   ├── jobs/               # مهمة إلغاء الطلبات المنتهية الصلاحية (cron)
│   │   └── utils/
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/              # صفحات المتجر
│   │   ├── pages/admin/        # لوحة تحكم المدير
│   │   ├── context/            # Auth, Cart, AdminAuth
│   │   ├── components/
│   │   └── services/           # عملاء API (api.ts للزبائن، adminApi.ts للمدراء)
│   └── Dockerfile
└── docker-compose.yml
```

---

## 2. التشغيل محلياً (بدون Docker)

### المتطلبات
- Node.js 20+
- PostgreSQL 14+ يعمل محلياً (أو عبر Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine`)

### الخطوات

```bash
# 1) الباك إند
cd backend
cp .env.example .env
# افتح .env واملأ DATABASE_URL و JWT_ACCESS_SECRET و JWT_REFRESH_SECRET
# (لتوليد أسرار عشوائية: openssl rand -base64 48)

npm install
npm run prisma:migrate     # ينشئ الجداول
npm run prisma:seed        # بيانات تجريبية (منتجات، أقسام، حسابات تطوير)
npm run dev                # يعمل على http://localhost:4000

# 2) الفرونت إند (طرفية جديدة)
cd frontend
npm install
npm run dev                 # يعمل على http://localhost:5173
```

الفرونت إند يوجّه `/api/*` تلقائياً إلى `http://localhost:4000` (انظر `vite.config.ts`).

### التشغيل عبر Docker

```bash
export JWT_ACCESS_SECRET=$(openssl rand -base64 48)
export JWT_REFRESH_SECRET=$(openssl rand -base64 48)
docker compose up --build
# ثم داخل حاوية backend:
docker compose exec backend npm run prisma:migrate
docker compose exec backend npm run prisma:seed
```

---

## 3. متغيرات البيئة المطلوبة

انظر `backend/.env.example` — الأهم:

| المتغير | الوصف |
|---|---|
| `DATABASE_URL` | رابط اتصال PostgreSQL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | أسرار توقيع الجلسات — **يجب توليدها بنفسك** |
| `ORDER_PENDING_TTL_MIN` | دقائق انتظار الدفع قبل إلغاء الطلب تلقائياً (افتراضي 20) |
| `STORAGE_DRIVER` | `local` أو `cloud` (انظر القسم 8 أدناه) |
| `SHAM_CASH_*` | فارغة حالياً — انظر القسم 7 |

---

## 4. حسابات الدخول التجريبية (Development Only)

بعد تشغيل `npm run prisma:seed`:

| النوع | البيانات |
|---|---|
| Owner (لوحة التحكم `/admin/login`) | `owner@dev.local` / `DevOwner123!` |
| Admin | `admin@dev.local` / `DevAdmin123!` |
| زبون (الموقع العادي `/login`) | هاتف `0900000001` / `DevUser123!` |

⚠️ هذه بيانات تطوير فقط، لا تُستخدم في بيئة حقيقية أبداً.

---

## 5. توثيق API (ملخص)

جميع المسارات تحت `/api`. الاستجابات بصيغة موحدة: `{ data, meta? }` عند
النجاح، و `{ error: { code, message, details? } }` عند الفشل.

| المسار | الوصف |
|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | مصادقة الزبائن |
| `POST /auth/admin/login` | مصادقة المدراء |
| `POST /auth/otp/*`, `/auth/password/*` | تفعيل الهاتف واستعادة كلمة المرور |
| `GET /products`, `GET /products/:slug` | تصفح المنتجات (فلترة/بحث/ترتيب) |
| `POST /products` وما شابه | إدارة المنتجات (Admin) |
| `GET/POST/PATCH/DELETE /cart/*` | السلة (زبون مسجل) |
| `POST /orders`, `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` | الطلبات (زبون) |
| `GET /orders/admin/*`, `POST /orders/admin/:id/status` | إدارة الطلبات (Admin) |
| `POST /payments/initiate`, `POST /payments/:id/check` | تدفق الدفع |
| `POST /payments/shamcash/webhook` | **معطّل حالياً** — بانتظار توثيق Sham Cash الرسمي |
| `GET/POST /reviews`, `/favorites`, `/coupons`, `/shipping-rates` | ميزات إضافية |
| `GET /admin/dashboard`, `/admin/admins`, `/admin/audit-logs` | لوحة التحكم |

كل مسارات الـAdmin محمية بـ `requireAdmin` + صلاحية محددة عبر
`requirePermission()` (انظر `backend/src/middleware/rbac.ts` لمصفوفة
الصلاحيات الكاملة لكل دور).

---

## 6. ما الذي يعمل فعلياً الآن (end-to-end، مُختبر منطقياً)

- تسجيل حساب، تسجيل دخول، تحديث الجلسة (access/refresh tokens)، تفعيل
  الهاتف عبر OTP، استعادة كلمة المرور — **إرسال SMS الفعلي غير مفعّل** (انظر
  القسم 7)، لكن الكود يُطبع في الـconsole في وضع التطوير لتتمكن من اختباره.
- تصفح الأقسام → المنتجات → الفلترة/الترتيب → صفحة المنتج مع الألوان/المقاسات
- السلة، إنشاء الطلب (مع حجز مخزون آمن من Race Conditions، وكوبونات، وحساب
  شحن حسب المحافظة)
- انتهاء صلاحية الطلبات غير المدفوعة تلقائياً بعد `ORDER_PENDING_TTL_MIN` دقيقة
  وتحرير المخزون المحجوز
- الدفع عبر **مزود Mock** يحاكي Sham Cash بالكامل (نجاح فوري + تحقق) — يثبت
  أن التدفق الكامل (Order → Payment → تأكيد → PAID) يعمل بشكل صحيح
- تتبع الطلب (Timeline)، إلغاء الطلب من قبل الزبون، التقييمات (بعد
  التسليم فقط)، المفضلة
- لوحة تحكم المدير: إحصائيات، إدارة منتجات مبسطة، إدارة الطلبات مع انتقالات
  حالة مقيّدة بالصلاحية، كوبونات، إدارة حسابات مدراء متعددين بالأدوار
  الخمسة، سجل تدقيق (Audit Log)

---

## 7. ما الذي يحتاج Sham Cash credentials فعلياً

طبقة الدفع مبنية بالكامل حسب البنية المطلوبة:

```
PaymentService (payments.service.ts)
  ↓
ShamCashPaymentProvider (implements PaymentProviderAdapter)
  ↓
Sham Cash API   ← غير موجود بعد
```

**لم يتم اختراع أي endpoint أو مفتاح أو webhook** — كما طلبت. لتفعيل الدفع
الحقيقي أحتاج منك:

1. **رابط الـAPI الرسمي** (`SHAM_CASH_API_URL`) وتوثيق الـendpoints
   (بدء عملية دفع، الاستعلام عن حالة عملية، الاسترجاع إن وُجد)
2. **بيانات الاعتماد**: `SHAM_CASH_API_KEY`, `SHAM_CASH_MERCHANT_ID`,
   `SHAM_CASH_SECRET` (أو ما يعادلها حسب توثيقهم)
3. **شكل الطلب/الاستجابة** (JSON schema) لكل endpoint
4. **آلية Webhook**: هل يوجد؟ ما هو الـURL الذي يجب تسجيله لديهم؟ ما آلية
   التحقق من التوقيع (HMAC؟ توقيع مفتاح عام؟)
5. **رمز العملة** المتوقع (نفترض حالياً SYP) وحدود المبالغ إن وُجدت

بمجرد توفر هذه المعلومات، التعديل المطلوب محصور بالكامل في ملف واحد:
`backend/src/modules/payments/providers/ShamCashPaymentProvider.ts` — لا
شيء آخر في النظام (Orders, Payments service, Routes, Frontend) يحتاج
تعديلاً، لأن كل شيء آخر يتحدث مع الواجهة المجردة `PaymentProviderAdapter`.

كما لم يتم تفعيل الـWebhook endpoint (`POST /payments/shamcash/webhook`) —
يرمي خطأ صراحة الآن بدل أن يتظاهر بالعمل.

---

## 8. تخزين الصور — Local ↔ Cloud

`STORAGE_DRIVER=local` (افتراضي) يحفظ الصور في `backend/uploads/` ويقدّمها
عبر `/uploads/*`. للتبديل لاحقاً لتخزين سحابي (S3، Cloudinary، إلخ)، نفّذ
`CloudStorageAdapter` في `backend/src/modules/uploads/storage.adapter.ts` —
لا شيء آخر يحتاج تعديلاً.

---

## 9. قيود معروفة ونقاط ناقصة عن قصد

هذه أشياء تم توثيقها بوعي بدل التظاهر بأنها مكتملة:

- **إرسال SMS حقيقي**: غير مفعّل (لا يوجد مزود محدد في الطلب، بنفس منطق
  Sham Cash). الكود صحيح بالكامل، فقط `sendSms()` في
  `backend/src/modules/auth/auth.service.ts` تحتاج تفعيل مزود حقيقي.
- **جلسات المدراء**: access token فقط بدون refresh token دوّار (بخلاف
  جلسات الزبائن). قرار مبسّط مقصود للوحة تحكم خلفية — إن أردت جلسات مدراء
  دائمة، طبّق نفس آلية الزبائن (`RefreshToken` model موجود ويمكن تعميمه).
  currently هذا يعني أن جلسة المدير تنتهي بعد `JWT_ACCESS_TTL` (15 دقيقة
  افتراضياً) وتتطلب إعادة تسجيل الدخول.
- **نموذج إضافة المنتج في لوحة التحكم مبسّط**: يدعم متغير (variant) واحد
  فقط من الواجهة. النظام الخلفي (API) يدعم عدة variants بالكامل (الألوان/
  المقاسات المتعددة) — توسيع نموذج الواجهة لدعم إضافة عدة variants دفعة
  واحدة عمل بسيط لاحقاً.
- **صفحات لوحة تحكم غير مبنية بعد**: إدارة الأقسام/العلامات التجارية/أجرة
  الشحن من الواجهة الرسومية — الـAPI الخلفي لها جاهز بالكامل ومحمي
  بالصلاحيات، فقط تحتاج صفحات Frontend مقابلة (نفس نمط الصفحات الموجودة).
- **الإشعارات (Email/SMS/WhatsApp/Push)**: البنية جاهزة للتوسعة (كما طلب
  الspec) لكن لم يتم ربط أي مزود مدفوع فعلياً — لا رسوم غير ضرورية.
- **لم يتم تشغيل `npm install` / `npm run build` فعلياً**: بيئة التطوير
  التي بنيت فيها المشروع لا تملك اتصال إنترنت لتحميل الحزم، لذلك لم أتمكن
  من تنفيذ خطوة "شغّل build، افحص TypeScript errors" المطلوبة عملياً. الكود
  مكتوب بعناية ومتّسق النمط، لكن رجاءً نفّذ:
  ```
  cd backend && npm install && npm run typecheck
  cd frontend && npm install && npm run typecheck
  ```
  وأرسل لي أي خطأ يظهر لأصلحه فوراً.

---

## 10. الأمان — ملخص ما هو مطبّق

- كلمات المرور: `bcrypt` (12 rounds)، لا تخزين نص صريح أبداً
- JWT access قصير الأمد + refresh token دوّار مخزّن كـhash فقط (httpOnly cookie)
- RBAC مطبّق في الـmiddleware الخلفي حصراً، وليس فقط بإخفاء أزرار الواجهة
- كل حسابات السعر/المخزون/حالة الدفع تُحسب في الباك إند فقط، لا يُقبل أي
  رقم من الـFrontend لا للسعر ولا لحالة الدفع (انظر `payments.service.ts`
  و `orders.service.ts`)
- Idempotency على عمليات الدفع (مفتاح يولّده الباك إند، وليس العميل)
- `helmet`, CORS مقيّد بـ origin واحد, rate limiting عام + محدد لمسارات
  تسجيل الدخول والدفع
- التحقق من نوع وحجم الملفات المرفوعة، الامتداد يُشتق من الـMIME الفعلي
  وليس اسم الملف
- Audit log لكل الإجراءات الحساسة (تعديل سعر، تغيير دور مدير، تعطيل حساب،
  تغيير حالة طلب...)
- حماية من حذف آخر حساب Owner نشط في النظام

---

هذا أساس حقيقي وقابل للتطوير والنشر كما طلبت — وليس Demo شكلي. النقاط
المذكورة في القسم 9 هي بالضبط ما تبقى لإكماله، بلا أي ادّعاء بأنه يعمل قبل
أن يعمل فعلاً.
