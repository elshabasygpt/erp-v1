export interface HelpArticle {
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    howItWorks: { ar: string[]; en: string[] };
    integration: { ar: string; en: string };
}

export const helpRegistry: Record<string, HelpArticle> = {
    '/sales/list': {
        title: { ar: 'قائمة المبيعات والفواتير', en: 'Sales & Invoices List' },
        description: {
            ar: 'تتيح لك هذه الصفحة عرض وإدارة جميع فواتير المبيعات الخاصة بعميل أو فرع معين، مع إمكانية تتبع حالة الدفع.',
            en: 'This page allows you to view and manage all sales invoices for a specific customer or branch, tracking their payment status.'
        },
        howItWorks: {
            ar: [
                'يمكنك البحث عن أي فاتورة باستخدام رقم الفاتورة أو اسم العميل.',
                'استخدم الفلاتر لفرز الفواتير حسب الحالة (مسودة، غير مدفوعة، مدفوعة جزئياً، مدفوعة بالكامل).',
                'انقر على أي فاتورة لعرض تفاصيلها أو طباعتها أو إرسالها للعميل.'
            ],
            en: [
                'Search for any invoice using the invoice number or customer name.',
                'Use filters to sort invoices by status (Draft, Unpaid, Partially Paid, Paid).',
                'Click on any invoice to view details, print, or send it to the customer.'
            ]
        },
        integration: {
            ar: 'عند إنشاء فاتورة مبيعات ودفعها، ينعكس ذلك تلقائياً على "المحاسبة" (إنشاء قيد مبيعات) و "المخزون" (خصم الكميات المباعة) و "حسابات العملاء" (تسجيل المديونيات في حالة الدفع الآجل).',
            en: 'When a sales invoice is created and paid, it automatically reflects in "Accounting" (journal entries), "Inventory" (deducting sold items), and "Customers" (recording receivables if credit payment).'
        }
    },
    '/sales/create': {
        title: { ar: 'إنشاء فاتورة مبيعات (POS)', en: 'Create Sales Invoice (POS)' },
        description: {
            ar: 'هذه الشاشة مصممة لنقاط البيع السريعة، تتيح لك اختيار المنتجات، تحديد العميل، وإصدار الفاتورة فوراً.',
            en: 'Designed for quick Point of Sale (POS), this screen lets you select products, assign a customer, and issue the invoice instantly.'
        },
        howItWorks: {
            ar: [
                'قم بالبحث عن المنتج عن طريق الباركود أو الاسم أو الـ SKU وأضفه للفاتورة.',
                'حدد العميل (أو ابقِ على "عميل نقدي" الافتراضي).',
                'اختر طريقة الدفع (كاش، شبكة، آجل) وأتمم عملية الدفع.',
                'سيتم طباعة الفاتورة تلقائياً حسب الإعدادات.'
            ],
            en: [
                'Search for a product by barcode, name, or SKU to add to the invoice.',
                'Select a customer (or keep the default "Walk-in Customer").',
                'Choose the payment method (Cash, Card, Credit) and complete the payment.',
                'The invoice will print automatically based on your settings.'
            ]
        },
        integration: {
            ar: 'الفاتورة المصدرة ستقوم بتحديث المخزون في نفس المستودع، وسيتم إضافتها تلقائياً لإيراداتك اليومية في تقارير المبيعات.',
            en: 'Issued invoices instantly update stock in the selected warehouse and add to your daily revenue in the sales reports.'
        }
    },
    '/purchases/supplier-prices': {
        title: { ar: 'قوائم أسعار الموردين', en: 'Supplier Price Lists' },
        description: {
            ar: 'صفحة ذكية لتسجيل وتتبع أحدث الأسعار التي يقدمها الموردون لقطع الغيار والمنتجات، للمساعدة في اختيار الأرخص والأسرع في التوريد.',
            en: 'A smart page to record and track the latest prices offered by suppliers for auto parts and products, helping you choose the cheapest and fastest.'
        },
        howItWorks: {
            ar: [
                'يمكنك إضافة سعر جديد لمنتج من مورد معين، وتحديد مدة التوريد وتاريخ صلاحية السعر.',
                'استخدم زر "مقارنة" الموجود بجانب كل منتج لمشاهدة جميع الموردين الذين يقدمون نفس القطعة ومن هو الأرخص.',
                'يتم إبراز الأسعار بالألوان لمقارنتها بتكلفة المنتج الحالية بشكل فوري.'
            ],
            en: [
                'Add a new price for a product from a specific supplier, setting the lead time and price validity.',
                'Use the "Compare" button to view all suppliers offering the same part and easily spot the cheapest.',
                'Prices are color-coded to instantly show how they compare to your current product cost.'
            ]
        },
        integration: {
            ar: 'مرتبطة بشكل وثيق مع صفحة "إنشاء فاتورة شراء"، حيث يمكنك هناك مقارنة الأسعار بضغطة زر وتحديث فاتورة الشراء بأفضل عرض متاح في السوق. كما تتحدث الأسعار تلقائياً عند أي عملية شراء جديدة تتم.',
            en: 'Deeply integrated with the "Create Purchase" page, where you can compare prices with a click and update your invoice with the best market offer. Prices also auto-update upon every new purchase.'
        }
    },
    '/purchases/orders': {
        title: { ar: 'أوامر الشراء (PO)', en: 'Purchase Orders' },
        description: {
            ar: 'نظام إدارة طلبات أوامر الشراء الموجهة للموردين قبل استلام البضاعة وتحويلها لفواتير.',
            en: 'Manage Purchase Orders sent to suppliers before receiving goods and converting them to invoices.'
        },
        howItWorks: {
            ar: [
                'قم بإنشاء أمر شراء جديد وضع فيه قائمة المنتجات والكميات التي تود طلبها.',
                'يمكنك إرسال أمر الشراء للمورد للموافقة والتسعير.',
                'بمجرد وصول البضاعة، يمكنك تحويل أمر الشراء إلى "فاتورة شراء نهائية" واستلام المخزون بضغطة زر.'
            ],
            en: [
                'Create a new PO with the list of products and quantities needed.',
                'Send the PO to the supplier for approval and pricing.',
                'Once goods arrive, convert the PO to a "Final Purchase Invoice" and receive stock instantly.'
            ]
        },
        integration: {
            ar: 'تتصل أوامر الشراء بدورة المشتريات (PR -> RFQ -> PO -> Invoice)، ولا تؤثر على "المخزون" الفعلي إلا بعد تحويلها لفاتورة شراء واستلام البضاعة.',
            en: 'Connected to the procurement cycle (PR -> RFQ -> PO -> Invoice). It does not affect actual "Inventory" until converted to a purchase invoice and goods are received.'
        }
    },
    '/purchases': {
        title: { ar: 'فواتير المشتريات', en: 'Purchase Invoices' },
        description: {
            ar: 'الصفحة الرئيسية لإدارة جميع عمليات التموين ودخول المخزون من الموردين.',
            en: 'The main page for managing all restocking and inventory arrivals from suppliers.'
        },
        howItWorks: {
            ar: [
                'أنشئ فاتورة شراء جديدة وضع بها المورد والمستودع الذي سيستلم البضاعة.',
                'أضف المنتجات والكميات والأسعار (استخدم زر مقارنة الأسعار إن احتجت لمعرفة أسعار السوق).',
                'بعد الحفظ وتأكيد الفاتورة، سيتم استلام المخزون.'
            ],
            en: [
                'Create a new purchase invoice, select the supplier and the receiving warehouse.',
                'Add products, quantities, and prices (use price comparison to check market rates).',
                'After saving and confirming, the stock will be received.'
            ]
        },
        integration: {
            ar: 'فواتير الشراء هي المحرك الأول للمخزون (تقوم بزيادة الكميات وتحديث "متوسط التكلفة"). كما أنها تنشئ التزامات (دائنون) في النظام المحاسبي في حال الشراء الآجل.',
            en: 'Purchase invoices are the primary driver of Inventory (increasing quantities and updating "Average Cost"). They also create liabilities (Accounts Payable) in Accounting for credit purchases.'
        }
    },
    '/inventory/movements': {
        title: { ar: 'حركات المخزون', en: 'Stock Movements' },
        description: {
            ar: 'دفتر أستاذ لجميع حركات دخول وخروج المخزون لضمان الدقة والشفافية في الحسابات.',
            en: 'A ledger of all stock-in and stock-out movements to ensure accuracy and transparency in your inventory.'
        },
        howItWorks: {
            ar: [
                'يمكنك استعراض كل حركة (شراء، بيع، تحويل، جرد، أو تسوية) تمت على أي منتج.',
                'يعرض الجدول الكمية السابقة، الكمية المحركة، والكمية النهائية بدقة.',
                'يمكنك فلترة الحركات لمستودع معين أو منتج معين لسهولة التتبع.'
            ],
            en: [
                'View every movement (purchase, sale, transfer, stocktake, adjustment) for any product.',
                'The table accurately displays the previous, moved, and final quantities.',
                'Filter movements by a specific warehouse or product for easy tracking.'
            ]
        },
        integration: {
            ar: 'هذه الصفحة عبارة عن انعكاس فوري (Log) لكل ما يحدث في "المبيعات" و"المشتريات" و"التصنيع". أي عملية تؤثر على المستودع يتم توثيقها هنا مع رقم الفاتورة كمرجع.',
            en: 'This page is a real-time reflection (Log) of everything happening in "Sales", "Purchases", and "Manufacturing". Any action affecting stock is documented here with a reference invoice number.'
        }
    },
    '/reports/zakat': {
        title: { ar: 'حساب زكاة المال', en: 'Zakat Al-Mal Calculator' },
        description: {
            ar: 'أداة ذكية مصممة خصيصاً للمؤسسات والشركات لحساب الزكاة الشرعية المستحقة بناءً على صافي الأصول والسيولة والمديونيات في نهاية الحول المالي.',
            en: 'A smart tool specifically designed for businesses to calculate the obligatory Zakat based on net assets, liquidity, and debts at the end of the fiscal year.'
        },
        howItWorks: {
            ar: [
                'قم بتحديد تاريخ بداية الحول ونهايته.',
                'سيعمل النظام فوراً على سحب جميع الأرصدة (النقدية في الخزائن والبنوك، قيمة المخزون التجاري، أموال الديون الجيدة المستحقة للشركة).',
                'يطرح منها النظام الالتزامات المستحقة (مثل الديون التي على الشركة ومصروفات التشغيل).',
                'يظهر لك الوعاء الزكوي وقيمة الزكاة المستحقة بنسبة 2.5%.'
            ],
            en: [
                'Set the start and end dates of your fiscal year (Hawl).',
                'The system instantly fetches all balances (cash in hand/banks, commercial inventory value, and good debts owed to the company).',
                'It then deducts current liabilities (like debts owed by the company and operating expenses).',
                'It presents the Zakat Base and the Zakat due at 2.5%.'
            ]
        },
        integration: {
            ar: 'يعتمد هذا التقرير كلياً على "المحاسبة المالية" المتكاملة للنظام؛ فهو يقرأ أرصدة جميع مراكز التكلفة، المخزون الحي، وحسابات العملاء والموردين بشكل دقيق جداً (Real-time).',
            en: 'This report relies completely on the integrated "Financial Accounting"; it precisely reads all cost center balances, live inventory, and live AP/AR accounts in real-time.'
        }
    },
    '/inventory/vehicles': {
        title: { ar: 'توافق توافق السيارات', en: 'Vehicle Compatibility' },
        description: {
            ar: 'نظام متقدم مصمم خصيصاً لمراكز قطع الغيار وصيانات السيارات لربط أي منتج بالموديلات المتوافقة معه.',
            en: 'An advanced system designed specifically for auto parts and service centers to link any product with its compatible vehicle makes and models.'
        },
        howItWorks: {
            ar: [
                'يمكنك إنشاء (شركات السيارات - موديلات - سنوات الإصدار).',
                'اربط أي منتج (قطعة غيار) بسنة أو عدة سنوات معينة لسيارة لضمان الدقة.',
                'في صفحة البيع أو المشتريات، يمكنك البحث عن القطع المتوافقة مع سيارة العميل بدلاً من البحث برقم القطعة.'
            ],
            en: [
                'Create and manage (Makes - Models - Years).',
                'Link any product (spare part) to specific vehicle years to ensure accuracy.',
                'In sales or purchasing, search for parts compatible with a customer\'s vehicle instead of just searching by part number.'
            ]
        },
        integration: {
            ar: 'يترابط بشكل أساسي مع "العملاء وسياراتهم" حيث أن البحث السريع يعتمد على سيارة العميل المسجلة مسبقاً، ويساعد النظام في فلترة القطع المناسبة لسيارته حصراً.',
            en: 'Directly integrates with "Customer Vehicles" where quick searches rely on the customer\'s registered car, enabling the system to filter and show only the appropriate parts.'
        }
    },
    '/accounting': {
        title: { ar: 'المحاسبة', en: 'Accounting' },
        description: {
            ar: 'القلب المالي للنظام: شجرة الحسابات، القيود اليومية، ميزان المراجعة، والتقارير المالية الأساسية.',
            en: 'The financial core of the system: chart of accounts, journal entries, trial balance, and core financial reports.'
        },
        howItWorks: {
            ar: [
                'دليل الحسابات شجري متعدد المستويات يمكنك تعديله أو إضافة حسابات فرعية له.',
                'أغلب القيود تتولد تلقائياً من المبيعات والمشتريات والمرتبات، لكنك تقدر تضيف قيد يدوي من "القيود اليومية".',
                'استخدم "الربط المحاسبي" في الإعدادات لتحديد الحسابات الافتراضية (الصندوق، البنك، الإيرادات...) التي تُستخدم في القيود الآلية.'
            ],
            en: [
                'The Chart of Accounts is a multi-level tree you can edit or extend with sub-accounts.',
                'Most journal entries are generated automatically from sales, purchases, and payroll — you can also add a manual entry from "Journal Entries".',
                'Use "Account Mappings" in Settings to set the default accounts (cash, bank, revenue...) used by automatic postings.'
            ]
        },
        integration: {
            ar: 'كل عملية بيع أو شراء أو دفعة أو إهلاك أصل تنتهي بقيد محاسبي هنا. أي خطأ في الربط المحاسبي يؤثر على دقة كل التقارير المالية.',
            en: 'Every sale, purchase, payment, or asset depreciation ends with a journal entry here. A misconfigured account mapping affects the accuracy of every financial report.'
        }
    },
    '/analytics': {
        title: { ar: 'التحليلات المتقدمة', en: 'Advanced Analytics' },
        description: {
            ar: 'لوحة تحليلية تجمع أرقام المبيعات والمخزون والربحية في رسوم بيانية لمساعدتك على اتخاذ قرارات أسرع.',
            en: 'An analytical dashboard that aggregates sales, inventory, and profitability numbers into charts to help you decide faster.'
        },
        howItWorks: {
            ar: [
                'اختر الفترة الزمنية التي تريد تحليلها من أعلى الصفحة.',
                'تابع مؤشرات الأداء الرئيسية (KPIs) ومقارنتها بالفترة السابقة.',
                'استخدم الرسوم البيانية لتحديد المنتجات أو الفروع الأعلى أداءً.'
            ],
            en: [
                'Pick the time period you want to analyze from the top of the page.',
                'Track key performance indicators (KPIs) and compare them to the previous period.',
                'Use the charts to spot your best-performing products or branches.'
            ]
        },
        integration: {
            ar: 'البيانات هنا قراءة فقط، مصدرها مباشرة من المبيعات والمخزون والمحاسبة — أي تأخير في تسجيل فاتورة أو دفعة سينعكس على التحليلات.',
            en: 'This is a read-only view sourced directly from Sales, Inventory, and Accounting — delays in recording an invoice or payment will show up here too.'
        }
    },
    '/approvals': {
        title: { ar: 'الموافقات', en: 'Approvals' },
        description: {
            ar: 'صندوق موحّد لكل الطلبات التي تحتاج موافقة مديرك (مرتجعات، تحويلات مخزون، طلبات شراء كبيرة...) قبل تنفيذها.',
            en: 'A unified inbox for any request that needs manager approval (returns, stock transfers, large purchase requests...) before it takes effect.'
        },
        howItWorks: {
            ar: [
                'تصلك الطلبات هنا تلقائياً عند تجاوزها لحد معين أو نوع عملية محدد في إعدادات سير العمل.',
                'افتح الطلب لمراجعة تفاصيله الكاملة قبل اتخاذ القرار.',
                'اعتمد أو رفض الطلب — وسيتم تنفيذه أو إلغاؤه فوراً حسب قرارك.'
            ],
            en: [
                'Requests land here automatically when they exceed a configured threshold or match a workflow rule.',
                'Open the request to review its full details before deciding.',
                'Approve or reject it — the underlying action executes or is cancelled immediately based on your decision.'
            ]
        },
        integration: {
            ar: 'مرتبط بسير العمل (Workflows) في كل الموديولات: لحد ما الطلب يتعتمد هنا، العملية الأصلية (مرتجع، تحويل، فاتورة...) تفضل معلقة.',
            en: 'Tied into the Workflows engine across modules: the originating action (a return, transfer, invoice...) stays pending until approved here.'
        }
    },
    '/automation': {
        title: { ar: 'الأتمتة (Workflows)', en: 'Automation (Workflows)' },
        description: {
            ar: 'صفحة لتعريف قواعد آلية تنفّذ إجراءات معينة تلقائياً عند حدوث شرط معين (مثال: تنبيه عند نفاد المخزون).',
            en: 'Define rules that automatically trigger an action when a condition is met (e.g. alert when stock runs low).'
        },
        howItWorks: {
            ar: [
                'أنشئ قاعدة جديدة وحدد الحدث المشغّل لها (مثل: انخفاض كمية منتج عن الحد الأدنى).',
                'حدد الإجراء الذي يحدث تلقائياً (إشعار، إنشاء أمر شراء، تحويل الطلب لموافقة).',
                'فعّل أو عطّل القاعدة في أي وقت بدون حذفها.'
            ],
            en: [
                'Create a new rule and pick the triggering event (e.g. a product quantity falling below its reorder point).',
                'Choose the automatic action that follows (a notification, a draft purchase order, routing to approvals).',
                'Enable or disable a rule anytime without deleting it.'
            ]
        },
        integration: {
            ar: 'القواعد هنا تتحكم بسلوك موديولات أخرى (المخزون، الموافقات، المشتريات)، فتعطيل قاعدة معينة يوقف الأتمتة المرتبطة بها فوراً في كل النظام.',
            en: 'These rules drive behavior in other modules (Inventory, Approvals, Purchases) — disabling a rule immediately stops the automation tied to it system-wide.'
        }
    },
    '/branches': {
        title: { ar: 'الفروع', en: 'Branches' },
        description: {
            ar: 'إدارة فروع شركتك المختلفة، كل فرع له مخزونه ومبيعاته وتقاريره المستقلة.',
            en: 'Manage your company\'s different branches — each branch has its own stock, sales, and reports.'
        },
        howItWorks: {
            ar: [
                'أضف فرعاً جديداً وحدد بياناته (الاسم، العنوان، المسؤول عنه).',
                'اربط المستخدمين والمستودعات بالفرع المناسب لهم.',
                'بدّل بين الفروع من الإعدادات لمراجعة أداء كل فرع بشكل منفصل.'
            ],
            en: [
                'Add a new branch and set its details (name, address, manager).',
                'Assign users and warehouses to the branch they belong to.',
                'Switch between branches to review each branch\'s performance separately.'
            ]
        },
        integration: {
            ar: 'الفرع هو البعد الأساسي لتصفية البيانات في المبيعات والمخزون والتقارير — أي مستخدم أو مستودع غير مرتبط بفرع صحيح ستظهر بياناته في غير مكانها.',
            en: 'Branch is the primary filter dimension across Sales, Inventory, and Reports — a user or warehouse linked to the wrong branch will show data in the wrong place.'
        }
    },
    '/crm': {
        title: { ar: 'إدارة علاقات العملاء (CRM)', en: 'Customer Relationship Management (CRM)' },
        description: {
            ar: 'تتبع تفاعلاتك مع العملاء (مكالمات، زيارات، متابعات بيعية) بعيداً عن الفواتير، لبناء علاقة تجارية أقوى.',
            en: 'Track your interactions with customers (calls, visits, sales follow-ups) outside of invoices, to build stronger relationships.'
        },
        howItWorks: {
            ar: [
                'سجّل أي تفاعل مع عميل (مكالمة، اجتماع، شكوى) في "تفاعلات العملاء".',
                'استخدم "متابعات المبيعات" لتذكير نفسك بمتابعة عميل محتمل في تاريخ معين.',
                'راجع لوحة CRM لمعرفة العملاء الذين يحتاجون متابعة عاجلة.'
            ],
            en: [
                'Log any customer interaction (call, meeting, complaint) under "Customer Interactions".',
                'Use "Sales Follow-ups" to remind yourself to check back with a lead on a specific date.',
                'Check the CRM dashboard to see which customers need urgent follow-up.'
            ]
        },
        integration: {
            ar: 'مرتبط بسجل العميل نفسه في "العملاء" وحسابه في "حسابات العملاء" — فأي ملاحظة هنا تظهر بجانب بياناته المالية لإعطائك صورة كاملة عنه.',
            en: 'Linked to the same customer record in "Customers" and their "Receivables" account — notes here appear alongside their financial data for a complete picture.'
        }
    },
    '/customers': {
        title: { ar: 'العملاء', en: 'Customers' },
        description: {
            ar: 'قاعدة بيانات عملائك: بياناتهم، حدود الائتمان المسموح بها، وتاريخ تعاملهم معك.',
            en: 'Your customer database: their details, allowed credit limits, and transaction history with you.'
        },
        howItWorks: {
            ar: [
                'أضف عميلاً جديداً وحدد له حد ائتمان (سقف البيع الآجل المسموح به).',
                'افتح ملف العميل لمشاهدة كل فواتيره ومدفوعاته وكشف حسابه في مكان واحد.',
                'استورد قائمة عملاء جاهزة عبر Excel لو كنت بتنقل بياناتك من نظام آخر.'
            ],
            en: [
                'Add a new customer and set a credit limit (the maximum allowed credit sales).',
                'Open a customer\'s profile to see all their invoices, payments, and statement in one place.',
                'Import a ready customer list via Excel if migrating data from another system.'
            ]
        },
        integration: {
            ar: 'كل فاتورة مبيعات ترتبط بعميل من هنا، وتجاوز حد الائتمان يتم رصده فوراً عند محاولة إنشاء فاتورة آجلة جديدة له.',
            en: 'Every sales invoice links to a customer from here, and exceeding their credit limit is flagged immediately when creating a new credit invoice.'
        }
    },
    '/deliveries': {
        title: { ar: 'التوصيل والشحن', en: 'Deliveries' },
        description: {
            ar: 'تتبع عمليات توصيل الطلبات للعملاء، من تجهيز الشحنة وحتى تأكيد الاستلام.',
            en: 'Track order deliveries to customers, from preparing the shipment to confirming receipt.'
        },
        howItWorks: {
            ar: [
                'بعد تأكيد فاتورة بيع تحتاج توصيل، يتم إنشاء سجل توصيل مرتبط بها.',
                'حدد السائق أو شركة الشحن ومتابعة حالة الشحنة (قيد التجهيز، في الطريق، تم التسليم).',
                'يمكن للسائق أو العميل تأكيد الاستلام لإغلاق عملية التوصيل.'
            ],
            en: [
                'Once a sales invoice needing delivery is confirmed, a linked delivery record is created.',
                'Assign a driver or shipping company and track status (preparing, in transit, delivered).',
                'The driver or customer can confirm receipt to close out the delivery.'
            ]
        },
        integration: {
            ar: 'مرتبطة بفاتورة المبيعات الأصلية — حالة التوصيل لا تغيّر المخزون أو المحاسبة، فهي طبقة تتبع لوجستي فوق الفاتورة المؤكدة بالفعل.',
            en: 'Linked to the originating sales invoice — delivery status doesn\'t affect inventory or accounting, it\'s a logistics tracking layer on top of an already-confirmed invoice.'
        }
    },
    '/expenses': {
        title: { ar: 'المصروفات', en: 'Expenses' },
        description: {
            ar: 'تسجيل المصروفات التشغيلية اليومية (إيجار، كهرباء، رواتب نقدية متفرقة...) بسرعة وربطها بالخزينة المناسبة.',
            en: 'Quickly record daily operating expenses (rent, utilities, petty cash...) and link them to the right cash safe.'
        },
        howItWorks: {
            ar: [
                'اختر نوع المصروف والخزينة أو الحساب البنكي الذي سيُدفع منه.',
                'أدخل المبلغ والوصف، وأرفق إيصال إن وُجد.',
                'بمجرد الحفظ يُخصم المبلغ فوراً من رصيد الخزينة ويُسجل قيد محاسبي.'
            ],
            en: [
                'Choose the expense category and which safe or bank account it\'s paid from.',
                'Enter the amount and description, attaching a receipt if available.',
                'Once saved, the amount is deducted from the safe balance immediately and a journal entry is posted.'
            ]
        },
        integration: {
            ar: 'مرتبطة مباشرة بـ "الخزينة" (تخصم الرصيد) و"المحاسبة" (تسجل مصروف في قائمة الدخل).',
            en: 'Directly tied to "Treasury" (deducts the balance) and "Accounting" (records an expense on the income statement).'
        }
    },
    '/hr': {
        title: { ar: 'الموارد البشرية والرواتب', en: 'HR & Payroll' },
        description: {
            ar: 'إدارة بيانات الموظفين، الحضور والانصراف، الإجازات، وتشغيل الرواتب الشهرية.',
            en: 'Manage employee records, attendance, leaves, and run monthly payroll.'
        },
        howItWorks: {
            ar: [
                'سجّل بيانات كل موظف (الراتب الأساسي، البدلات، تاريخ التعيين) في "الموظفين".',
                'تابع الحضور والانصراف والإجازات شهرياً — تُحتسب الجزاءات والاستقطاعات تلقائياً.',
                'في نهاية الشهر، شغّل "الرواتب" ليحسب النظام صافي راتب كل موظف بعد كل الإضافات والاستقطاعات.'
            ],
            en: [
                'Record each employee\'s details (base salary, allowances, hire date) under "Employees".',
                'Track attendance and leaves monthly — penalties and deductions are calculated automatically.',
                'At month-end, run "Payroll" so the system computes each employee\'s net pay after all additions and deductions.'
            ]
        },
        integration: {
            ar: 'تشغيل الرواتب ينشئ مصروف رواتب في "المحاسبة" تلقائياً، وأي سلفة موظف تُخصم من راتبه القادم آلياً.',
            en: 'Running payroll automatically posts a salary expense in "Accounting", and any employee loan is auto-deducted from their next payroll.'
        }
    },
    '/manufacturing': {
        title: { ar: 'التصنيع والتجميع (BOM)', en: 'Manufacturing & Assembly (BOM)' },
        description: {
            ar: 'لو منتجك يُصنّع أو يُجمّع من قطع/خامات أخرى، هذه الصفحة تتيح لك تعريف "قائمة المكونات" وتنفيذ عمليات التجميع.',
            en: 'If your product is manufactured or assembled from other parts/materials, this page lets you define a "Bill of Materials" and run assembly operations.'
        },
        howItWorks: {
            ar: [
                'عرّف المنتج النهائي وحدد مكوناته (المنتجات الخام) والكمية المطلوبة من كل واحد.',
                'عند تنفيذ عملية تجميع، يخصم النظام كميات المكونات من المخزون.',
                'تتم إضافة المنتج النهائي المُجمّع إلى مخزون "المنتجات الجاهزة" تلقائياً.'
            ],
            en: [
                'Define the finished product and its components (raw products) with the quantity needed of each.',
                'When you run an assembly, the system deducts component quantities from stock.',
                'The finished assembled product is automatically added to "Finished Goods" inventory.'
            ]
        },
        integration: {
            ar: 'كل عملية تجميع هي حركة مخزون مزدوجة (خصم خام + إضافة جاهز) وتنشئ قيد محاسبي لتحويل قيمة الخامات لقيمة المنتج النهائي.',
            en: 'Every assembly run is a dual inventory movement (deduct raw, add finished) and posts a journal entry converting raw material value into finished product value.'
        }
    },
    '/partnerships': {
        title: { ar: 'الشراكات وتوزيع الأرباح', en: 'Partnerships & Profit Distribution' },
        description: {
            ar: 'لو شركتك بين أكثر من شريك، هنا تحدد نسبة كل شريك وتوزّع صافي الربح عليهم بشكل دوري.',
            en: 'If your company has multiple partners, this is where you set each partner\'s share and distribute net profit periodically.'
        },
        howItWorks: {
            ar: [
                'أضف كل شريك ونسبة حصته في الشركة.',
                'في نهاية الفترة (شهر/ربع سنة)، شغّل "توزيع الأرباح" ليحسب النظام حصة كل شريك من صافي الربح.',
                'تابع كشف حساب كل شريك لمعرفة المستحق له والمسحوبات السابقة.'
            ],
            en: [
                'Add each partner and their ownership percentage.',
                'At period end (monthly/quarterly), run "Profit Distribution" so the system calculates each partner\'s share of net profit.',
                'Review each partner\'s statement to see what\'s owed and prior withdrawals.'
            ]
        },
        integration: {
            ar: 'صافي الربح المُوزّع يُسحب من قائمة الدخل في "المحاسبة"، وأي توزيع يُسجل كقيد تحويل من الأرباح المحتجزة لحساب كل شريك.',
            en: 'The distributed net profit comes from the "Accounting" income statement, and each distribution posts a transfer entry from retained earnings to each partner\'s account.'
        }
    },
    '/payables': {
        title: { ar: 'حسابات الموردين (الدائنون)', en: 'Payables (Accounts Payable)' },
        description: {
            ar: 'متابعة كل المبالغ المستحقة عليك للموردين، وجدولة سداد المتأخرات حسب أولوية الاستحقاق.',
            en: 'Track everything you owe your suppliers, and schedule payments by due date priority.'
        },
        howItWorks: {
            ar: [
                'يظهر هنا كل مورد ولديه فواتير شراء آجلة لم تُسدد بالكامل.',
                'استخدم تقرير "أعمار الديون" لمعرفة المتأخرات الأقدم التي تحتاج سداد عاجل.',
                'سجّل دفعة جديدة للمورد لتقليل المديونية المستحقة عليه.'
            ],
            en: [
                'Every supplier with unpaid (or partially paid) credit purchase invoices appears here.',
                'Use the "Aging Report" to see the oldest overdue amounts that need urgent payment.',
                'Record a new payment to a supplier to reduce the outstanding balance.'
            ]
        },
        integration: {
            ar: 'الرصيد هنا يأتي مباشرة من فواتير الشراء الآجلة في "المشتريات"، وأي دفعة تُسجَّل هنا تُخصم فوراً من حساب الخزينة وتُحدّث القيد المحاسبي.',
            en: 'Balances come directly from credit purchase invoices in "Purchases", and any payment recorded here is immediately deducted from the treasury and updates the journal entry.'
        }
    },
    '/pos': {
        title: { ar: 'نقطة البيع (POS)', en: 'Point of Sale (POS)' },
        description: {
            ar: 'شاشة بيع سريعة للكاشير: بحث بالباركود، حساب الضريبة تلقائياً، وإصدار الفاتورة في ثوانٍ.',
            en: 'A fast checkout screen for cashiers: barcode search, automatic VAT calculation, and instant invoicing.'
        },
        howItWorks: {
            ar: [
                'افتح "شيفت" (جلسة عمل) في بداية يومك بمبلغ النقدية الافتتاحي.',
                'ابحث عن المنتجات بالباركود أو الاسم وأضفها للفاتورة، ثم أكمل الدفع (نقدي/شبكة/متعدد).',
                'في نهاية الشيفت، أغلقه وطابق النقدية الفعلية مع المتوقع في النظام.'
            ],
            en: [
                'Open a "Shift" at the start of your day with the opening cash float.',
                'Search products by barcode or name, add them to the invoice, then complete payment (cash/card/split).',
                'At the end of the shift, close it and reconcile actual cash against the system\'s expected total.'
            ]
        },
        integration: {
            ar: 'تعمل حتى لو انقطع الإنترنت (وضع أوفلاين) وتتم مزامنة الفواتير تلقائياً عند رجوع الاتصال. كل فاتورة تخصم من المخزون وتُسجل في المحاسبة فوراً.',
            en: 'Works even if the internet drops (offline mode), syncing invoices automatically once connectivity returns. Every invoice deducts stock and posts to accounting immediately.'
        }
    },
    '/quotations': {
        title: { ar: 'عروض الأسعار', en: 'Quotations' },
        description: {
            ar: 'إصدار عروض سعر للعملاء المحتملين قبل تحويلها لفاتورة بيع فعلية.',
            en: 'Issue price quotes to prospective customers before converting them into an actual sales invoice.'
        },
        howItWorks: {
            ar: [
                'أنشئ عرض سعر بالمنتجات والأسعار والشروط، وحدد له تاريخ صلاحية.',
                'أرسله للعميل للموافقة عليه.',
                'بمجرد موافقة العميل، حوّل عرض السعر إلى فاتورة بيع بنقرة واحدة بدون إعادة إدخال البيانات.'
            ],
            en: [
                'Create a quotation with products, prices, and terms, and set an expiry date.',
                'Send it to the customer for approval.',
                'Once the customer agrees, convert the quotation into a sales invoice with one click — no re-entry needed.'
            ]
        },
        integration: {
            ar: 'عرض السعر لا يؤثر على المخزون أو المحاسبة إطلاقاً — الأثر الفعلي يبدأ فقط بعد تحويله لفاتورة مبيعات مؤكدة.',
            en: 'A quotation has zero effect on inventory or accounting — real impact only begins once it\'s converted into a confirmed sales invoice.'
        }
    },
    '/receivables': {
        title: { ar: 'حسابات العملاء (المدينون)', en: 'Receivables (Accounts Receivable)' },
        description: {
            ar: 'متابعة كل المبالغ المستحقة لك من العملاء، وتحديد المتأخرين عن السداد.',
            en: 'Track everything customers owe you, and identify who\'s overdue.'
        },
        howItWorks: {
            ar: [
                'يظهر هنا كل عميل لديه فواتير آجلة لم تُسدد بالكامل.',
                'استخدم تقرير "أعمار الديون" لترتيب العملاء حسب أقدم مديونية.',
                'سجّل دفعة محصّلة من العميل لتقليل رصيد مديونيته.'
            ],
            en: [
                'Every customer with unpaid (or partially paid) credit invoices appears here.',
                'Use the "Aging Report" to rank customers by their oldest outstanding debt.',
                'Record a collected payment from a customer to reduce their outstanding balance.'
            ]
        },
        integration: {
            ar: 'الرصيد هنا مصدره فواتير المبيعات الآجلة، وأي دفعة تسجلها هنا تنعكس فوراً على رصيد العميل في "العملاء" وعلى الخزينة.',
            en: 'Balances originate from credit sales invoices; any payment recorded here instantly reflects on the customer\'s balance in "Customers" and on the treasury.'
        }
    },
    '/reports': {
        title: { ar: 'التقارير', en: 'Reports' },
        description: {
            ar: 'مجموعة التقارير المالية والتشغيلية الجاهزة (قائمة الدخل، الميزانية، ضريبة القيمة المضافة، الزكاة...).',
            en: 'A library of ready-made financial and operational reports (income statement, balance sheet, VAT, Zakat...).'
        },
        howItWorks: {
            ar: [
                'اختر التقرير المطلوب وحدد الفترة الزمنية.',
                'راجع الأرقام مباشرة على الشاشة أو صدّرها لطباعتها أو حفظها.',
                'بعض التقارير (مثل الزكاة وضريبة القيمة المضافة) تتيح لك ترحيل القيد المحاسبي المرتبط بها مباشرة.'
            ],
            en: [
                'Pick the report you need and set the time period.',
                'Review the numbers on screen or export them for printing or saving.',
                'Some reports (like Zakat and VAT) let you post the related journal entry directly from the report.'
            ]
        },
        integration: {
            ar: 'كل التقارير هنا قراءة مباشرة (Real-time) من المحاسبة والمبيعات والمخزون — لا تُعدّل بيانات، فقط تعرضها بصورة مفهومة.',
            en: 'All reports here read live from Accounting, Sales, and Inventory — they don\'t modify data, only present it in a usable form.'
        }
    },
    '/returns': {
        title: { ar: 'مرتجعات المبيعات', en: 'Sales Returns' },
        description: {
            ar: 'تسجيل إرجاع منتجات من عميل بعد عملية بيع سابقة، مع إعادة الكمية للمخزون وتسوية المبلغ المالي.',
            en: 'Record a customer returning products after a previous sale, restocking the quantity and settling the financial amount.'
        },
        howItWorks: {
            ar: [
                'اختر الفاتورة الأصلية والمنتجات والكميات المرتجعة.',
                'حدد طريقة التسوية: استرداد نقدي، أو خصم من رصيد العميل، أو قسيمة شراء.',
                'بعد التأكيد، تُضاف الكمية مرة أخرى للمخزون تلقائياً.'
            ],
            en: [
                'Select the original invoice along with the returned products and quantities.',
                'Choose the settlement method: cash refund, credit to the customer\'s balance, or a voucher.',
                'Once confirmed, the quantity is automatically added back to inventory.'
            ]
        },
        integration: {
            ar: 'يعكس قيد فاتورة البيع الأصلية جزئياً: يقلل الإيراد والمخزون المخصوم، ويُسوّى المبلغ في "المحاسبة" و"حسابات العملاء".',
            en: 'Partially reverses the original sale\'s journal entry: reduces revenue and the deducted COGS, and settles the amount in "Accounting" and "Receivables".'
        }
    },
    '/sales': {
        title: { ar: 'المبيعات', en: 'Sales' },
        description: {
            ar: 'الصفحة الرئيسية لكل عمليات البيع: الفواتير، نقاط البيع، عروض الأسعار، والمرتجعات.',
            en: 'The home for everything related to selling: invoices, point of sale, quotations, and returns.'
        },
        howItWorks: {
            ar: [
                'أنشئ فاتورة بيع جديدة (نقدية أو آجلة) واختر العميل والمنتجات.',
                'تابع حالة كل فاتورة (مسودة، مؤكدة، مدفوعة) من القائمة.',
                'استخدم التقارير المرتبطة لمعرفة أداء المبيعات اليومي والشهري.'
            ],
            en: [
                'Create a new sales invoice (cash or credit) and choose the customer and products.',
                'Track each invoice\'s status (draft, confirmed, paid) from the list.',
                'Use the linked reports to track daily and monthly sales performance.'
            ]
        },
        integration: {
            ar: 'كل فاتورة مؤكدة تخصم من المخزون، تنشئ قيد محاسبي، وتحدّث رصيد العميل إذا كانت آجلة.',
            en: 'Every confirmed invoice deducts inventory, posts a journal entry, and updates the customer balance if sold on credit.'
        }
    },
    '/inventory': {
        title: { ar: 'المخزون', en: 'Inventory' },
        description: {
            ar: 'إدارة منتجاتك ومستودعاتك: الكميات، التحويلات بين المستودعات، الجرد، وتوافق قطع الغيار مع السيارات.',
            en: 'Manage your products and warehouses: quantities, inter-warehouse transfers, stocktaking, and parts-to-vehicle compatibility.'
        },
        howItWorks: {
            ar: [
                'أضف منتجاً جديداً بالباركود والـ SKU وحدد وحداته (قطعة/كرتون...).',
                'تابع الكمية المتاحة في كل مستودع، وحوّل كميات بين المستودعات عند الحاجة.',
                'استخدم "الجرد" بشكل دوري للتأكد من تطابق الكميات الفعلية مع النظام.'
            ],
            en: [
                'Add a new product with its barcode and SKU, and define its units (piece/carton...).',
                'Track available quantity per warehouse, and transfer quantities between warehouses as needed.',
                'Run periodic "Stocktakes" to confirm physical quantities match the system.'
            ]
        },
        integration: {
            ar: 'كل بيع أو شراء أو تجميع يحرك الكمية هنا تلقائياً، وأي تعديل جرد ينشئ قيد تسوية في "المحاسبة".',
            en: 'Every sale, purchase, or assembly moves quantities here automatically, and any stocktake adjustment posts a settlement entry in "Accounting".'
        }
    },
    '/settings': {
        title: { ar: 'الإعدادات', en: 'Settings' },
        description: {
            ar: 'كل إعدادات النظام في مكان واحد: بيانات الشركة، الربط المحاسبي، الفواتير، ZATCA، والنسخ الاحتياطي.',
            en: 'All system configuration in one place: company info, account mappings, invoicing, ZATCA, and backups.'
        },
        howItWorks: {
            ar: [
                'حدّث بيانات شركتك الأساسية (الاسم، الشعار، بيانات التواصل) من القسم العلوي.',
                'اضبط "الربط المحاسبي" قبل تشغيل المبيعات والمشتريات لضمان توجيه القيود بشكل صحيح.',
                'راجع قسم "النسخ الاحتياطي" بشكل دوري للتأكد إن بياناتك محفوظة.'
            ],
            en: [
                'Update your core company details (name, logo, contact info) from the top section.',
                'Configure "Account Mappings" before running sales and purchases to ensure entries post correctly.',
                'Check the "Backups" section regularly to confirm your data is being protected.'
            ]
        },
        integration: {
            ar: 'الإعدادات هنا تؤثر على سلوك كل موديول آخر — تغيير خاطئ في الربط المحاسبي مثلاً يكسر القيود الآلية في المبيعات والمشتريات فوراً.',
            en: 'Settings here affect the behavior of every other module — a wrong account mapping, for example, immediately breaks automatic postings in Sales and Purchases.'
        }
    },
    '/shipping': {
        title: { ar: 'شركات الشحن', en: 'Shipping' },
        description: {
            ar: 'إدارة شركات وطرق الشحن المستخدمة لتوصيل طلبات عملائك.',
            en: 'Manage the shipping companies and methods used to deliver customer orders.'
        },
        howItWorks: {
            ar: [
                'أضف شركة شحن جديدة وحدد تكلفتها وطرقها المتاحة.',
                'اربط طريقة الشحن المناسبة بفاتورة البيع عند الحاجة للتوصيل.',
                'تابع حالة الشحنات من صفحة "التوصيل".'
            ],
            en: [
                'Add a new shipping company and define its cost and available methods.',
                'Link the right shipping method to a sales invoice when delivery is needed.',
                'Track shipment status from the "Deliveries" page.'
            ]
        },
        integration: {
            ar: 'مرتبطة بصفحة "التوصيل" — أي طريقة شحن تُعرّف هنا تظهر كاختيار متاح عند إنشاء عملية توصيل لفاتورة بيع.',
            en: 'Linked to the "Deliveries" page — any shipping method defined here becomes a selectable option when creating a delivery for a sales invoice.'
        }
    },
    '/subscription': {
        title: { ar: 'الاشتراك والباقة', en: 'Subscription & Plan' },
        description: {
            ar: 'متابعة باقة اشتراكك الحالية في النظام، حدودها، وتاريخ التجديد.',
            en: 'Track your current subscription plan, its limits, and renewal date.'
        },
        howItWorks: {
            ar: [
                'راجع تفاصيل باقتك الحالية (عدد المستخدمين، المساحة، الميزات المفعّلة).',
                'تابع تاريخ انتهاء الاشتراك أو الفترة التجريبية.',
                'قم بترقية باقتك أو تجديد الاشتراك من هذه الصفحة.'
            ],
            en: [
                'Review your current plan\'s details (user limit, storage, enabled features).',
                'Track your subscription or trial expiry date.',
                'Upgrade your plan or renew your subscription from this page.'
            ]
        },
        integration: {
            ar: 'لو انتهى اشتراكك أو فترتك التجريبية، يتم تقييد الوصول للنظام تلقائياً لحد ما يتم التجديد من هنا.',
            en: 'If your subscription or trial expires, system access is automatically restricted until renewed from here.'
        }
    },
    '/suppliers': {
        title: { ar: 'الموردون', en: 'Suppliers' },
        description: {
            ar: 'قاعدة بيانات الموردين الذين تتعامل معهم: بياناتهم، شروط الدفع، وتاريخ التعامل.',
            en: 'Your supplier database: their details, payment terms, and transaction history.'
        },
        howItWorks: {
            ar: [
                'أضف مورداً جديداً وحدد بياناته وشروط الدفع المتفق عليها.',
                'افتح ملف المورد لمراجعة كل فواتير الشراء والمدفوعات له.',
                'راجع "قوائم أسعار الموردين" لمعرفة آخر الأسعار التي قدمها هذا المورد.'
            ],
            en: [
                'Add a new supplier with their details and agreed payment terms.',
                'Open a supplier\'s profile to review all purchase invoices and payments made to them.',
                'Check "Supplier Price Lists" to see the latest prices this supplier has offered.'
            ]
        },
        integration: {
            ar: 'كل فاتورة شراء ترتبط بمورد من هنا، وأي مديونية له تظهر تلقائياً في "حسابات الموردين".',
            en: 'Every purchase invoice links to a supplier from here, and any amount owed to them automatically appears in "Payables".'
        }
    },
    '/tasks': {
        title: { ar: 'المهام', en: 'Tasks' },
        description: {
            ar: 'قائمة مهام بسيطة لتنظيم العمل اليومي لفريقك وتوزيع المسؤوليات.',
            en: 'A simple task list to organize your team\'s daily work and assign responsibilities.'
        },
        howItWorks: {
            ar: [
                'أنشئ مهمة جديدة وحدد المسؤول عنها وتاريخ التسليم.',
                'تابع حالة المهمة (قيد الانتظار، جارية، منتهية) من القائمة.',
                'استخدم الفلاتر لمعرفة مهامك الخاصة أو مهام فريقك.'
            ],
            en: [
                'Create a new task, assign an owner, and set a due date.',
                'Track task status (pending, in progress, done) from the list.',
                'Use filters to see your own tasks or your team\'s.'
            ]
        },
        integration: {
            ar: 'صفحة مستقلة لتنظيم العمل، ولا تؤثر مباشرة على المخزون أو المحاسبة — مفيدة لربط متابعات يدوية بعمليات في موديولات أخرى.',
            en: 'A standalone page for organizing work — it doesn\'t directly affect inventory or accounting, but is useful for linking manual follow-ups to actions in other modules.'
        }
    },
    '/treasury': {
        title: { ar: 'الخزينة', en: 'Treasury' },
        description: {
            ar: 'إدارة الصناديق النقدية والحسابات البنكية: الإيداعات، السحوبات، والتحويل بينها.',
            en: 'Manage your cash safes and bank accounts: deposits, withdrawals, and transfers between them.'
        },
        howItWorks: {
            ar: [
                'أنشئ صندوقاً نقدياً أو حساباً بنكياً جديداً بالرصيد الافتتاحي.',
                'سجّل أي إيداع أو سحب يدوي، أو حوّل مبلغاً بين صندوقين.',
                'راجع رصيد كل خزينة بشكل لحظي في أي وقت.'
            ],
            en: [
                'Create a new cash safe or bank account with its opening balance.',
                'Record a manual deposit or withdrawal, or transfer an amount between two safes.',
                'Review each safe\'s balance in real time at any moment.'
            ]
        },
        integration: {
            ar: 'كل دفعة من عميل أو لمورد أو مصروف تؤثر على رصيد الخزينة هنا تلقائياً، وكل حركة تنشئ قيد محاسبي مطابق.',
            en: 'Every payment from a customer, to a supplier, or an expense automatically affects a safe\'s balance here, with a matching journal entry posted for each movement.'
        }
    },
    '/users': {
        title: { ar: 'المستخدمون والصلاحيات', en: 'Users & Permissions' },
        description: {
            ar: 'إدارة حسابات المستخدمين في النظام وتحديد صلاحيات كل واحد منهم حسب دوره (مدير، محاسب، كاشير...).',
            en: 'Manage system user accounts and set each one\'s permissions based on their role (admin, accountant, cashier...).'
        },
        howItWorks: {
            ar: [
                'أضف مستخدماً جديداً وحدد بريده الإلكتروني وكلمة المرور المؤقتة.',
                'اربطه بدور (Role) جاهز أو أنشئ دوراً جديداً بصلاحيات مخصصة.',
                'عطّل حساب أي موظف ترك العمل بدلاً من حذفه، لتبقى سجلاته محفوظة.'
            ],
            en: [
                'Add a new user and set their email and a temporary password.',
                'Assign them an existing Role or create a new one with custom permissions.',
                'Deactivate an account when an employee leaves instead of deleting it, to keep their records intact.'
            ]
        },
        integration: {
            ar: 'الصلاحيات هنا تتحكم في كل ما يستطيع المستخدم رؤيته أو تعديله في باقي النظام — أي تغيير في دور المستخدم ينعكس فوراً على وصوله لكل الصفحات.',
            en: 'Permissions here control everything a user can see or edit across the system — changing a user\'s role immediately affects their access to every other page.'
        }
    },
    '/webhooks': {
        title: { ar: 'الويب هوكس (Webhooks)', en: 'Webhooks' },
        description: {
            ar: 'إرسال إشعارات تلقائية لأنظمة خارجية (مثل موقعك أو تطبيق آخر) عند حدوث عملية معينة في النظام.',
            en: 'Automatically notify external systems (like your website or another app) when a specific event happens in the system.'
        },
        howItWorks: {
            ar: [
                'أضف نقطة استقبال (Endpoint URL) خاصة بالنظام الخارجي الذي تريد إشعاره.',
                'حدد الأحداث التي تريد إرسال إشعار عندها (مثل: تأكيد فاتورة بيع).',
                'راجع سجل الإشعارات المرسلة وحالتها (نجحت أو فشلت) للتأكد من وصولها.'
            ],
            en: [
                'Add an endpoint URL for the external system you want to notify.',
                'Choose which events should trigger a notification (e.g. a sales invoice being confirmed).',
                'Review the delivery log to confirm whether each notification succeeded or failed.'
            ]
        },
        integration: {
            ar: 'يستمع لأحداث حقيقية من موديولات أخرى (المبيعات، المشتريات، الرواتب) ويعيد بثها فوراً لأي نظام خارجي مسجل هنا.',
            en: 'It listens to real events from other modules (Sales, Purchases, Payroll) and re-broadcasts them instantly to any external system registered here.'
        }
    },
    '/zatca': {
        title: { ar: 'الفاتورة الإلكترونية (ZATCA)', en: 'E-Invoicing (ZATCA)' },
        description: {
            ar: 'إعداد وربط النظام بمنظومة الفاتورة الإلكترونية السعودية لضمان توافق فواتيرك مع متطلبات هيئة الزكاة والضريبة.',
            en: 'Configure and connect the system to Saudi e-invoicing so your invoices comply with ZATCA requirements.'
        },
        howItWorks: {
            ar: [
                'أكمل عملية "الربط" (Onboarding) مع منصة فاتورة باستخدام رمز التفعيل (OTP) الذي تحصل عليه من ZATCA.',
                'بعد الربط، كل فاتورة مبيعات تحصل تلقائياً على رمز QR متوافق مع المرحلة الأولى.',
                'تابع حالة إرسال الفواتير لمنصة فاتورة (المرحلة الثانية) من سجل الحالة.'
            ],
            en: [
                'Complete the "Onboarding" process with the Fatoora platform using the OTP you receive from ZATCA.',
                'Once onboarded, every sales invoice automatically gets a Phase 1 compliant QR code.',
                'Track invoice submission status to the Fatoora platform (Phase 2) from the status log.'
            ]
        },
        integration: {
            ar: 'مرتبطة مباشرة بكل فاتورة مبيعات مؤكدة — أي فشل في الإرسال هنا قد يعرّضك لعدم الامتثال الضريبي، فمن المهم مراجعته بشكل دوري.',
            en: 'Directly tied to every confirmed sales invoice — a submission failure here can mean tax non-compliance, so it\'s important to review it regularly.'
        }
    },
    // Default fallback
    'default': {
        title: { ar: 'مرحباً بك في نظام التخطيط (ERP)', en: 'Welcome to ERP System' },
        description: {
            ar: 'أنت الآن في إحدى شاشات النظام الذكي. كل شاشة صُممت لتيسير جزء من أعمال مؤسستك.',
            en: 'You are now in one of the smart system screens. Each screen is designed to streamline a part of your business operations.'
        },
        howItWorks: {
            ar: [
                'استكشف الأزرار العلوية للبحث والإضافة.',
                'استخدم الفلاتر المتواجدة في الجداول للوصول السريع للبيانات.',
                'إذا واجهت أي صعوبة، فريق الدعم الفني متواجد لمساعدتك دائماً.'
            ],
            en: [
                'Explore the top buttons for search and add actions.',
                'Use table filters for quick data access.',
                'If you face any difficulty, our support team is always here to help.'
            ]
        },
        integration: {
            ar: 'تذكر دائماً أن نظامنا مترابط! ما تقوم به هنا قد يعكس بيانات مالية في قسم المحاسبة أو المخزون بصورة آلية وفورية.',
            en: 'Always remember our system is interconnected! What you do here may reflect instantly in Accounting or Inventory modules automatically.'
        }
    }
};

export function getHelpForPath(pathname: string): HelpArticle {
    // Exact match first
    if (helpRegistry[pathname]) return helpRegistry[pathname];
    
    // Prefix match for nested pages (e.g., /sales/123-edit)
    const matchedKey = Object.keys(helpRegistry).find(key => key !== 'default' && pathname.includes(key));
    if (matchedKey) return helpRegistry[matchedKey];

    return helpRegistry['default'];
}
