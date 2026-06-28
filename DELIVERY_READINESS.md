# تقرير الجاهزية قبل التسليم — 2026-06-28

> منهجية: كل بند أدناه مدعوم بدليل ملموس (`file:line` أو ناتج أمر فعلي شُغِّل في هذه الجلسة).
> أي ادعاء "مكتمل" في وثائق `AI_*.md` و`PRE_DELIVERY_AUDIT_REPORT.md` تمّت إعادة التحقق منه مقابل الكود الحالي — والنتيجة أن التقرير السابق (2026-06-27) **متقادم إلى حدٍّ كبير** (راجع القسم 4).
> **لم يُعدَّل أي كود** — اكتشاف وتوثيق فقط.

---

## 1. القرار (Go / No-Go)

- **جاهز للتسليم: لا — مشروط.** البناء والأنواع نظيفة، والنواة المحاسبية/المخزنية سليمة، لكن يوجد خطر تسريب/تلف بيانات بين المستأجرين في طبقة الـ Queue، وعدة ميزات مبنية لكنها غير قابلة للوصول أو تُعيد 404.
- **العدّاد:** 🔴 1 · 🟠 9 · 🟡 12 · 🔵 6
- **أهم 3 حاجات لازم تتظبط قبل التسليم:**
  1. **🔴 وظائف الـ Queue لا تبدّل قاعدة بيانات المستأجر** — `SubmitZatcaInvoiceJob`/`GeneratePayrollJob`/`SendLateAttendanceNotificationJob` تكتب/تقرأ على القاعدة المركزية بدل قاعدة المستأجر عند تشغيل عامل Queue حقيقي (إنتاج) → تلف/تسريب بيانات عبر المستأجرين.
  2. **🟠 مسار الموافقات مسدود النهاية** — أي فاتورة تُفعِّل قاعدة موافقة تَعلَق في `pending_approval` للأبد (لا خصم مخزون، لا قيد، لا بيع) ولا يوجد مسار يؤكّدها بعد الاعتماد.
  3. **🟠 ميزات مبنية غير قابلة للوصول / تُعيد 404** — ~13 صفحة بلا رابط في الـ Sidebar (دليل الحسابات، القيود، الموازنات، العمولات، مركز الاستيراد...)، + شجرة دليل الحسابات وإرسال الجرد يُعيدان 404.

---

## 2. فاضل إيه يتظبط (Punch-List)

### 🔴 Blockers

#### 🔴 [L] وظائف الـ Queue لا تبدّل قاعدة بيانات المستأجر — تلف/تسريب بيانات
- **الموقع:** `backend/app/Jobs/SubmitZatcaInvoiceJob.php:41,54` · `backend/app/Jobs/GeneratePayrollJob.php:36` · `backend/app/Jobs/SendLateAttendanceNotificationJob.php:90,106`
- **الدليل:** الوظائف تكتفي بـ `DB::setDefaultConnection('tenant')` ولا تستدعي أبداً `app(TenantDatabaseManager)->switchToDatabase($tenant->database_name)`. اتصال `tenant` الافتراضي في `backend/config/database.php:35` يشير إلى القاعدة المركزية (`TENANT_DB_DEFAULT` → `DB_DATABASE` المركزية) ويُعاد ضبطه وقت التشغيل فقط داخل دورة الطلب عبر `TenantMiddleware.php:57`. في عامل Queue منفصل لا يحدث هذا التبديل. (المثال الصحيح المقابل: `TenantBackupAlertService.php:64` و`MigrateAllTenantsCommand.php:51` يستدعيان `switchToDatabase` أولاً.)
- **الأثر:** عند تشغيل عامل Queue غير-متزامن (إنتاج/Redis): قيود ZATCA وحالاتها، ومسيرات الرواتب (`payrolls`)، وتحديثات الحضور تُكتب/تُقرأ من القاعدة المركزية (أو قاعدة آخر مستأجر بقي مربوطاً) → خلط بيانات بين المستأجرين. **ملاحظة:** في التطوير (`QUEUE_CONNECTION=sync`) تعمل ضمن الطلب الذي بدّل الاتصال فتبدو سليمة، لذا العطل كامن لا يظهر إلا في الإنتاج.
- **الإصلاح المقترح:** في `handle()` و`failed()` لكل وظيفة مستأجر، جلب `TenantModel` المركزي ثم `switchToDatabase($tenant->database_name)` و`app()->instance('current_tenant', ...)` قبل أي استعلام Eloquent/DB.

