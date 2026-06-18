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
