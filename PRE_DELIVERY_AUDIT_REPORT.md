# تقرير التدقيق قبل التسليم — 2026-06-27

## 1. الحكم النهائي (Executive Verdict)

- **جاهز للتسليم**: لا — بسبب فشل البناء الأمامي + اكتشافات Blocker/High متعددة
- **عدد الاكتشافات**: 🔴 4 blockers · 🟠 8 high · 🟡 6 medium · 🔵 3 low
- **أهم 3 مخاطر يجب إصلاحها قبل التسليم**:
  1. **فشل `npm run build` الأمامي** — يمنع أي نشر في الإنتاج (BankAccountsContent.tsx خطأ TypeScript يوقف التجميع).
  2. **مهاجرتان مركزيتان لم تُنفَّذ** — جدول `tenant_backups` غائب عن قاعدة البيانات؛ أي طلب إلى BackupController سيرمي 500 SQL Error.
  3. **عدم تطابق URL حرج للعمولات** — `payCommission()` في الواجهة تستدعي `/sales/commissions/pay` لكن المسار الحقيقي هو `/sales/commissions/payout` → 404 دائم عند صرف العمولات.

---

## 2. الاكتشافات

---

### 🔴 [Blocker-1] فشل بناء الواجهة الأمامية — BankAccountsContent.tsx خطأ TypeScript

- **الموقع**: `frontend/src/components/accounting/BankAccountsContent.tsx:205`
- **الدليل**:
  ```
  Type error: Type 'string' is not assignable to type 'Currency'.
  → npm run build FAILS
  ```
  السطر 205: `onChange={e => setForm({...form, currency: e.target.value})}`
  حقل `currency` في نوع `form` مُعرَّف كـ `Currency` (enum أو type object) لكن `e.target.value` يُعيد `string`.
- **الأثر**: لا يمكن إنتاج نسخة إنتاجية (production build) على الإطلاق. أي CI/CD ينتهي بخطأ.
- **الإصلاح المقترح**: تحويل القيمة: `currency: e.target.value as Currency`، أو استبدال الـ`<input>` بـ `<select>` يُعيد قيمة صحيحة من نوع `Currency`.
- **Pass**: Pass 10

---

### 🔴 [Blocker-2] مهاجرتان مركزيتان مُعلَّقتان — جدول `tenant_backups` غائب

- **الموقع**:
  - `backend/database/migrations/2026_06_20_062022_create_tenant_backups_table.php`
  - `backend/database/migrations/2026_06_20_103657_add_checksums_to_tenant_backups_table.php`
- **الدليل**:
  ```
  php artisan migrate:status
  2026_06_20_062022_create_tenant_backups_table .............. Pending
  2026_06_20_103657_add_checksums_to_tenant_backups_table ..... Pending
  ```
  النموذج `TenantBackupModel` يرفع استعلامات SQL إلى `tenant_backups` التي لم تُنشأ بعد.
- **الأثر**: `BackupController::store/show/download/restore` يرمي خطأ SQL "table not found" بمجرد أول طلب. كذلك `BackupTenantJob` يفشل بنفس السبب.
- **الإصلاح المقترح**: تشغيل `php artisan migrate` على قاعدة البيانات المركزية. التأكد من أن كل مهاجرات `database/migrations/` (غير tenant/) تُنفَّذ عند نشر النظام.
- **Pass**: Pass 10 + Pass 1

---

### 🔴 [Blocker-3] عدم تطابق URL لصرف العمولات — 404 دائم

- **الموقع**:
  - `frontend/src/lib/api.ts:226` — تستدعي `/sales/commissions/pay`
  - `backend/routes/api.php:828` — المسار الفعلي هو `POST /sales/commissions/payout`
- **الدليل**:
  ```typescript
  // api.ts:226
  payCommission: (data) => api.post('/sales/commissions/pay', data),
  
  // routes/api.php:828
  Route::post('/payout', [CommissionController::class, 'payout']);
  // → الرابط الكامل: POST /api/sales/commissions/payout
  ```
- **الأثر**: صفحة Commissions تعطي 404 عند الضغط على "Pay Commission". لا يمكن صرف أي عمولة من الواجهة.
- **الإصلاح المقترح**: تغيير `api.ts:226` من `/sales/commissions/pay` إلى `/sales/commissions/payout`.
- **Pass**: Pass 2

---