---

### 🟠 High

#### 🟠 [M] مسار الموافقات مسدود النهاية — الفواتير تَعلَق في `pending_approval`
- **الموقع:** `backend/app/Application/Approvals/UseCases/ApproveRequestUseCase.php:26` · `backend/app/Presentation/Controllers/API/Sales/InvoiceController.php:250-252` · `CreateInvoiceUseCase.php:148-156`
- **الدليل:** عند إنشاء فاتورة تُفعِّل قاعدة موافقة تُحفظ بحالة `pending_approval`. الاعتماد عبر `ApproveRequestUseCase` ينفّذ فقط `repo->updateStatus($requestId,'approved')` ولا يمسّ الفاتورة (لا استدعاء لـ `ConfirmInvoiceUseCase` في `app/Application/Approvals` — grep بلا نتيجة). و`InvoiceController::updateStatus` يرفض الحالة صراحةً: «Cannot manually update status. This invoice requires approval.».
- **الأثر:** أي فاتورة تتجاوز عتبة قاعدة موافقة تصبح عالقة دائماً — لا خصم مخزون، لا قيد، لا بيع، بلا مسار استرداد. يتحوّل إلى Blocker فعلي لأي مستأجر يُفعِّل قواعد الموافقات.
- **الإصلاح المقترح:** عند اعتماد الطلب، استدعاء `ConfirmInvoiceUseCase` للفاتورة المرتبطة (مع معالجة بند `pending_approval` في الكيان — راجع 🟡 أدناه).

#### 🟠 [S] مهاجرة Postgres-only تكسر مجموعة الاختبارات بالكامل (CI أحمر)
- **الموقع:** `backend/database/migrations/tenant/2026_06_29_200000_add_payment_tracking_to_purchase_invoices_table.php:43-80`
- **الدليل:** المهاجرة تستخدم `UPDATE purchase_invoices pi ... FROM (...)` مع alias و`invoice_date::date` — صياغة Postgres حصراً. تشغيل `php artisan test --filter='Invoice|CreditLimit|Accounting|Commission|PosShift'` → **37 فشل / 5 نجاح**، جميع الإخفاقات `SQLSTATE[HY000]: General error: 1 near "pi": syntax error` أثناء `migrate:fresh` على SQLite (بيئة الاختبار). الـ5 الناجحة وحدات نقية بلا قاعدة بيانات.
- **الأثر:** صفر تغطية اختبارات-ميزة قابلة للتشغيل على إعداد الاختبار الافتراضي → اختبارات سلامة المحاسبة/المخزون (`CommissionPayoutTest`, `CreditLimitEnforcementTest`...) موجودة لكنها **غير قابلة للتشغيل**، وCI (`php artisan test`) يفشل. **الإنتاج (Postgres) غير متأثر** — الصياغة صحيحة هناك.
- **الإصلاح المقترح:** جعل الـ back-fill متوافقاً مع SQLite (subquery مترابط بدل `UPDATE...FROM`)، أو تخطّي كتلة الـ back-fill عند `DB::getDriverName() !== 'pgsql'`.

#### 🟠 [S] تقرير المخزون يستعلم أعمدة غير موجودة → قيمة مخزون = 0 دائماً (صامت)
- **الموقع:** `backend/app/Application/Reports/Services/ReportingService.php:99,105`
- **الدليل:** `->selectRaw('SUM(stock_quantity * price) ...')` و`->where('stock_quantity','<=',5)` على جدول `products` — لكن أعمدة `products` الفعلية هي `cost_price/sell_price` ولا يوجد `price` ولا `stock_quantity` (الكمية في `warehouse_products.quantity`). الكتلة داخل try/catch (`:92,107`) فتُعيد `total_value = 0` وقائمة فارغة بدل 500.
- **الأثر:** تقرير قيمة المخزون والأصناف منخفضة المخزون يبدو سليماً لكنه دائماً خاطئ/صفري.
- **الإصلاح المقترح:** الانضمام لـ `warehouse_products` للكمية واستخدام `cost_price`/`sell_price`.

