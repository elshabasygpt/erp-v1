# خطة الإصلاح والتحسين الشاملة — ERP قطع غيار السيارات

> **المصدر:** كل بند هنا مأخوذ من `DELIVERY_READINESS.md` (2026-06-28) ومربوط برقمه ودليله.
> **الهدف:** إصلاح كل المشاكل (🔴 1 · 🟠 9 · 🟡 12 · 🔵 6 = 28 بنداً) بترتيب يحترم الاعتماديات وبوابات تحقق بعد كل مرحلة.
> **أسلوب التنفيذ المُتّفق عليه:** مرحلة-مرحلة مع وقفة عند كل بوابة تحقق · **CRM Pipeline:** بناء backend كامل.
> **الفرع:** `fix/delivery-readiness`.

---

## سجل التقدّم (Progress Log)

### ✅ Phase 0 — مكتملة (بوابة الاختبارات خضراء)
- **P0.1** أُصلحت مهاجرة `2026_06_29_200000` لتعمل على SQLite (driver-aware للـ back-fill والفهرس). `migrate:fresh` يكتمل الآن.
- **اكتشاف جانبي #A (باج إنتاجي):** `WarrantyModel.php` الأسطر 31/36/46 كانت تكتب اسم الكلاس بنطاق مضاعف (بلا `\` بادئة داخل نفس الـ namespace) → علاقات `invoice()/invoiceItem()/customer()` مكسورة (خطأ 500 عند تحميلها). **أُصلح** بالاسم القصير. لا يوجد نفس النمط في موديلات أخرى (تم الفحص).
- **اكتشاف جانبي #B (باج محاسبي):** `ConfirmInvoiceUseCase::createJournalEntry` كان يضيف سطر الإيراد دائماً حتى لو `netRevenue == 0` → فاتورة الاستبدال بسعر صفر تُنتج سطر قيد صفري يرفضه الدومين (422). **أُصلح** بحراسة `if ($netRevenue > 0)` (متسق مع باقي السطور؛ محايد للفواتير العادية).
- **النتيجة النهائية:** من **«كل اختبارات المستأجر تفشل عند setup»** → **190 اختبار · 0 فشل · 3 متخطّاة** (المجموعة كلها خضراء).
- **الـ4 إخفاقات السابقة — عولجت بالكامل:**
  - 1× `ProductImageTest` → **أُصلح**: حُدّث التأكيد القديم ليتوقّع المسار المنمَّط بالمستأجر `/uploads/tenant_{id}/products/` (يُشتق من الـURL، لا hardcode).
  - 3× `Tenancy/TenantBackupTest` → السبب الجذري كان **مزدوجاً**: (أ) إعلان `use RefreshDatabase` مكرّر في الكلاس فوق الـ parent كان يكسر مشاركة الـ PDO للـ `:memory:` (أُزيل) → اختفت `no such table: tenants`؛ (ب) `BACKUP_ENCRYPTION_KEY` غير مضبوط في الاختبار (أُضيف لـ `phpunit.xml`). بعدها تبيّن أنها اختبارات تكامل DR تعمل shell-out لأدوات Unix (pg_dump/gzip/tar/openssl) وغير قابلة للتشغيل على Windows → **متخطّاة على Windows بحارس صريح** (تعمل على CI/Linux). **ليست "نجاحاً" على Windows بل تخطّياً بيئياً شفافاً.**
- **بند تنظيف اكتُشف:** `->dump()` متروك في أحد الاختبارات (ناتج `TestResponse.php:1709`) → يُضاف لـ Phase 6.

> الملفات المعدّلة في Phase 0:
> - كود: `migrations/tenant/2026_06_29_200000_*.php` · `Models/WarrantyModel.php` · `UseCases/ConfirmInvoiceUseCase.php`
> - اختبار/إعداد: `tests/Feature/ProductImageTest.php` · `tests/Feature/Tenancy/TenantBackupTest.php` · `phpunit.xml`
> (غير مُلتزَمة بعد — في انتظار مراجعتك.)