### 🔴 [Blocker-4] `invoice_items` — حقلا `subtotal` و`tax_amount` في `$fillable` لكن غائبان من المهاجرات

- **الموقع**:
  - `backend/app/Infrastructure/Eloquent/Models/InvoiceItemModel.php:12-13` — `$fillable` يحتوي `'subtotal'` و `'tax_amount'`
  - `backend/app/Infrastructure/Eloquent/Models/InvoiceItemModel.php:24-25` — `$casts` لهما أيضاً
  - لا توجد أي مهاجرة تُضيف عمودَي `subtotal` أو `tax_amount` إلى جدول `invoice_items`
- **الدليل**:
  ```bash
  grep -rn "subtotal\|tax_amount" backend/database/migrations/tenant/ | grep "invoice_items"
  # → لا نتيجة
  ```
  المهاجرة الأصلية `2024_01_01_100004_create_sales_tables.php` تُنشئ `invoice_items` بدونهما. `2026_04_16_184810` أضافت فقط `cost_price`.
- **الأثر**: أي `InvoiceItemModel::create([..., 'subtotal' => X, 'tax_amount' => Y])` يُخزِّن البيانات في أعمدة غير موجودة → silently discarded أو خطأ SQL عند `strict_mode=ON`. حسابات تفصيلية لأيتم الفاتورة مفقودة.
- **الإصلاح المقترح**: إنشاء مهاجرة tenant تُضيف `$table->decimal('subtotal', 14, 2)->default(0)` و`$table->decimal('tax_amount', 14, 2)->default(0)` إلى `invoice_items`، أو إزالتهما من `$fillable`/`$casts` إذا كانا حسابيَّين فقط.
- **Pass**: Pass 1

---

### 🟠 [High-1] عدم تطابق URL — مصادقة الواجهة الأمامية تستخدم `POST /auth/refresh` غير موجود

- **الموقع**: `frontend/src/lib/api.ts:78` — تستدعي `POST /auth/refresh`
- **الدليل**:
  ```typescript
  // api.ts:78
  await axios.post(`/api/auth/refresh`, {}, { headers: { Authorization: `Bearer ${token}` } });
  ```
  ```bash
  # routes/api.php — لا يوجد أي مسار /auth/refresh
  grep -n "auth/refresh" backend/routes/api.php → No matches found
  ```
- **الأثر**: عند انتهاء صلاحية التوكن (401)، الواجهة تحاول التجديد وتحصل على 404، ثم تُعيد توجيه المستخدم لصفحة تسجيل الدخول بشكل غير ضروري. هذا يُؤثر على تجربة المستخدم بشكل ملحوظ في الجلسات الطويلة.
- **الإصلاح المقترح**: إما إضافة `Route::post('/auth/refresh', ...)` في الباك إند، أو تعطيل منطق التجديد في `api.ts` إذا لم تكن هناك نية لدعم refresh tokens.
- **Pass**: Pass 2

---

### 🟠 [High-2] عدم تطابق URL — رفع بيانات بنك (`importBankTransactions`)

- **الموقع**:
  - `frontend/src/lib/api.ts:758` — تستدعي `POST /accounting/bank-accounts/{id}/import`
  - `backend/routes/api.php:657` — المسار الفعلي `POST /accounting/bank-accounts/{id}/import-transactions`
- **الدليل**:
  ```typescript
  // api.ts:758
  return api.post(`/accounting/bank-accounts/${bankAccountId}/import`, formData...);
  
  // routes/api.php:657
  Route::post('bank-accounts/{id}/import-transactions', [BankAccountController::class, 'importTransactions']);
  ```
- **الأثر**: خاصية استيراد كشف الحساب البنكي (bank reconciliation import) تُعطي 404 دائماً.
- **الإصلاح المقترح**: تغيير `api.ts:758` من `/import` إلى `/import-transactions`.
- **Pass**: Pass 2

---

### 🟠 [High-3] عدم تطابق URL — إضافة عنصر غير مدرج في Stocktake

- **الموقع**:
  - `frontend/src/lib/api.ts:343` — تستدعي `POST /inventory/stocktakes/{id}/unlisted`
  - `backend/routes/api.php:424` — المسار الفعلي `POST /inventory/stocktakes/{id}/add-item`
- **الدليل**:
  ```typescript
  // api.ts:343
  addUnlistedItem: (id, data) => api.post(`/inventory/stocktakes/${id}/unlisted`, data),
  
  // routes/api.php:424
  Route::post('/stocktakes/{id}/add-item', [StocktakeController::class, 'addUnlistedItem']);
  ```