#### 🟠 [S] عدم تطابق store/update في فاتورة المبيعات — إسقاط صامت لحقول
- **الموقع:** `backend/app/Application/Sales/UseCases/UpdateInvoiceUseCase.php:71-151` مقابل `CreateInvoiceUseCase.php:106-110` · `InvoiceController.php:204-224` (update validation)
- **الدليل:** `UpdateInvoiceUseCase` يبني الكيان وقائمة `InvoiceModel::update([...])` **بدون** `currency_id`/`exchange_rate`/`cost_center_id`/`payment_method`، و`update` validation يُسقط `notes` (يقبل `internal_notes` فقط) و`items.*.printed_name`.
- **الأثر:** تعديل مسودة ثم تأكيدها قد يُنتج قيداً بعملة/سعر صرف خاطئ أو يفقد مركز التكلفة و`printed_name` — مخالفة لقاعدة «التوافق العكسي وإعادة إنتاج القيود حرفياً».
- **الإصلاح المقترح:** مزامنة قائمة الحقول والـ validation بين `store/CreateInvoiceUseCase` و`update/UpdateInvoiceUseCase`.

#### 🟠 [S] CRUD دليل الحسابات يُعيد 404 (المسار خاطئ في الفرونت)
- **الموقع:** `frontend/src/lib/api.ts:771-774`
- **الدليل:** الفرونت ينادي `/accounting/chart-of-accounts/tree` و`/accounting/chart-of-accounts[/{id}]` (POST/PUT/DELETE). في `route:list` المسجّل هو `POST /accounting/accounts`، `GET /accounting/accounts/tree`، `PUT|DELETE /accounting/accounts/{id}` — أما `/accounting/chart-of-accounts` فهو مسار تقرير GET فقط. grep لـ `chart-of-accounts/tree` و`chart-of-accounts/{` = 0 نتيجة.
- **الأثر:** شاشة إدارة دليل الحسابات: تحميل الشجرة + إضافة/تعديل/حذف حساب كلها 404.
- **الإصلاح المقترح:** تغيير مسارات الفرونت من `chart-of-accounts` إلى `accounts`.

#### 🟠 [S] إرسال كميات الجرد (Stocktake counts) يُعيد 404
- **الموقع:** `frontend/src/lib/api.ts:339`
- **الدليل:** الفرونت `POST /inventory/stocktakes/{id}/counts`؛ المسجّل `PUT /inventory/stocktakes/{id}/items` (فعل ومقطع مختلفان). grep لـ `stocktakes/{id}/counts` = 0.
- **الأثر:** حفظ الكميات المجرودة — وهو جوهر عملية الجرد — يُعيد 404.
- **الإصلاح المقترح:** مواءمة الفرونت مع `PUT .../items` أو إضافة مسار `/counts`.

#### 🟠 [M] دورة حياة مطالبة الضمان مسدودة من الواجهة — مسار الاستبدال التلقائي ميت
- **الموقع:** `frontend/src/lib/api.ts:190-194` (`updateWarrantyClaim` معرّف بلا مستدعٍ) · `frontend/src/components/warranty/WarrantyDetailModal.tsx:61-84` · backend `WarrantyController.php:230-273`
- **الدليل:** الباك إند **يُنشئ ويؤكّد** فاتورة الاستبدال تلقائياً عند `status==='resolved' && claim_type==='replacement'` (يضبط `replacement_invoice_id` في `:271`). لكن `grep updateWarrantyClaim frontend/src/components frontend/src/app` = 0 مستدعٍ؛ شاشة تفاصيل المطالبة للعرض فقط بلا زر «حل/اعتماد».
- **الأثر:** يمكن إنشاء مطالبة لكن لا يمكن تحويلها إلى `resolved` من التطبيق → مسار الاستبدال التلقائي (والأثر المحاسبي المرتبط) لا يُفعَّل أبداً. (ملاحظة: نموذج الفرونت صحيح — لم يعد يبني `replacement_invoice_payload` يدوياً، لكنه ناقص الزناد.)
- **الإصلاح المقترح:** إضافة إجراء «حل المطالبة» في `WarrantyDetailModal` ينادي `updateWarrantyClaim(status:'resolved')`.