### ✅ Phase 1 — مكتملة (أمان عزل المستأجرين)
- **Trait جديد** `app/Jobs/Concerns/RunsInTenantContext.php`: يحلّ `TenantModel` من القاعدة المركزية ثم `switchToDatabase($tenant->database_name)` ويربط `current_tenant` (على نمط `TenantMiddleware`/`BackupTenantJob`)، مع `shutdownTenantContext` في `finally`.
- **حارس أمان مهم:** لو السياق مضبوط مسبقاً لنفس المستأجر (تشغيل sync داخل طلب) → boot/shutdown = no-op يحفظ سياق المتصل. **هذا أصلح انحداراً اكتشفته** (الإصدار الأول كان يحذف `current_tenant` الخاص بالاختبار في وضع sync → `InventoryValuationService:43` يفشل).
- **طُبِّق على 5 وظائف** (اتّضح أنها 5 لا 4): `SubmitZatcaInvoiceJob`، `GeneratePayrollJob`، `SendWebhookJob` (لم يكن مذكوراً في التقرير لكن له نفس الباج)، `SendOrderReminderJob`، `SendLateAttendanceNotificationJob`.
- **إعادة هيكلة `SendLateAttendanceNotificationJob`:** كان يمرّر Eloquent Models في الـ constructor (تُعاد قراءتها عند فك التسلسل على اتصال خاطئ قبل `handle()`) → حُوّل لـ IDs + بيانات جزاء مسطّحة (scalar)، وتُحلّ الـ models داخل `handle()` بعد الـ boot. حُدِّث موضع dispatch في `AttendanceController`.
- **`SendOrderReminderJob`:** أُضيف `tenantId` للـ constructor + حُدِّث dispatch في `ProcessOrderReminders`.
- **#20 مطوي:** أُضيف `failed()` لـ `SendOrderReminderJob` و`SendLateAttendanceNotificationJob`.
- **إصلاح دقيق:** الـ fallback في `getManagerEmail` يستعلم `tenant_users` (جدول **مركزي**) على الاتصال المركزي صراحةً بعد التبديل.
- **اختبار جديد** `tests/Feature/Jobs/TenantJobIsolationTest.php` (يتحقّق من التبديل بالاسم الصحيح + ربط/تنظيف `current_tenant` + الإجهاض عند غياب المستأجر).
- **النتيجة:** المجموعة الكاملة **192 اختبار · 504 تأكيد · 0 فشل · 3 متخطّاة**.

> **اكتُشف للمراحل اللاحقة:** أمر `ProcessOrderReminders` نفسه يستعلم موديلات tenant بدون تبديل/لفّ على المستأجرين (لن يجد الجداول على القاعدة المركزية في الإنتاج) — نفس عائلة #1 لكن على مستوى الأمر، يحتاج لفّاً على المستأجرين كـ `MigrateAllTenantsCommand`. + `dd()` متروك في `AccountingIntegrityTest:224` (دَيْن اختبار) → Phase 6.