- **الأثر**: ميزة إضافة منتج غير مدرج أثناء الجرد تُعطي 404.
- **الإصلاح المقترح**: تغيير `api.ts:343` من `/unlisted` إلى `/add-item`.
- **Pass**: Pass 2

---

### 🟠 [High-4] عدم تطابق URL — تحديث خرائط الحسابات المحاسبية

- **الموقع**:
  - `frontend/src/lib/api.ts:745-746` — تستدعي `GET/POST /accounting/mappings`
  - `backend/routes/api.php:645-646` — المسارات الفعلية `GET/PUT /accounting/account-mappings`
- **الدليل**:
  ```typescript
  // api.ts
  getAccountMappings: () => api.get('/accounting/mappings'),
  updateAccountMappings: (data) => api.post('/accounting/mappings', data),
  
  // routes/api.php
  Route::get('/account-mappings', ...);
  Route::put('/account-mappings', ...);
  ```
  خطأين هنا: (1) المسار مختلف (`mappings` vs `account-mappings`)، (2) الواجهة تستخدم `POST` لكن المسار يتطلب `PUT`.
- **الأثر**: شاشة إعدادات خرائط الحسابات تُعطي 404. لا يمكن تكوين حسابات المحاسبة. هذا يؤثر على كل رحلة تأكيد الفاتورة (`createJournalEntry` → `AccountMappingService::resolve()`).
- **الإصلاح المقترح**: تعديل `api.ts` ليستخدم `GET /accounting/account-mappings` و `PUT /accounting/account-mappings`.
- **Pass**: Pass 2

---

### 🟠 [High-5] عدم تطابق URL — تحويل طلب شراء إلى أمر شراء

- **الموقع**:
  - `frontend/src/lib/api.ts:641` — تستدعي `POST /purchases/requests/{id}/convert`
  - `backend/routes/api.php:520` — المسار الفعلي `POST /purchases/requests/{id}/convert-to-po`
- **الدليل**:
  ```typescript
  // api.ts:641
  convertPrToPo: (id) => api.post(`/purchases/requests/${id}/convert`),
  
  // routes/api.php:520
  Route::post('/requests/{id}/convert-to-po', ...);
  ```
- **الأثر**: زر "تحويل إلى أمر شراء" في شاشة طلبات الشراء يُعطي 404.
- **الإصلاح المقترح**: تغيير `api.ts:641` من `/convert` إلى `/convert-to-po`.
- **Pass**: Pass 2

---

### 🟠 [High-6] عدم تطابق URL — CRM Pipeline (Kanban deals) مسارات غير موجودة

- **الموقع**:
  - `frontend/src/lib/api.ts:558-559` — تستدعي `GET /crm/pipeline/stages` و `PUT /crm/pipeline/deals/{id}/move`
  - `backend/routes/api.php` — لا توجد مسارات `/crm/pipeline/...`
- **الدليل**:
  ```typescript
  // api.ts:558-559
  getStagesWithDeals: () => api.get('/crm/pipeline/stages'),
  moveDeal: (id, data) => api.put(`/crm/pipeline/deals/${id}/move`, data),
  createDeal: (data) => api.post('/crm/pipeline/deals', data),
  ```
  ```bash
  grep "pipeline" backend/routes/api.php → No matches found
  ```
- **الأثر**: شاشة CRM Kanban/Pipeline تُعطي 404 على جميع استدعاءاتها.
- **الإصلاح المقترح**: إما إضافة `CrmPipelineController` وربط المسارات، أو إزالة هذه الواجهة من الفرونت-إند حتى يُبنى الباك-إند.
- **Pass**: Pass 2

---

### 🟠 [High-7] عدم تطابق URL — الاستعلامات المحاسبية (`opening-balances`, `ai/chat`, `data/export/{type}`)