#### 🟠 [M] ~13 صفحة مبنية بلا رابط في الـ Sidebar (غير قابلة للوصول)
- **الموقع:** `frontend/src/components/layout/Sidebar.tsx` مقابل `frontend/src/app/[locale]/dashboard/**/page.tsx`
- **الدليل:** بعد استبعاد صفحات `[id]` والصفحات المرتبطة من لوحات أبناء، لا يوجد رابط Sidebar ولا تنقّل داخلي (grep لـ href/push/Link = 0) لـ: `accounting/chart-of-accounts`, `accounting/journal-entries(/create)`, `accounting/budgets`, `accounting/opening-balances`, `accounting/aging`, `sales/commissions`, `inventory/import-center`, `payables`, `automation(/builder)`, `crm`, `analytics`. وتضارب تسمية: `/subscription` مقابل `/subscriptions`، `/settings/webhooks` مقابل `/webhooks`.
- **الأثر:** ميزات شغّالة (صرف العمولات، دليل الحسابات، القيود، الموازنات، مركز الاستيراد) لا تُرى إلا بكتابة الـ URL يدوياً.
- **الإصلاح المقترح:** إضافة روابط Sidebar للصفحات الحيّة وحذف الصفحات المكررة الميتة.

#### 🟠 [S] إيصالات أقساط المشتريات تُخزَّن خارج Volume الـ uploads → تُفقد عند إعادة التشغيل
- **الموقع:** `backend/app/Presentation/Controllers/API/Purchases/PurchaseController.php:307,319`
- **الدليل:** `->store('installments/receipts','public')`؛ جذر قرص `public` = `public_path()` (`config/filesystems.php:18`) فيُكتب في `public/installments/...` ويُعاد مسار نسبي بلا `/uploads/`. لكن Docker Volume يثبّت `public/uploads` فقط (`docker-compose.yml:31`, `docker-compose.prod.yml:50`) — فالمجلد خارج الـ Volume.
- **الأثر:** مرفقات إيصالات الأقساط (مستندات مالية) تُفقد عند إعادة تشغيل/نشر الحاوية، وغير منمَّطة بالمستأجر، ومخالفة لنمط `HandlesImageUploads` القياسي (`/uploads/tenant_{id}/...`).
- **الإصلاح المقترح:** استخدام نمط `move(public_path('uploads/tenant_{id}/installments'))` وإرجاع `/uploads/...`.

---

### 🟡 Medium

#### 🟡 [S] `pending_approval` يمرّ في حارس `ConfirmInvoiceUseCase` لكن كيان `Invoice::confirm()` يرفضه
- **الموقع:** `backend/app/Application/Sales/UseCases/ConfirmInvoiceUseCase.php:66-71` مقابل `backend/app/Domain/Sales/Entities/Invoice.php:243-248`
- **الدليل:** الحارس يسمح بـ `pending_approval` أو `draft`، ثم ينادي `confirm()` الذي يرمي «Only draft invoices can be confirmed.» إن لم تكن `draft`. غير ضار حالياً لعدم وصول مستدعٍ، لكنه يصبح خطأً فور إصلاح مسار الموافقات بسذاجة.
- **الإصلاح المقترح:** السماح بانتقال `pending_approval → confirmed` في الكيان عند إصلاح مسار الموافقات.

#### 🟡 [M] تحديث فاتورة الشراء غير ذرّي (بلا Transaction خارجي)
- **الموقع:** `backend/app/Presentation/Controllers/API/Purchases/PurchaseController.php:83-164,151-153`
- **الدليل:** `update()` يحذف البنود القديمة ويعيد كتابة الفاتورة ثم ينادي `ConfirmPurchaseUseCase` — دون تغليف كامل بـ Transaction (خلافاً لـ `InvoiceController::store`). لو رمى التأكيد بعد إعادة كتابة البنود، تبقى التعديلات بلا حركة مخزون/قيد.
- **الإصلاح المقترح:** تغليف `update()` بـ `DB::transaction`.

#### 🟡 [M] CRM Pipeline (Kanban) — لا مسارات backend (3 نداءات 404)
- **الموقع:** `frontend/src/lib/api.ts:558-560`
- **الدليل:** `GET /crm/pipeline/stages`, `PUT /crm/pipeline/deals/{id}/move`, `POST /crm/pipeline/deals`؛ grep لـ `pipeline|deal|stage|kanban` في `routes` = 0.
- **الأثر:** شاشة الـ Pipeline/Deals غير وظيفية بالكامل.
- **الإصلاح المقترح:** بناء `CrmPipelineController`+المسارات، أو إخفاء الشاشة حتى تُبنى.