### ✅ Phase 2 — مكتملة (النواة الحسّاسة: مبيعات/محاسبة)
- **P2.1 (#2 + #11) مسار الموافقات:** `Invoice::confirm()` يسمح الآن بـ `draft` **أو** `pending_approval`؛ و`ApproveRequestUseCase` (حُقِن فيه `ConfirmInvoiceUseCase`) يؤكّد الفاتورة المعتمدة داخل `DB::transaction` واحد — فلو فشل التأكيد (نفد المخزون أثناء الانتظار) يتراجع الاعتماد كله. اختبار: حالة موجبة (خصم مرة واحدة + قيد متوازن) + سالبة (rollback عند نقص المخزون).
- **P2.2 (#5) تطابق store/update:** أُضيف `notes`، `items.*.printed_name` لـ validation التحديث، و`payment_method` لـ `UpdateInvoiceDTO` + حُفِظ في `UpdateInvoiceUseCase`. (تبيّن أن `currency_id/cost_center_id/exchange_rate` **غير ممرَّرة في مساري الإنشاء والتحديث معاً** — فهي فجوة فيتشر منفصلة لا فجوة تطابق؛ وُثّقت ولم تُنصَّف على التحديث فقط.) اختبار: round-trip للثلاثة + توازن القيد بعد تأكيد مسودة معدّلة.
- **P2.3 (#12) ذرّية تحديث الشراء:** `PurchaseController::update` لُفّ بالكامل في `\DB::transaction` (إعادة كتابة البنود + التأكيد ذرّيان).
- **P2.4 (#4) تقرير المخزون:** استبدال `products.stock_quantity/price` غير الموجودَين بربط `warehouse_products` (تقييم = Σ كمية×متوسط تكلفة، ومنخفض المخزون مقابل `stock_alert_level`). اختبار: قيمة صحيحة (560) + إشارة منخفض المخزون.
- **إصلاح تبعي:** اختبار الوحدة `ApproveRequestUseCaseTest` حُدِّث لتوقيع الـ constructor الجديد (تحوّل لـ `Tests\TestCase` + `ConfirmInvoiceUseCase` عبر `app()`).
- **النتيجة:** المجموعة الكاملة **197 اختبار · 534 تأكيد · 0 فشل · 3 متخطّاة**.

---

---

## قواعد حاكمة طوال التنفيذ (من `CLAUDE.md` — غير قابلة للتفاوض)

1. **المبيعات/المخزون/المحاسبة:** كل تعديل يتبع `Audit → Design → Implement → Test → Re-audit`. ممنوع تخطّي مرحلة.
2. **ثابت محاسبي:** كل فاتورة مؤكّدة تُنتج قيداً واحداً `SUM(debit) == SUM(credit)`. أي تعديل على هذه النطاقات يلزمه اختبار يثبت: (أ) المخزون لم يتغيّر، (ب) القيد متوازن — على نمط `InvoicePrintedNameTest`.
3. **التوافق العكسي قيد صارم:** الفواتير والحركات والقيود الموجودة تظل قابلة للإنتاج حرفياً بعد أي تعديل.
4. **الذرّية والأقفال:** أي ميزة تمتد لأكثر من use-case تشترك في Transaction واحد؛ أي فحص-ثم-تحديث على رصيد/مخزون يستخدم `lockForUpdate()`.
5. **مكان المهاجرات:** جداول المستأجر → `database/migrations/tenant/`؛ المركزية → `database/migrations/`. اختبار بـ `migrate:fresh` لا `migrate`.
6. **التحقق قبل «تم»:** إعادة قراءة كل ملف مُعدَّل بالكامل + تتبّع المسار route→DB→route + تشغيل اختبارات (بما فيها الحالات السلبية).

---

## نظرة عامة على المراحل والاعتماديات

```
Phase 0  بوابة الاختبارات        ← يجب أولاً (بدونها لا يمكن التحقق من أي شيء)
   │
Phase 1  أمان المستأجرين (Blocker) ──┐
   │                                 │  مستقلة عن بعضها، لكن كلها تعتمد على Phase 0
Phase 2  نواة المبيعات/المحاسبة ──────┤
   │                                 │
Phase 3  عقد الفرونت↔الباك (404) ─────┤
   │                                 │
Phase 4  ميزات UI ناقصة ─────────────┤
   │                                 │
Phase 5  تقوية تشغيل/أمان ───────────┤
   │                                 │
Phase 6  تنظيف وتلميع ───────────────┘
```

> **لماذا Phase 0 أولاً؟** القاعدة 1+2 تتطلبان إثبات كل إصلاح باختبار. المهاجرة المكسورة (بند #3) تمنع `migrate:fresh` على SQLite فلا يعمل أي اختبار-ميزة. حتى نُصلحها، أي «تم» في النواة الحسّاسة غير قابل للإثبات.

---

# Phase 0 — بوابة الاختبارات (يوم نصف · S)

### P0.1 — إصلاح مهاجرة Postgres-only التي تكسر مجموعة الاختبارات `[#3 🟠]`
- **الملف:** `backend/database/migrations/tenant/2026_06_29_200000_add_payment_tracking_to_purchase_invoices_table.php:43-80`
- **المشكلة:** `UPDATE purchase_invoices pi ... FROM (...)` + `invoice_date::date` صياغة Postgres حصراً → `near "pi": syntax error` على SQLite أثناء `migrate:fresh`.
- **التصميم:** تغليف كتلتَي الـ back-fill بفحص محرّك:
  ```php
  if (DB::connection('tenant')->getDriverName() === 'pgsql') { /* الكود الحالي */ }
  else { /* صيغة subquery مترابطة متوافقة مع SQLite، أو تخطّي الـ back-fill في الاختبار */ }
  ```
  (الإنتاج Postgres يظل يستخدم المسار الأمثل؛ الاختبار يحصل على مسار متوافق.)
- **التحقق:** `php artisan migrate:fresh --path=database/migrations/tenant` ينجح على SQLite، ثم `php -c /tmp/php_test.ini vendor/bin/phpunit` → المجموعة كاملة تعمل (الهدف: لا أخطاء setup؛ كان 37 فشل/5 نجاح).
- **مخاطرة:** منخفضة — تغيير محصور في back-fill. **لا تلمس** منطق `ADD COLUMN` نفسه (الأعمدة مطلوبة في الإنتاج).
- **مكسب جانبي:** يُفعّل إعادة تشغيل `CommissionPayoutTest`, `CreditLimitEnforcementTest`, `AccountingIntegrityTest` المستخدمة كبوابة لبقية المراحل.

> **بوابة Phase 0:** المجموعة تعمل وتُسجَّل النتيجة الأساسية (baseline) قبل أي تعديل آخر.

---

# Phase 1 — أمان عزل المستأجرين (يوم+ · L) 🔴

### P1.1 — تبديل قاعدة بيانات المستأجر في كل وظائف الـ Queue `[#1 🔴]`
- **الملفات:** `backend/app/Jobs/SubmitZatcaInvoiceJob.php` · `GeneratePayrollJob.php` · `SendLateAttendanceNotificationJob.php` · `SendOrderReminderJob.php` (وأي Job مستأجر آخر)
- **السبب الجذري:** الوظائف تكتفي بـ `DB::setDefaultConnection('tenant')`، لكن اتصال `tenant` في عامل Queue منفصل يشير افتراضياً إلى القاعدة المركزية (`config/database.php:35`). النمط الصحيح موجود في `TenantMiddleware.php:57` و`TenantDatabaseManager::switchToDatabase()`.
- **التصميم (DRY — Trait مشترك):** إنشاء `app/Jobs/Concerns/RunsInTenantContext.php`:
  ```php
  protected function bootTenantContext(string $tenantId): TenantModel {
      $tenant = TenantModel::query()->findOrFail($tenantId);   // central connection
      app(TenantDatabaseManager::class)->switchToDatabase($tenant->database_name);
      app()->instance('current_tenant', $tenant);
      return $tenant;
  }
  protected function shutdownTenantContext(): void {
      app(TenantDatabaseManager::class)->resetConnection();
  }
  ```
  استدعاؤها في بداية `handle()` و`failed()` لكل وظيفة (بدل `DB::setDefaultConnection('tenant')` المجرّد)، و`shutdownTenantContext()` في `finally`.
- **دقّة مهمة:** `TenantModel` يجب أن يُحلّ من القاعدة **المركزية** قبل التبديل (هو نموذج مركزي بـ connection ثابت — تأكّد منه). الترتيب: حلّ Tenant → switch → استعلامات tenant.
- **التحقق (اختبار جديد):** `tests/Feature/Jobs/TenantJobIsolationTest.php`:
  - أنشئ مستأجرين A وB ببيانات مختلفة.
  - شغّل الوظيفة لـ A (عبر عامل Queue حقيقي أو محاكاته بـ `Bus::fake` غير كافٍ — استعمل تنفيذ مباشر بعد `resetConnection`).
  - أكّد أن الكتابة تمّت في قاعدة A وأن قاعدة B/المركزية لم تتأثر.
- **مخاطرة:** متوسطة — يلمس 4 وظائف حسّاسة. خفّفها بنشر الـ Trait على وظيفة واحدة أولاً (`SubmitZatcaInvoiceJob`) مع اختبارها، ثم التعميم.
- **اعتماد:** يحلّ جزئياً جذر #20 (نفس الوظيفتين) — يُنفَّذ مع P5.1.

> **بوابة Phase 1:** اختبار عزل المستأجر أخضر؛ تشغيل يدوي لعامل Queue (`php artisan queue:work`) على مستأجرين يؤكّد عدم التسرّب.

---

# Phase 2 — نواة المبيعات/المخزون/المحاسبة (يوم+ · L) 🟠

> كل بند هنا يتبع `Audit→Design→Implement→Test→Re-audit` ويرفق اختبار «لا أثر على المخزون/توازن القيد».

### P2.1 — إكمال مسار الموافقات + إصلاح آلة حالة الكيان `[#2 🟠 + #11 🟡]` (مترابطان — يُحلّان معاً)
- **الملفات:** `app/Application/Approvals/UseCases/ApproveRequestUseCase.php:26` · `app/Domain/Sales/Entities/Invoice.php:243-248` · `app/Application/Sales/UseCases/ConfirmInvoiceUseCase.php:66` · `ApprovalController.php:48`
- **Audit (مؤكَّد):** `requestApproval('invoice', $invoiceId, ...)` يُنشئ طلباً بـ `entity_type='invoice'`/`entity_id=$invoiceId` (`ApprovalWorkflowService.php:161-168`). الاعتماد يضبط الطلب `approved` فقط ولا يمسّ الفاتورة، والفاتورة تظل `pending_approval` ويرفض `updateStatus` لمسها يدوياً.
- **التصميم:**
  1. في `Invoice::confirm()` اسمح بالانتقال من `draft` **أو** `pending_approval` → `confirmed` (يحلّ #11 الكامن).
  2. في `ApproveRequestUseCase::execute`: بعد `updateStatus(...,'approved')`، إن كان `entity_type==='invoice'` استدعِ `ConfirmInvoiceUseCase` على `entity_id` داخل نفس Transaction. (وسّع لاحقاً لـ `return` بنفس النمط؛ `stock_transfer` مُعالَج مسبقاً عبر `StockTransferService`.)
  3. حقن `ConfirmInvoiceUseCase` في `ApproveRequestUseCase` (DI).
- **التوافق العكسي:** الفواتير التي لا تُفعّل قاعدة موافقة يبقى مسارها كما هو (draft→confirm عبر `updateStatus`). لا تغيير على القيد الناتج.
- **التحقق:** `tests/Feature/Approvals/ApprovalConfirmsInvoiceTest.php`: فاتورة تتجاوز عتبة → `pending_approval` (لا خصم/قيد) → اعتماد → تأكيد تلقائي مع خصم مخزون **مرة واحدة** وقيد متوازن `SUM(debit)==SUM(credit)`. + حالة سلبية: رفض الطلب لا يخصم مخزوناً.
- **مخاطرة:** عالية (يلمس آلة حالة الفاتورة) → الاختبار الإلزامي أعلاه حاجز.

### P2.2 — مزامنة store/update لفاتورة المبيعات `[#5 🟠]`
- **الملفات:** `app/Application/Sales/UseCases/UpdateInvoiceUseCase.php:71-151` · `InvoiceController.php:204-224` (update validation)
- **التصميم:** أضِف إلى مسار التحديث ما يبنيه `CreateInvoiceUseCase.php:106-110`: `currency_id`, `exchange_rate`, `cost_center_id`, `payment_method`، وإلى validation: `notes` و`items.*.printed_name`. أضِفها لقائمة `InvoiceModel::update([...])` ولإعادة بناء البنود.
- **التوافق العكسي:** الحقول اختيارية بقيم افتراضية = سلوك اليوم لو لم تُرسَل؛ لا تغيير على مسودات قائمة.
- **التحقق:** `tests/Feature/Sales/InvoiceUpdateParityTest.php`: أنشئ مسودة بعملة/مركز تكلفة، عدّلها، أكّد بقاء القيم بعد التأكيد + قيد متوازن بالعملة الصحيحة.
- **مخاطرة:** متوسطة.

### P2.3 — تذرير تحديث فاتورة الشراء `[#12 🟡]`
- **الملف:** `app/Presentation/Controllers/API/Purchases/PurchaseController.php:83-164`
- **التصميم:** تغليف كامل جسم `update()` بـ `DB::connection('tenant')->transaction(fn() => ...)` (على نمط `InvoiceController::store`) بحيث لا تبقى تعديلات البنود إن فشل `ConfirmPurchaseUseCase`.
- **التحقق:** اختبار: محاكاة فشل التأكيد بعد إعادة كتابة البنود → التحقق من rollback كامل (لا بنود معدّلة، لا حركة مخزون).
- **مخاطرة:** منخفضة.

### P2.4 — إصلاح تقرير قيمة المخزون `[#4 🟠]`
- **الملف:** `app/Application/Reports/Services/ReportingService.php:99,105`
- **التصميم:** استبدال `products.stock_quantity/price` بانضمام إلى `warehouse_products` للكمية واستخدام `cost_price`/`sell_price`. إزالة الـ try/catch الذي يُخفي الخطأ كصفر، أو على الأقل تسجيله بوضوح.
- **التحقق:** اختبار: منتج بكمية معروفة وتكلفة معروفة → التقرير يعيد القيمة الصحيحة (لا صفر).
- **مخاطرة:** منخفضة (تقرير للقراءة فقط، لا يمسّ قيوداً).

> **بوابة Phase 2:** كل اختبارات `Sales|Accounting|Purchases|Inventory` خضراء، وإعادة تدقيق: لا تكرار خصم مخزون، كل قيد متوازن.

---

# Phase 3 — عقد الفرونت ↔ الباك وقابلية الوصول (يوم · M)

> أغلبها تعديل سطر URL واحد في `api.ts` — رخيصة وعالية الأثر. كل واحدة تُختبر بفتح الشاشة فعلياً.

### P3.1 — إصلاح URLs المكسورة في `frontend/src/lib/api.ts`
| البند | السطر | من | إلى |
|---|---|---|---|
| `[#6 🟠]` دليل الحسابات CRUD | `771-774` | `/accounting/chart-of-accounts[...]` | `/accounting/accounts[...]` |
| `[#7 🟠]` إرسال الجرد | `339` | `POST .../stocktakes/{id}/counts` | `PUT .../stocktakes/{id}/items` |
| `[#17 🟡]` معلومات الشركة | `902-903` | `/settings/company` | استخدام `/settings` المجمّع |
| `[#18 🟡]` بدء تسوية بنكية | `754` | `POST /accounting/reconciliations` | `POST /accounting/bank-accounts/{id}/reconciliations` |
| `[#18 🟡]` ألياس العميل GET/DELETE | `438,442` | — | إضافة مساري backend أو إخفاء الأزرار |
- **التحقق:** فتح كل شاشة في `npm run dev` والتأكد من 200 بدل 404 (Network tab).
- **مخاطرة:** منخفضة جداً.

### P3.2 — إضافة زناد «حل مطالبة الضمان» `[#8 🟠]`
- **الملف:** `frontend/src/components/warranty/WarrantyDetailModal.tsx` (+ `api.ts:190-194` موجود)
- **التصميم:** زر «حل/اعتماد» ينادي `salesApi.updateWarrantyClaim(id, {status:'resolved', claim_type})`. الباك إند يولّد فاتورة الاستبدال تلقائياً (`WarrantyController.php:230-273`) ويعيد `replacement_invoice_id`.
- **التحقق:** سيناريو كامل: مطالبة استبدال → حل → التحقق من إنشاء فاتورة استبدال مؤكّدة (خصم مخزون مرة واحدة + قيد متوازن). **بند نواة → اختبار محاسبي إلزامي.**
- **مخاطرة:** متوسطة (يفعّل مساراً محاسبياً كان خامداً).

### P3.3 — ربط الصفحات اليتيمة بالـ Sidebar `[#9 🟠]`
- **الملف:** `frontend/src/components/layout/Sidebar.tsx`
- **التصميم:** إضافة روابط لـ: `sales/commissions`, `accounting/chart-of-accounts`, `accounting/journal-entries`, `accounting/budgets`, `accounting/opening-balances`, `accounting/aging`, `inventory/import-center`, `payables`, `automation`, `crm`, `analytics`. وحذف الصفحات المكررة الميتة (`/subscription` المفرد، `/settings/webhooks`) بعد تأكيد أنها مكرّرة.
- **التحقق:** كل رابط يفتح الصفحة الصحيحة؛ الترجمة ar/en موجودة للعناصر الجديدة.
- **مخاطرة:** منخفضة.

### P3.4 — CRM Pipeline و ZATCA endpoints: قرار «بناء أو إخفاء» `[#13 🟡 + #14 🟡]`
- **CRM Pipeline (`api.ts:558-560`):** لا backend. **القرار: بناء backend كامل** — `CrmPipelineController` + جداول `pipeline_stages`/`deals` (مهاجرات tenant) + مسارات `GET /crm/pipeline/stages`, `POST /crm/pipeline/deals`, `PUT /crm/pipeline/deals/{id}/move` + اختبارات. (L)
- **ZATCA (`api.ts:1123-1127`):** `zatca/settings|sync|onboarding-status|submit-otp` بلا مسارات. التصميم: إضافة المسارات الناقصة في `ZatcaController` (الـ controller موجود ويخدم `onboard`/`status`) — هذه ميزة سعودية مطلوبة للامتثال، يُفضَّل بناؤها لا إخفاؤها.
- **التحقق:** الشاشات تعمل أو تختفي بنظافة (لا أزرار تؤدي 404).

> **بوابة Phase 3:** صفر 404 في تتبّع الشبكة عبر الشاشات الرئيسية؛ كل ميزة إمّا تعمل أو مخفية.

---

# Phase 4 — ميزات UI ناقصة (يوم · M)

### P4.1 — واجهة أقساط مبيعات العملاء `[#15 🟡]`
- **التصميم:** (أ) كشف route للعميل في الباك (`GET/POST /sales/invoices/{id}/installments` على غرار المشتريات) لجدول `invoice_installments` الموجود؛ (ب) `CustomerInstallmentsModal.tsx` على نمط `PurchaseInstallmentsModal.tsx`؛ (ج) wrapper في `api.ts`.
- **التحقق:** إنشاء خطة أقساط لفاتورة عميل، دفع قسط، التحقق من القيد المحاسبي للدفعة (نواة → اختبار إلزامي).
- **مخاطرة:** متوسطة (يلمس مدفوعات/قيود).

### P4.2 — واجهة تخصيص مدفوعات الموردين `[#16 🟡]`
- **التصميم:** المسارات موجودة (`GET/POST /purchases/payments/{id}/allocations`). أضِف wrapper في `api.ts` + شاشة/مودال تخصيص دفعة على فواتير محددة.
- **التحقق:** تخصيص دفعة على فاتورتين، التحقق من تطابق المجاميع.
- **مخاطرة:** منخفضة (المنطق الخلفي جاهز).

> **بوابة Phase 4:** الميزتان تعملان end-to-end مع اختبار محاسبي للدفعات.

---

# Phase 5 — تقوية التشغيل والأمان (نصف يوم · S–M)

### P5.1 — `failed()` للوظيفتين `[#20 🟡]`
- **الملفات:** `SendLateAttendanceNotificationJob.php` · `SendOrderReminderJob.php`
- **التصميم:** إضافة `public function failed(\Throwable $e)` يسجّل/ينبّه (ضمن سياق المستأجر من P1.1). يُنفَّذ مع Phase 1.

### P5.2 — throttle لبوّابة الشركاء `[#22 🟡]`
- **الملف:** `backend/routes/api.php` (مجموعة `/portal/login`, `/portal/magic-link[/verify]`)
- **التصميم:** إضافة `throttle:10,1` (مطابقة لـ `/login`).

### P5.3 — تخزين إيصالات أقساط المشتريات داخل volume الـ uploads `[#10 🟠]`
- **الملف:** `PurchaseController.php:307,319`
- **التصميم:** استبدال `->store('installments/receipts','public')` بنمط `HandlesImageUploads`: `move(public_path('uploads/tenant_{id}/installments'))` وإرجاع `/uploads/...` (المسار الوحيد المثبّت في Docker volume).
- **التحقق:** رفع إيصال، إعادة تشغيل الحاوية، التأكد من بقاء الملف ووصول الرابط.
- **مخاطرة:** منخفضة (يخصّ مرفقات جديدة؛ القديمة — إن وُجدت — تحتاج نقلاً يدوياً، نادر).

### P5.4 — مهاجرة `updated_by` لجداول المركبات `[#19 🟡]`
- **الملفات:** نماذج `VehicleMakeModel/VehicleModelModel/VehicleYearModel`
- **التصميم:** مهاجرة tenant جديدة تضيف `uuid('updated_by')->nullable()` للجداول الثلاثة (أو إزالته من `$fillable` لو غير مستخدَم). تحقّق أولاً هل مسار التحديث يضبطه فعلاً.
- **التحقق:** تحديث make/model/year ينجح بلا خطأ Postgres «column does not exist».

> **بوابة Phase 5:** اختبارات الوظائف خضراء؛ رفع/استمرارية ملف مؤكّدة.

---

# Phase 6 — تنظيف وتلميع (نصف يوم · S) 🔵

| البند | الملف | الإجراء |
|---|---|---|
| `[#23]` كود ميت | `AgingReportController.php:25,109` | حذف الـ controller أو ربطه بمسار مقصود |
| `[#26]` ازدواج كائنات API | `frontend/src/lib/api.ts` | توحيد `approvalsApi/approvalsApiNew`, `deliveriesApiNew`, `subscriptionApi/subscriptionsApiNew` |
| `[#27]` ZATCA serial placeholder | `ZatcaOnboardingService.php:152` | استبدال `XXXXXX` بقيمة من `tenant_settings` |
| `[#24]` `image_url` VARCHAR متبقية | مهاجرة | توسيع أي `image_url` لجداول customer/supplier إلى `text` |
| `[#28]` ازدواج `purchases` vs `purchase_invoices` | tenant migrations | تأكيد `purchase_invoices` القانوني وتوثيق/تنظيف `purchases` إن كان نصف-موصول |
| `[#25]` `Log::info` تشغيلي | `ProductImportExportController.php:96` | إبقاء (مقصود) أو خفض لـ `Log::debug` |
| `[#21 🟡]` تعميم `DataState` | مكوّنات جالبة | تطبيق نمط تحميل/خطأ/فراغ موحّد تدريجياً (يمكن أن يكون مساراً مستمراً) |

> **بوابة Phase 6:** `tsc --noEmit` و`npm run build` و`php artisan test` كلها خضراء؛ لا كود ميت معروف متبقٍّ.

---

## الجدول الزمني والتقدير الإجمالي

| المرحلة | المحتوى | التقدير | الأولوية |
|---|---|---|---|
| Phase 0 | بوابة الاختبارات (#3) | ~0.5 يوم | إلزامي أولاً |
| Phase 1 | أمان المستأجرين (#1) | ~1–1.5 يوم | 🔴 قبل أي نشر |
| Phase 2 | نواة المبيعات/المحاسبة (#2,4,5,11,12) | ~1.5–2 يوم | 🟠 |
| Phase 3 | عقد الفرونت↔الباك (#6,7,8,9,13,14,17,18) | ~1 يوم | 🟠 |
| Phase 4 | ميزات UI ناقصة (#15,16) | ~1 يوم | 🟡 |
| Phase 5 | تقوية تشغيل/أمان (#10,19,20,22) | ~0.5 يوم | 🟡 |
| Phase 6 | تنظيف وتلميع (#21,23,24,25,26,27,28) | ~0.5 يوم | 🔵 |

- **الحد الأدنى للنشر الآمن (Phase 0→2):** ≈ 3.5–4 أيام.
- **جاهزية تسليم كاملة (Phase 0→5):** ≈ 6–7 أيام.
- **مع التلميع (Phase 6):** ≈ 7–7.5 أيام.

---

## قرارات (محسومة)

1. ✅ **CRM Pipeline (#13):** بناء backend كامل (مُدرَج في P3.4 و Phase 3).
2. ✅ **أسلوب العمل:** مرحلة-مرحلة مع وقوف عند كل بوابة تحقق للمراجعة.
3. ⏳ **قرار مفتوح:** الـ4 إخفاقات السابقة في Phase 0 (TenantBackup ×3 + ProductImage ×1) — أصلحها الآن أم أؤجّلها لمرحلة لاحقة؟ (راجع سجل التقدّم أعلاه.)
```