- **الموقع**: `frontend/src/lib/api.ts`
- **الدليل**:
  ```typescript
  // api.ts:792-795 — opening balances endpoints
  getOpeningBalances: () => api.get('/accounting/opening-balances'),       // → 404
  setAccountOpeningBalance: (data) => api.post('/accounting/opening-balances/account', data),  // → 404
  
  // api.ts:836 — AI chat with wrong prefix
  chat: (prompt) => api.post('/ai/chat', { prompt }),   // → 404
  // routes/api.php:783: Route::post('chat', [AIChatbotController::class, 'chat']); ← under /analytics/ prefix → /analytics/chat
  
  // api.ts:1131-1133 — data import/export with dynamic type in URL
  exportData: (type) => api.get(`/data/export/${type}`),     // route: GET /data/export (no type segment)
  importData: (type, data) => api.post(`/data/import/${type}`, data), // route: POST /data/import (no type segment)
  downloadTemplate: (type) => api.get(`/data/template/${type}`), // route: GET /data/template (no type segment)
  ```
- **الأثر**: ثلاث ميزات على الأقل (أرصدة الافتتاحية، الذكاء الاصطناعي، استيراد/تصدير البيانات) معطلة بـ 404.
- **الإصلاح المقترح**: مزامنة عناوين URL بين الفرونت والباك. مسار الذكاء الاصطناعي يجب أن يكون `/analytics/chat`.
- **Pass**: Pass 2

---

### 🟠 [High-8] خاصية الـ `deliveries/map` غير موجودة في الباك إند

- **الموقع**: `frontend/src/lib/api.ts:1052` — `getMapData: () => api.get('/sales/deliveries/map')`
- **الدليل**:
  ```bash
  grep "deliveries/map\|deliveries.*map" backend/routes/api.php → No matches found
  ```
- **الأثر**: أي مكوِّن يستخدم `deliveriesApiNew.getMapData()` سيحصل على 404.
- **الإصلاح المقترح**: إضافة مسار وcontroller method لـ `GET /sales/deliveries/map`، أو حذف استدعاء الـ API من الفرونت.
- **Pass**: Pass 2

---

### 🟡 [Medium-1] `SubmitZatcaInvoiceJob` بدون `failed()` ولا `$tries`

- **الموقع**: `backend/app/Jobs/SubmitZatcaInvoiceJob.php` — الكلاس بأكمله
- **الدليل**: لا `public int $tries`, لا `public int $timeout`, لا `public function failed()`. الكلاسات الأخرى مثل `BackupTenantJob` تحتوي `$tries = 2`.
- **الأثر**: إذا فشلت المكالمة HTTP إلى ZATCA، تُعاد المحاولة لا نهائياً (افتراضي قد يكون 3 مرات حسب الإعداد) بدون تسجيل فشل نهائي أو تنبيه. في بيئة إنتاج بحجم مرتفع، يمكن أن تكتظ قوائم الانتظار.
- **الإصلاح المقترح**: إضافة `public int $tries = 3; public int $timeout = 60;` وdelegete method `failed(\Throwable $e)` تسجل فشل ZATCA في `invoices.zatca_status`.
- **Pass**: Pass 9

---

### 🟡 [Medium-2] `dump()` يُطلَق في الإنتاج داخل `TenantDatabaseManager`

- **الموقع**: `backend/app/Infrastructure/Services/TenantDatabaseManager.php:88`
- **الدليل**:
  ```php
  if (app()->environment('testing')) {
      dump('resetConnection called! Purging tenant connection!');
  }
  ```
  المقصود التشخيص في بيئة الاختبار فقط، لكن `dump()` في تطبيق HTTP يُفسد JSON response أو يُضاف إلى body الصفحة بشكل غير مقصود إذا تم استدعاؤه خارج حالة `testing`.
- **الأثر**: Low في الوقت الحالي (محمي بـ `environment('testing')`)، لكنه مخالف لممارسات الكود النظيف وقد يُسبب مشكلة إذا تغيرت البيئة.
- **الإصلاح المقترح**: استبدال `dump()` بـ `Log::debug()`.
- **Pass**: Pass 4

---

### 🟡 [Medium-3] `image_url` مُعرَّفة كـ `string` (VARCHAR 255) — قد تُقطع مع Cloud URLs

- **الموقع**: `backend/database/migrations/tenant/2026_04_16_185504_add_pro_fields_to_products_table.php:15`
- **الدليل**:
  ```php
  $table->string('image_url')->nullable()->after('description');
  // → VARCHAR(255)
  ```
  عناوين S3/CloudFront ذات معاملات التوقيع قد تتجاوز 255 حرفاً.
- **الأثر**: صور المنتجات لا تُحفظ عند التبديل لتخزين Cloud أو عند استخدام CDN مع توقيع.
- **الإصلاح المقترح**: تغيير النوع إلى `text()` في مهاجرة جديدة. الحل الحالي (public/uploads) يعمل بـ 255 حرف لكنه سيفشل عند التبديل لـ S3.
- **Pass**: Pass 7