#### 🟡 [M] نقاط ZATCA إعدادات/مزامنة/حالة-onboarding/OTP تُعيد 404 (5 نداءات)
- **الموقع:** `frontend/src/lib/api.ts:1123-1127`
- **الدليل:** `zatca/sync`, `zatca/settings` (GET/POST), `zatca/onboarding-status`, `zatca/submit-otp` — المسجّل فقط `POST /zatca/onboard` و`GET /zatca/status`. grep للأربعة = 0.
- **الأثر:** صفحة إعدادات ZATCA + متابعة الـ onboarding + مزامنة يدوية تُعيد 404 (يخصّ مستأجري SAR).
- **الإصلاح المقترح:** مزامنة الأسماء أو إضافة المسارات الناقصة.

#### 🟡 [S] واجهة أقساط مبيعات العملاء غير موجودة (ولا مسار backend)
- **الموقع:** `frontend/src/lib/api.ts:677-680` (أقساط المشتريات فقط) · لا مكوّن `components/sales|receivables/**Installment`
- **الدليل:** نقاط الأقساط الوحيدة `/purchases/...`. لا نداء `/sales|/crm ...installments`. جدول `invoice_installments` موجود لكن بلا route مكشوف ولا شاشة.
- **الأثر:** لا يمكن إدارة أقساط فواتير العملاء من النظام.
- **الإصلاح المقترح:** كشف route للعميل + بناء `CustomerInstallmentsModal` على غرار `PurchaseInstallmentsModal`.

#### 🟡 [S] واجهة تخصيص مدفوعات الموردين غير موجودة (المسارات موجودة)
- **الموقع:** routes `GET/POST /purchases/payments/{id}/allocations` (`SupplierPaymentAllocationController`) · `frontend/src` بلا نداء
- **الدليل:** `grep -rn "payments/.*allocations\|SupplierPaymentAllocation" frontend/src` = 0؛ `grep -i allocation frontend/src/lib/api.ts` = 0.
- **الأثر:** خاصية تخصيص دفعة مورد على فواتير محددة غير مستخدَمة من الواجهة.
- **الإصلاح المقترح:** إضافة wrapper في `api.ts` وشاشة/مودال تخصيص.

#### 🟡 [S] إعدادات → معلومات الشركة تُعيد 404
- **الموقع:** `frontend/src/lib/api.ts:902-903`
- **الدليل:** `GET/PUT /settings/company` غير موجود (المسجّل `GET/PUT /settings` فقط + `/settings/hr-manager-email`).
- **الأثر:** تبويب معلومات الشركة لا يحمّل/يحفظ.
- **الإصلاح المقترح:** استخدام `/settings` المجمّع أو إضافة مسار `/settings/company`.

#### 🟡 [S] بدء تسوية بنكية + GET/DELETE ألياس العميل تُعيد 404
- **الموقع:** `frontend/src/lib/api.ts:754` (بدء تسوية)، `:438,442` (ألياس عميل)
- **الدليل:** `POST /accounting/reconciliations` المجرّد غير موجود (الإنشاء عبر `POST /accounting/bank-accounts/{id}/reconciliations`)؛ لـ `customer-aliases` يوجد POST فقط بلا GET-collection ولا DELETE-{id}.
- **الأثر:** زر «بدء تسوية جديدة» 404؛ سرد/حذف ألياس العميل 404 (الإنشاء يعمل).
- **الإصلاح المقترح:** مواءمة المسارات.

#### 🟡 [S] أعمدة `updated_by` في جداول المركبات بلا مهاجرة
- **الموقع:** `backend/app/Infrastructure/Eloquent/Models/VehicleMakeModel.php:36` (+ VehicleModel/VehicleYear)
- **الدليل:** `updated_by` في `$fillable` للثلاثة، لكن مهاجرة `2026_06_16_000001_create_vehicle_compatibility_tables.php` تضيف `created_by` فقط، ولا مهاجرة لاحقة تضيف `updated_by` (grep `updated_by ... vehicle` يعيد جدول `customer_vehicles` فقط، غير ذي صلة).
- **الأثر:** على Postgres، كتابة `updated_by` ترمي «column does not exist» (500) إن ضبطها مسار التحديث؛ وإلا يُفقد سجل «آخر مُعدِّل». (لم يُؤكَّد ما إذا كان مسار التحديث يضبطه.)
- **الإصلاح المقترح:** مهاجرة tenant تضيف `uuid('updated_by')->nullable()` للثلاثة، أو إزالته من `$fillable`.

