> للتشغيل المحلي المصحح راجع RUN-LOCAL-AR.md. الأمر npm run dev يستخدم Node.js الآن، وnpm run dev:cloudflare يستخدم Wrangler.

# تشغيل Almasri Engineering مع MongoDB وCloudflare

هذا هو الترتيب الصحيح. لا تضع رابط MongoDB أو كلمة المرور داخل GitHub.

## 1) MongoDB Atlas

1. افتح مشروعك في MongoDB Atlas.
2. من **Database Access** أنشئ مستخدمًا للتطبيق بصلاحية `readWrite` على قاعدة `engineering_portal`.
3. من **Connect → Drivers** انسخ رابط `mongodb+srv://...` واستبدل اسم المستخدم وكلمة المرور الحقيقيين. إذا كانت كلمة المرور تحتوي رموزًا خاصة، استخدم ترميز URL لها.
4. من **Network Access** أضف عنوان IP لجهازك أثناء الاختبار المحلي.

## 2) VS Code — الاختبار المحلي

داخل مجلد المشروع افتح PowerShell وشغّل:

```powershell
npm ci
# ملف .dev.vars موجود في النسخة؛ لا تستبدله إذا كانت إعداداتك صحيحة.
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

افتح `.dev.vars`، وليس `.dev.vars.example`، واجعله بهذا الشكل:

```env
MONGODB_URI="رابط MongoDB الكامل مع كلمة المرور الحقيقية"
SETUP_TOKEN="الناتج الذي ظهر من الأمر السابق"
```

ثم شغّل:

```powershell
npm run dev
```

افتح `http://localhost:8787`. في أول مرة اختر **تهيئة النظام لأول مرة** وأدخل رمز التهيئة وبيانات المدير. لا ترسل هذه القيم إلى أي شخص.

## 3) GitHub

ارفع ملفات المشروع فقط. ملف `.dev.vars` مستثنى من GitHub تلقائيًا عبر `.gitignore`، فلا تحذفه ولا تغيّر اسمه إلى `.dev.vars.example`.

## 4) Cloudflare Worker

في Worker المسمى `almasri-engineering` أضف:

- Environment variable: `MONGODB_DB` = `engineering_portal`
- Secret: `MONGODB_URI` = رابط MongoDB الكامل
- Secret: `SETUP_TOKEN` = رمز جديد عشوائي طوله 32 حرفًا أو أكثر

بعد حفظ الأسرار أعد النشر، ثم افتح رابط `workers.dev`. بعد إنشاء المدير بنجاح احذف `SETUP_TOKEN` من الإنتاج.

## إذا ظهر خطأ اتصال

- تأكد أنك عدّلت `.dev.vars` الفعلي.
- تأكد أن الرابط لا يحتوي على `<db_password>`.
- تأكد أن IP جهازك موجود في **Network Access**.
- لا تكتب رابط MongoDB كأمر في PowerShell؛ ضعه داخل `.dev.vars` أو في خانة Secret.