---

### 🟡 [Medium-4] Commission accrual لا يُنشئ قيد يومية — تعارض مع الوثائق

- **الموقع**: `backend/app/Application/Sales/UseCases/ConfirmInvoiceUseCase.php:200-213`
- **الدليل**:
  `AI_ACCOUNTING_COMPLETION_TODO.md` يدّعي: "ConfirmInvoiceUseCase posts debit-commission-expense / credit-commission-payable on confirmation — DONE".
  الكود الفعلي يُنفِّذ فقط:
  ```php
  $invoiceModelForCommission->commission_amount = $commissionAmount;
  $invoiceModelForCommission->save();
  ```
  لا يوجد أي `addLine(new JournalEntryLine(...))` لـ `commission_expense` أو `commission_payable` في هذه الدالة.
- **الأثر**: عمولات المندوبين تُحسب وتُحفظ، لكن لا يوجد أي أثر محاسبي. لا يوجد debit على حساب مصروف العمولات ولا credit على حساب العمولات المستحقة. الميزانية العمومية غير مكتملة.
- **الإصلاح المقترح**: إضافة منطق Journal Entry داخل `createJournalEntry()` لتسجيل `commission_expense` debit و `commission_payable` credit كما كان مُخططاً. التحقق أن `AccountMappingService` يُعرِّف هذين المفتاحين.
- **Pass**: Pass 5

---

### 🟡 [Medium-5] `TypeScript errors` — useProductForm.ts — `_uploadingImage` مفقود

- **الموقع**: `frontend/src/components/inventory/hooks/useProductForm.ts:24,31`
- **الدليل**:
  ```
  error TS2345: Property '_uploadingImage' is missing in type '...' 
  but required in type '...{ _uploadingImage: boolean; }'
  ```
  دالتا `openEdit()` و `openDuplicate()` تُنشئان form state بدون `_uploadingImage`.
- **الأثر**: خطأ TypeScript لكن Next.js يُجمِّع بـ warnings في التطوير؛ قد يُسبب تصرفاً غير متوقع في بعض حالات TypeScript strict.
- **الإصلاح المقترح**: إضافة `_uploadingImage: false` إلى كائنات form state في `openEdit` و `openDuplicate`.
- **Pass**: Pass 10

---

### 🟡 [Medium-6] `StockTransferModel`/`StockTransferItemModel` لا يمتدان `BaseModel` — يعتمدان على فلترة يدوية

- **الموقع**:
  - `backend/app/Infrastructure/Eloquent\Models\StockTransferModel.php` — يمتد `BaseModel` (صحيح)
  - لكن لاحظ ملاحظة `AI_KNOWN_GAPS_AND_TODO.md` أن بعض الكويريات تُفلتر `tenant_id` يدوياً
- **الدليل**: مهاجرة `2026_04_16_060004_create_stock_transfers_tables.php` لا تُعرِّف `tenant_id` في جدول `stock_transfers` — العمود أُضيف لاحقاً بواسطة مهاجرة `2026_06_15_005119_add_tenant_id_to_all_tables.php` التي تفحص وجوده أولاً. هذا يعني أن `TenantScope` يعمل، لكن يعتمد على ترتيب المهاجرات.
- **الأثر**: متوسط — المستقبل محفوف بمخاطر التسريب بين المستأجرين إذا تجاهل أي استعلام جديد الـ scope.
- **الإصلاح المقترح**: التأكد من أن `TenantScope` يعمل بشكل صحيح على `StockTransferModel` وعدم الاعتماد على الفلترة اليدوية.
- **Pass**: Pass 6

---

### 🔵 [Low-1] تسجيل الدخول في `TenantDatabaseManager` مدمج في الكود

- **الموقع**: `backend/app/Infrastructure/Services/TenantDatabaseManager.php:88`
- **الدليل**: `dump('resetConnection called! Purging tenant connection!')` — تعليق تشخيصي تطويري
- **الإصلاح المقترح**: استبدال بـ `Log::debug()` أو حذف الكود.
- **Pass**: Pass 4

---

### 🔵 [Low-2] طلبات `auth/refresh` ستفشل بـ 401 infinite loop لاحق