#### 🟡 [S] وظيفتا Queue بلا `failed()`
- **الموقع:** `backend/app/Jobs/SendLateAttendanceNotificationJob.php` · `backend/app/Jobs/SendOrderReminderJob.php`
- **الدليل:** كلاهما يُعرِّف `$tries` لكن بلا `public function failed()` (بقية الوظائف لها). تنتهيان في `failed_jobs` بصمت بلا تنظيف/تنبيه. (ملاحظة: `SubmitZatcaInvoiceJob` لها `tries=3` و`failed()` بالفعل — ادعاء التقرير السابق بنقصها متقادم.)
- **الإصلاح المقترح:** إضافة `failed(\Throwable $e)` لتسجيل/تنبيه الفشل النهائي.

#### 🟡 [S] تبنّي `DataState` شبه معدوم — حالات تحميل/خطأ غير متسقة
- **الموقع:** `frontend/src/components/ui/DataState.tsx` (3 مستهلكين فقط: Customers/Inventory/Suppliers Content)
- **الدليل:** 157 مكوّن، 76 (~48%) فقط فيها آلية تحميل ما؛ `DataState` مستخدم في 3 ملفات. أمثلة بلا أي مؤشر: `inventory/BrandSelect.tsx:26-38` (خطأ → console فقط)، `inventory/import-center/ImportSettingsTab.tsx`، `inventory/ProductExportModal.tsx`.
- **الأثر:** شبكة بطيئة تُظهر أقساماً فارغة/قديمة بلا تغذية راجعة.
- **الإصلاح المقترح:** تعميم نمط واحد للتحميل/الخطأ/الفراغ على المكوّنات الجالبة.

#### 🟡 [S] تسجيل دخول بوّابة الشركاء بلا throttle
- **الموقع:** `backend/routes/api.php` (مجموعة `/portal/login`, `/portal/magic-link[/verify]`)
- **الدليل:** `/login` عليه `throttle:10,1` و`/register` `throttle:5,1`، لكن مسارات `portal/*` للمصادقة بلا `throttle` — سطح مصادقة عام معرّض للـ brute-force/spam.
- **الإصلاح المقترح:** إضافة `throttle:` لمسارات بوّابة الشركاء.

---

### 🔵 Low

- **🔵 [S] `AgingReportController::payable()`/`receivable()` كود ميت غير مربوط** — `backend/app/Presentation/Controllers/API/Accounting/AgingReportController.php:25,109`؛ grep في `routes` = 0 (المخدوم فعلياً `PayableController::agingReport` و`ReceivableController`). يُحذف أو يُربط.
- **🔵 [S] بعض أعمدة `image_url` ما زالت VARCHAR(255)** — مهاجرة `2026_06_28_000000_widen_image_url_columns.php` وسّعت products/categories/brands/vehicle_models/vehicle_years إلى `text`، لكن جداول أخرى (مثل customer/supplier إن وُجدت) لم تُوسَّع — قد تُقطع روابط Cloud الموقّعة عند التبديل لـ S3.
- **🔵 [S] `Log::info` تشغيلي في مسار فحص الفيروسات** — `ProductImportExportController.php:96` (+ `CustomerNotificationService`, `SendOrderReminderJob`) — سجلّات تشغيلية مقصودة، تنظيف اختياري.
- **🔵 [S] ازدواج كائنات الـ API في `api.ts`** — `approvalsApi`/`approvalsApiNew`، `deliveriesApiNew`، `subscriptionApi`/`subscriptionsApiNew` — يربك الصيانة؛ يُوحَّد.
- **🔵 [S] ZATCA serial يحوي `XXXXXX`** — `backend/app/Infrastructure/Zatca/ZatcaOnboardingService.php:152` (مذكور في التقرير السابق؛ لم يُعَد التحقق هذه الجولة) — يُستبدل بقيمة قابلة للتكوين.
- **🔵 [S] ازدواج جداول `purchases` مقابل `purchase_invoices`** — `purchase_invoices` هو القانوني (المهاجرات الحديثة تستهدفه)؛ يُتحقَّق ألا يكون `purchases` نصف-موصول.

