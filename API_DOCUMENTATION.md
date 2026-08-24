# 📖 توثيق شامل للـ REST API - نظام إدارة المصروفات اليومية وسندات الصرف
### Daily Expenses & Cash Voucher Management REST API Documentation

---

## 📌 الفهرس العام (Table of Contents)
1. [نظرة عامة والتقنيات المستخدمة (Overview & Tech Stack)](#1-نظرة-عامة-والتقنيات-المستخدمة)
2. [بيئة التشغيل والروابط السريعة (Endpoints & URLs)](#2-بيئة-التشغيل-والروابط-السريعة)
3. [نظام المصادقة والتفويض (Authentication & JWT Flow)](#3-نظام-المصادقة-والتفويض)
4. [هيكل الاستجابات والأخطاء (Response & Error Formats)](#4-هيكل-الاستجابات-والأخطاء)
5. [واجهات المصادقة والملف الشخصي وتعديل اسم المستخدم (Auth & Profile)](#5-واجهات-المصادقة-والملف-الشخصي-وتعديل-اسم-المستخدم)
6. [واجهات يومية ومصروفات اليوم (Today Auto Journal)](#6-واجهات-يومية-ومصروفات-اليوم)
7. [واجهات دفاتر اليوميات (Expense Journals)](#7-واجهات-دفاتر-اليوميات)
8. [واجهات السندات والربط الجماعي (Transactions & Bulk Assign)](#8-واجهات-السندات-والربط-الجماعي)
9. [واجهات المشاريع والوحدات العقارية (Projects & Units)](#9-واجهات-المشاريع-والوحدات-العقارية)
10. [واجهات المستخدمين والصلاحيات (Users & RBAC)](#10-واجهات-المستخدمين-والصلاحيات)
11. [واجهات المستفيدين (Beneficiaries)](#11-واجهات-المستفيدين)
12. [واجهات تصنيفات المصروفات (Expense Categories)](#12-واجهات-تصنيفات-المصروفات)
13. [واجهات الصناديق والعهد (Cashboxes)](#13-واجهات-الصناديق-والعهد)
14. [واجهات طرق الدفع (Payment Methods)](#14-واجهات-طرق-الدفع)
15. [واجهات إعدادات وسياسات النظام (System Settings)](#15-واجهات-إعدادات-وسياسات-النظام)
16. [واجهات التقارير المالية (Financial Reports)](#16-واجهات-التقارير-المالية)
17. [واجهات سجل التدقيق والرقابة (Audit Logs)](#17-واجهات-سجل-التدقيق-والرقابة)

---

## 1. نظرة عامة والتقنيات المستخدمة
تم بناء هذه الواجهة البرمجية (REST API) لخدمة نظام إدارة المصروفات اليومية وسندات الصرف وتطبيقات الويب والموبايل (Android / iOS):
- **البيئة البرمجية**: Node.js + Express + TypeScript
- **قاعدة البيانات**: PostgreSQL / MySQL عبر Prisma ORM
- **المصادقة**: JWT (JSON Web Tokens) بنظام الرمز المزدوج (Access Token + Refresh Token)
- **التوثيق التفاعلي**: Swagger UI (OpenAPI 3.0)
- **التحقق من البيانات**: Zod Schemas

---

## 2. بيئة التشغيل والروابط السريعة
- **المسار الأساسي (Base URL)**: `http://localhost:4000/api/v1`
- **توثيق Swagger التفاعلي**: `http://localhost:4000/api-docs`
- **فحص صحة الخادم (Health Check)**: `GET http://localhost:4000/health`

---

## 3. نظام المصادقة والتفويض
جميع المسارات المحمية تتطلب إرسال التوكن في ترويسة الطلب:
```http
Authorization: Bearer <ACCESS_TOKEN>
```
مدة صلاحية `accessToken` الافتراضية هي **15 دقيقة**، ويمكن تجديده في أي وقت باستخدام `refreshToken` عبر المسار `/auth/refresh`.

---

## 4. هيكل الاستجابات والأخطاء

### الاستجابة الناجحة (Standard Success Response)
```json
{
  "success": true,
  "message": "تم تنفيذ العملية بنجاح",
  "data": { ... }
}
```

### استجابة الخطأ (Error Response)
```json
{
  "success": false,
  "message": "رسالة توضيحية للخطأ",
  "errorCode": "ERROR_CODE_STRING",
  "details": []
}
```

---

## 5. واجهات المصادقة والملف الشخصي وتعديل اسم المستخدم

### 1. تسجيل الدخول (Login)
- **الطريقة**: `POST /auth/login`
- **الوصول**: عام (Public)
- **جسم الطلب (Body)**:
```json
{
  "username": "admin",
  "password": "AdminPass123!"
}
```
- **الاستجابة (Response - 200)**:
```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "fullName": "مدير النظام الرئيسي",
      "email": "admin@company.com",
      "roles": ["ADMIN"],
      "permissions": ["*"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "eyJhbGciOiJIUzI1Ni...",
      "expiresIn": "15m"
    }
  }
}
```

### 2. تجديد التوكن (Refresh Token)
- **الطريقة**: `POST /auth/refresh`
- **جسم الطلب (Body)**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}
```

### 3. جلب بيانات المستخدم الحالي (Get Current User)
- **الطريقة**: `GET /auth/me`
- **الترويسة**: `Authorization: Bearer <token>`

### 4. تعديل الملف الشخصي واسم المستخدم الحالي (Update Profile & Username)
- **الطريقة**: `PATCH /auth/profile` أو `PATCH /auth/me`
- **الترويسة**: `Authorization: Bearer <token>`
- **جسم الطلب (Body)**:
```json
{
  "username": "new_username",
  "fullName": "أحمد محمود العتيبي",
  "email": "ahmed.new@company.com",
  "phone": "+966500000001"
}
```
- **ملاحظات**:
  - يتم التحقق من أن اسم المستخدم الجديد فريد وغير مستخدم من حساب آخر.
  - يتم تدوين التعديل تلقائياً في سجل التدقيق والرقابة (Audit Log).

---

## 6. واجهات يومية ومصروفات اليوم (Today Auto Journal)

### 1. ملخص يومية اليوم الحالية
- **الطريقة**: `GET /today`
- **الاستجابة (Response - 200)**:
```json
{
  "success": true,
  "message": "بيانات يومية اليوم التلقائية بتاريخ 2026-08-24",
  "data": {
    "systemDate": "2026-08-24",
    "journalId": 14,
    "journalNumber": "JRN-20260824",
    "status": "OPEN",
    "totalAmount": 1250.00,
    "transactionsCount": 3
  }
}
```

### 2. جلب سندات ومصروفات اليوم
- **الطريقة**: `GET /today/transactions`

### 3. إضافة مصروف في يومية اليوم
- **الطريقة**: `POST /today/transactions`
- **جسم الطلب (Body)**:
```json
{
  "manualVoucherNumber": "1055",
  "voucherBookNumber": "BK-03",
  "voucherSource": "MANUAL",
  "transactionType": "PURCHASE",
  "amount": 450.00,
  "description": "شراء أدوات صيانة سباكة وكهرباء",
  "beneficiaryId": 2,
  "categoryId": 3,
  "projectId": 1,
  "paymentMethodId": 1,
  "invoiceStatus": "PROVIDED",
  "invoiceNumber": "INV-88912",
  "invoiceDate": "2026-08-24",
  "invoiceAmount": 450.00
}
```

### 4. تعديل مصروف اليوم
- **الطريقة**: `PATCH /today/transactions/:id`

### 5. حذف مصروف اليوم
- **الطريقة**: `DELETE /today/transactions/:id`

---

## 7. واجهات دفاتر اليوميات (Expense Journals)
- `GET /journals`: استعراض كافة دفاتر اليوميات السابقة.
- `GET /journals/:id`: تفاصيل دفتر اليومية مع كافة حركاته وسنداته.
- `POST /journals/:id/close`: إغلاق اليومية الحالية وترحيلها.
- `POST /journals/:id/reopen`: إعادة فتح يومية مغلقة (خاص بالمدير ADMIN).

---

## 8. واجهات السندات والربط الجماعي (Transactions)
- `PATCH /expense-transactions/bulk-assign-project`: ربط مجموعة من السندات غير المربوطة بمشروع دفعة واحدة.
```json
{
  "transactionIds": [101, 102, 105],
  "projectId": 2,
  "reason": "اعتماد تحميل المصروفات على مشروع برج الأندلس"
}
```

---

## 9. واجهات المشاريع والوحدات العقارية (Projects & Units)
- `GET /projects`: جلب قائمة المشاريع (مع خيارات تصفية `search`, `status`, `activeOnly`).
- `POST /projects`: إنشاء مشروع جديد.
- `GET /projects/:id`: تفاصيل المشروع.
- `PATCH /projects/:id`: تحديث بيانات المشروع.
- `PATCH /projects/:id/status`: تغيير حالة المشروع (`ACTIVE`, `SUSPENDED`, `COMPLETED`, `ARCHIVED`).
- `GET /projects/:id/summary`: ملخص مالي وتحليلي (الميزانية، إجمالي المنصرف، المتبقي).
- `GET /projects/:id/transactions`: استعراض كافة سندات المشروع.
- `GET /projects/:projectId/units`: جلب وحدات المشروع العقارية.
- `POST /projects/:projectId/units`: إضافة وحدة عقارية.
- `PATCH /projects/:projectId/units/:id`: تعديل وحدة عقارية.
- `DELETE /projects/:projectId/units/:id`: حذف وحدة عقارية.

---

## 10. واجهات المستخدمين والصلاحيات (Users & RBAC)
- `GET /users`: قائمة المستخدمين مع التصفية.
- `POST /users`: إنشاء مستخدم جديد وتعيين الأدوار والمشاريع والصناديق.
- `GET /users/:id`: جلب بيانات المستخدم مع الصلاحيات.
- `PATCH /users/:id`: **تعديل بيانات المستخدم واسم المستخدم (Username)**:
```json
{
  "username": "khalid.updated",
  "fullName": "خالد عبد الله السالم",
  "email": "khalid.new@company.com",
  "phone": "+966501112233",
  "status": "ACTIVE"
}
```
- `PATCH /users/:id/status`: تفعيل أو إيقاف الحساب (`{ "isActive": false }`).
- `POST /users/:id/reset-password`: إعادة تعيين كلمة المرور.
- `PATCH /users/:id/roles`: تعيين الأدوار (`{ "roleIds": [1, 2] }`).
- `PATCH /users/:id/projects`: ربط المشاريع بالمستخدم.
- `PATCH /users/:id/cashboxes`: ربط الصناديق بالمستخدم.

---

## 11. واجهات المستفيدين (Beneficiaries)
- `GET /beneficiaries`: قائمة المستفيدين (موردين، مقاولين، موظفين).
- `POST /beneficiaries`: إضافة مستفيد جديد.
- `GET /beneficiaries/:id`: جلب بيانات المستفيد.
- `PATCH /beneficiaries/:id`: تعديل بيانات المستفيد.

---

## 12. واجهات تصنيفات المصروفات (Expense Categories)
- `GET /expense-categories`: جلب شجرة التصنيفات.
- `POST /expense-categories`: إضافة تصنيف مصروف جديد.

---

## 13. واجهات الصناديق والعهد (Cashboxes)
- `GET /cashboxes`: قائمة الصناديق النقدية.
- `POST /cashboxes`: إضافة صندوق جديد وأمين عهدة.
- `PATCH /cashboxes/:id`: تعديل بيانات الصندوق.

---

## 14. واجهات طرق الدفع (Payment Methods)
- `GET /payment-methods`: جلب طرق الدفع المعرفة في النظام (نقدي، تحويل، شيك، بطاقة).

---

## 15. واجهات إعدادات وسياسات النظام (System Settings)
- `GET /system-settings`: جلب كافة سياسات وإعدادات النظام.
- `PATCH /system-settings/expenses.project_requirement_mode`: ضبط سياسة إلزامية ربط المشروع:
  - `OPTIONAL`: اختياري.
  - `REQUIRED_ON_APPROVAL`: إلزامي عند الاعتماد.
  - `REQUIRED_ON_CREATE`: إلزامي عند تسجيل المصروف.

---

## 16. واجهات التقارير المالية (Financial Reports)
1. `GET /reports/daily-expenses?date=YYYY-MM-DD`: تقرير المصروفات اليومية التفصيلي.
2. `GET /reports/by-project?projectId=1`: تقرير المصروفات حسب المشروع.
3. `GET /reports/by-beneficiary`: تقرير المصروفات حسب المستفيدين والموردين.
4. `GET /reports/by-category`: تقرير المصروفات حسب بنود وتصنيفات الصرف.
5. `GET /reports/unassigned-project-transactions`: تقرير السندات غير المربوطة بمشاريع.
6. `GET /reports/pending-invoices`: تقرير المشتريات المعلقة بدون فواتير ضريبية.
7. `GET /reports/manual-vouchers`: تقرير السندات اليدوية ودفاتر الصرف.

---

## 17. واجهات سجل التدقيق والرقابة (Audit Logs)
- `GET /audit-logs`: جلب حركات وسجلات الرقابة والتعديلات المالية والإدارية:
  - معاملات الاستعلام: `entityType`, `action`, `userId`, `page`, `limit`.