- **الموقع**: `frontend/src/lib/api.ts:73-97`
- **الدليل**: الـ interceptor يحاول `/auth/refresh` وإذا فشل ينتقل للـ logout. المشكلة أن هذا المسار غير موجود (راجع High-1)، مما يعني أي 401 يؤدي لتسجيل خروج فوري.
- **الإصلاح المقترح**: توضيح في الوثائق أو إزالة منطق التجديد التلقائي.
- **Pass**: Pass 2

---

### 🔵 [Low-3] ZATCA serial number يحتوي `XXXXXX` placeholder في الإنتاج

- **الموقع**: `backend/app/Infrastructure/Zatca/ZatcaOnboardingService.php:152`
- **الدليل**:
  ```php
  'serialNumber' => '1-'.($this->getTenantSetting('company_name') ?? 'ERP').'|2-XXXXXX|3-'...
  ```
  `XXXXXX` في الوثيقة الرسمية يُشير إلى رقم تسلسلي حقيقي.
- **الأثر**: قد يرفض ZATCA الشهادة إذا لم يُستبدل هذا المكوِّن بقيمة فعلية.
- **الإصلاح المقترح**: استبدال `XXXXXX` بقيمة قابلة للتكوين من `tenant_settings`.
- **Pass**: Pass 4

---

## 3. تعارضات الوثائق مع الكود

| الادعاء في الوثيقة | الواقع في الكود |
|---|---|
| `AI_ACCOUNTING_COMPLETION_TODO.md` يدّعي أن "ConfirmInvoiceUseCase posts debit-commission-expense/credit-commission-payable — DONE" | الكود في `ConfirmInvoiceUseCase.php:200-213` يُحفظ فقط `commission_amount` في نموذج الفاتورة — لا يوجد قيد يومية للعمولات |
| `AI_KNOWN_GAPS_AND_TODO.md` يدّعي أن "Commission payout frontend — DONE (2026-06-27)" | الواجهة تستدعي `/sales/commissions/pay` لكن المسار الفعلي هو `/sales/commissions/payout` → 404 |
| `AI_SECURITY_AUDIT_NOTES.md` يقول "UpdateInvoiceUseCase confirm branch is dead code" — مشكلة مفتوحة | **تم الإصلاح فعلاً**: الكود الجديد في `UpdateInvoiceUseCase.php:158-160` يُفوِّض إلى `ConfirmInvoiceUseCase` مباشرة بشكل صحيح |
| `AI_KNOWN_GAPS_AND_TODO.md` يذكر `pos_shifts` migration كان في المكان الخطأ — تم إصلاحه | لا يوجد `pos_shifts` migration في `database/migrations/tenant/` حالياً → يبدو أنه تم نقله أو لم يُنشأ بعد. يحتاج التحقق من مهاجرة `create_treasury_tables` |
| الوثيقة تقول أن الحالة `pending_approval` للفاتورة مدعومة | Migration الأصلي `2024_01_01_100004_create_sales_tables.php` يُعرِّف enum كـ `('draft', 'confirmed', 'cancelled', 'returned')` بدون `pending_approval`. `ConfirmInvoiceUseCase:66` يفحص هذه الحالة — إذا تجاوزت الفاتورة approval workflow، ستُخزَّن كـ `pending_approval` وهذا قد يُسبب خطأ في PostgreSQL strict enum mode |

---

## 4. نتائج البوابات (Build Gate)

### `php artisan migrate:status`
```
Migration name                                                           Batch / Status
2026_06_20_062022_create_tenant_backups_table .......................... Pending ⚠️
2026_06_20_103657_add_checksums_to_tenant_backups_table ................ Pending ⚠️
```
**جميع المهاجرات الأخرى: Ran**

### `php artisan route:list`
تعمل بشكل صحيح — لا أخطاء تحميل. المسارات المسجلة تعمل من جانب الباك إند.

### `npx tsc --noEmit -p .`
```
Exit code: 1 (FAIL)
src/components/accounting/BankAccountsContent.tsx(205,108): error TS2322: 
  Type 'string' is not assignable to type 'Currency'.
src/components/inventory/hooks/useProductForm.ts(24,17): error TS2345: 
  Property '_uploadingImage' is missing...
src/components/inventory/hooks/useProductForm.ts(31,17): error TS2345: 
  Property '_uploadingImage' is missing...
```
**3 أخطاء TypeScript — الحالة: FAIL**