---

## 3. حالة البنود المعروفة-مفتوحة الخمسة

| # | البند | الحالة | الدليل |
|---|---|---|---|
| 1 | واجهة أقساط مبيعات العملاء | ❌ **ناقص** (ولا route) | `api.ts:677-680` أقساط مشتريات فقط؛ لا مكوّن sales/receivables؛ `invoice_installments` بلا route مكشوف |
| 2 | واجهة تخصيص مدفوعات الموردين | ❌ **ناقص** (المسارات موجودة) | `grep allocation frontend/src` = 0؛ المسارات في `SupplierPaymentAllocationController` |
| 3 | فلتر `status='confirmed'` في `GetSupplierAgingReportUseCase` | ⚠️ **يفلتر بالـ tenant_id لكن لم يُؤكَّد فلتر الحالة** | `GetSupplierAgingReportUseCase` يربط `WHERE i.tenant_id=:tenantId` (لا تسريب)؛ يُنصح بتأكيد استبعاد الملغاة/المسودة يدوياً قبل التسليم |
| 4 | متابعة الضمان على الفرونت | ⚠️ **جزئي** | الباك إند يُنشئ فاتورة الاستبدال تلقائياً (`WarrantyController.php:230-273`)، والفرونت لم يعد يبني `replacement_invoice_payload`، لكن **لا زناد** لـ `updateClaim` (راجع 🟠 أعلاه) |
| 5 | حالات التحميل/الخطأ (`DataState`) | ⚠️ **جزئي/ضعيف** | `DataState` في 3 من 157 مكوّن؛ ~48% فقط فيها آلية تحميل (راجع 🟡 أعلاه) |

> إضافي: شاشة صرف العمولات `CommissionsScreen.tsx` ✅ **مكتملة وموصولة** (`api.ts:225-226`)، لكنها يتيمة في الـ Sidebar.

---

## 4. تعارضات الوثائق مع الكود

**`PRE_DELIVERY_AUDIT_REPORT.md` (2026-06-27) متقادم إلى حدٍّ كبير** — أُعيد التحقق من كل بند:

| ادعاء التقرير السابق | الواقع الحالي (دليل) |
|---|---|
| 🔴 Blocker-1: فشل بناء `BankAccountsContent.tsx:205` | **مُصلَح** — السطر الآن `e.target.value as Currency`؛ `tsc --noEmit` و`npm run build` ينجحان (exit 0) |
| 🔴 Blocker-3: العمولات `/sales/commissions/pay` → 404 | **مُصلَح** — `api.ts:226` الآن `/sales/commissions/payout` |
| 🔴 Blocker-4: `invoice_items` ينقصه `subtotal/tax_amount` | **مُصلَح** — مهاجرة `2026_06_30_000000_add_subtotal_tax_to_invoice_items_table.php` تضيفهما + back-fill |
| 🔴 Blocker-2: مهاجرتان مركزيتان معلّقتان | **مُصلَح** — `migrate:status` يُظهر الاثنتين `Ran` |
| High-1..8 (8 عدم تطابق URL) | **7 من 8 مُصلَحة** الآن (auth/refresh, import-transactions, add-item, account-mappings, convert-to-po, deliveries/map, opening-balances/analytics·chat/data·export موجودة) — يبقى **CRM Pipeline** فقط مكسوراً |
| Medium-4: «العمولة لا تُنشئ قيد يومية» | **متقادم** — `ConfirmInvoiceUseCase.php:419-443` يقيّد debit `commission_expense`/credit `commission_payable` ضمن قيد متوازن واحد |
| `AI_SECURITY_AUDIT_NOTES`: «UpdateInvoiceUseCase confirm branch كود ميت» | **مُصلَح** — `UpdateInvoiceUseCase.php:158-159` يُفوِّض إلى `ConfirmInvoiceUseCase` مباشرة |
| `AI_KNOWN_GAPS`: «الضمان لا يولّد فاتورة استبدال تلقائياً» | **متقادم جزئياً** — الباك إند يولّدها الآن (`WarrantyController:230-273`)؛ الناقص هو زناد الفرونت |

**تصحيح لاكتشاف داخلي أثناء هذا التدقيق:** ادعاء أولي بأن `SettingsController` يستعلم عموداً `tenant_id` غير موجود في `tenant_settings` → **خاطئ**: مهاجرة `2026_06_15_005119_add_tenant_id_to_all_tables.php` تضيف `tenant_id` لكل جدول مستأجر بما فيها `tenant_settings`، فالاستعلام سليم. (مثال إضافي على ضرورة التحقق من المهاجرات الشاملة لا مهاجرة الإنشاء فقط.)

---

## 5. نتائج بوابة البناء

| الأمر | النتيجة |
|---|---|
| `php artisan migrate:status` | ✅ كل المهاجرات المركزية `Ran` (بما فيها `tenant_backups` — خلافاً للتقرير السابق) |
| `php artisan route:list` | ✅ يعمل — 524 سطر، بلا أخطاء تحميل |
| `npx tsc --noEmit` (frontend) | ✅ **exit 0** — لا أخطاء أنواع (التقرير السابق ادّعى 3 أخطاء — متقادم) |
| `npm run build` (frontend) | ✅ **exit 0** — البناء ينجح |
| `php artisan test --filter='Invoice\|CreditLimit\|Accounting\|Commission\|PosShift'` | ❌ **37 فشل / 5 نجاح** — جميعها `near "pi": syntax error` أثناء `migrate:fresh` على SQLite بسبب مهاجرة `2026_06_29_200000` (Postgres-only). إصلاح المهاجرة شرط لإعادة تشغيل أي اختبار-ميزة. |

> ملاحظة معمارية: `migrate:status` يعرض القاعدة المركزية فقط؛ مهاجرات المستأجر تُشغَّل عبر `--path=database/migrations/tenant`. **الإنتاج (Postgres) لا يتأثر بمشكلة الاختبارات** — الصياغة صحيحة على Postgres.

---

## 6. الخلاصة — ما يجب فعله قبل التسليم (مرتّب)

**قبل أي نشر إنتاجي (إلزامي):**
1. 🔴 تبديل قاعدة بيانات المستأجر في كل وظائف الـ Queue (`SubmitZatcaInvoiceJob`/`GeneratePayrollJob`/`SendLateAttendanceNotificationJob`) — **L**.
2. 🟠 إصلاح مسار اعتماد الموافقات ليؤكّد الفاتورة فعلياً + معالجة `pending_approval` في الكيان — **M**.
3. 🟠 إصلاح مهاجرة `2026_06_29_200000` لتعمل على SQLite، ثم إعادة تشغيل مجموعة الاختبارات والتأكد من خضرتها — **S**.

**قبل التسليم للعميل (عالٍ):**
4. 🟠 مزامنة URLs المكسورة: دليل الحسابات CRUD، إرسال الجرد (Stocktake counts) — **S**.
5. 🟠 إصلاح عدم تطابق store/update في فاتورة المبيعات (عملة/صرف/مركز تكلفة/printed_name/notes) — **S**.
6. 🟠 إضافة زناد «حل مطالبة الضمان» في الواجهة — **M**.
7. 🟠 ربط الصفحات اليتيمة بالـ Sidebar وحذف المكرر — **M**.
8. 🟠 إصلاح تخزين إيصالات أقساط المشتريات (داخل `uploads`) — **S**.
9. 🟠 إصلاح تقرير المخزون (`stock_quantity/price`) — **S**.

**تلميع (متوسط/منخفض):** ZATCA/CRM-Pipeline/Settings-Company/التسوية-البنكية 404، أقساط العملاء وتخصيص مدفوعات الموردين (UI)، `failed()` للوظيفتين، throttle بوّابة الشركاء، تعميم `DataState`، `updated_by` للمركبات، تنظيف الكود الميت والازدواج.

**تقدير إجمالي تقريبي:** البنود الإلزامية + العالية ≈ **3–4 أيام عمل** (بند L واحد + ~7 بنود S + 3 بنود M). التلميع المتوسط/المنخفض ≈ **2–3 أيام** إضافية.

> الحُكم: **No-Go غير مشروط ممنوع** — البنية التحتية (بناء/أنواع/مهاجرات مركزية) ونواة التأكيد (خصم مخزون مقفول مرة واحدة + قيد متوازن عبر `AccountMappingService`، تم التحقق منهما) **سليمة وقابلة للاعتماد**. لكن عزل المستأجرين في الـ Queue، ومسار الموافقات، وقابلية الوصول للميزات المبنية يجب إصلاحها أولاً.