### `npm run build`
```
FAIL — Failed to compile.
./src/components/accounting/BankAccountsContent.tsx:205:108
Type error: Type 'string' is not assignable to type 'Currency'.
```
**البناء فاشل — لا يمكن الإنتاج**

---

## 5. قائمة ما قبل التسليم (Checklist)

### أولوية قصوى (يجب قبل أي نشر)
- [ ] **[Blocker-1]** إصلاح خطأ TypeScript في `BankAccountsContent.tsx:205` لتمرير بناء الفرونت إند
- [ ] **[Blocker-2]** تشغيل `php artisan migrate` لإنشاء جدول `tenant_backups` (مهاجرتان معلقتان)
- [ ] **[Blocker-3]** إصلاح عنوان URL في `api.ts:226` من `/sales/commissions/pay` إلى `/sales/commissions/payout`
- [ ] **[Blocker-4]** إنشاء مهاجرة لإضافة `subtotal` و `tax_amount` إلى `invoice_items`

### أولوية عالية (يجب قبل التسليم)
- [ ] **[High-1]** إضافة مسار `POST /auth/refresh` أو حذف منطق التجديد التلقائي
- [ ] **[High-2]** إصلاح `importBankTransactions` URL من `/import` إلى `/import-transactions`
- [ ] **[High-3]** إصلاح `addUnlistedItem` URL من `/unlisted` إلى `/add-item`
- [ ] **[High-4]** إصلاح `getAccountMappings`/`updateAccountMappings` URL (من `/mappings` إلى `/account-mappings`, و`POST` إلى `PUT`)
- [ ] **[High-5]** إصلاح `convertPrToPo` URL من `/convert` إلى `/convert-to-po`
- [ ] **[High-6]** إما بناء CRM Pipeline backend أو إزالة استدعاءات API من الفرونت
- [ ] **[High-7]** إصلاح عناوين `opening-balances`, `ai/chat` (`/analytics/chat`), ومسارات `data/export|import|template`
- [ ] **[High-8]** إضافة مسار `GET /sales/deliveries/map` أو إزالة الاستدعاء

### أولوية متوسطة (قبل التسليم الاحترافي)
- [ ] **[Medium-1]** إضافة `$tries`, `$timeout`, `failed()` إلى `SubmitZatcaInvoiceJob`
- [ ] **[Medium-4]** إضافة قيود يومية للعمولة في `ConfirmInvoiceUseCase` (debit commission_expense / credit commission_payable)
- [ ] **[Medium-5]** إضافة `_uploadingImage: false` في `openEdit`/`openDuplicate` بـ `useProductForm.ts`
- [ ] **التحقق من `pending_approval` enum** في migrations أو إزالة الفحص من `ConfirmInvoiceUseCase:66`

### أولوية منخفضة
- [ ] **[Low-2]** استبدال `dump()` بـ `Log::debug()` في `TenantDatabaseManager.php:88`
- [ ] **[Low-3]** استبدال `XXXXXX` في `ZatcaOnboardingService.php:152` بقيمة قابلة للتكوين

---

## أنماط أخطاء جديدة (New Bug Patterns Found)

### نمط جديد: تعدد الـ API Object aliases في `api.ts`
`frontend/src/lib/api.ts` يحتوي على كائنات مكررة متعددة لنفس الغرض: `approvalsApi` و`approvalsApiNew`، `deliveriesApiNew` و`salesApi.getDeliveries()`، `subscriptionApi` و`subscriptionsApiNew` — هذا يُربك المطورين ويُصعِّب الصيانة. توصية: توحيد الـ API layer في ملف واحد.

### نمط جديد: `TenantScope` يتجاهل الفلترة في القوائم بدون سياق مستأجر
`TenantScope.php:30`: إذا لم يوجد `current_tenant` ولا `auth()->user()` ولا `X-Tenant-ID` header، لا يُطبَّق أي فلتر على الاستعلام. في Queue jobs التي تستخدم Eloquent مباشرة بدون تحديد سياق المستأجر (كـ `SubmitZatcaInvoiceJob:39` الذي يستخدم `InvoiceModel::query()->find()`)، يمكن أن يُعيد الاستعلام سجلات من مستأجرين مختلفين إذا نُسي تحديد الاتصال. `SubmitZatcaInvoiceJob:37` يضبط `DB::setDefaultConnection('tenant')` لكن لا يُحدد tenant context في `app()->bind('current_tenant')`.
