export const mockData = {
  salesKpis: {
    data: {
      today_sales: 15420.50,
      gross_sales: 1250000.00,
      returns: 3450.00,
      discounts: 1200.00,
    }
  },
  salesCharts: {
    data: {
      sales_trend: [
        { date: '1', total: 4000 },
        { date: '2', total: 3000 },
        { date: '3', total: 2000 },
        { date: '4', total: 2780 },
        { date: '5', total: 1890 },
        { date: '6', total: 2390 },
        { date: '7', total: 3490 },
        { date: '8', total: 5490 },
        { date: '9', total: 4490 },
        { date: '10', total: 6490 },
      ],
      payment_methods: [
        { type: 'Cash', total: 45000 },
        { type: 'Credit Card', total: 85000 },
        { type: 'Bank Transfer', total: 25000 },
        { type: 'Mada', total: 65000 }
      ]
    }
  },
  salesChannels: {
    data: [
      { id: 1, name: 'Main Store', type: 'retail' },
      { id: 2, name: 'Online Shop', type: 'online' },
      { id: 3, name: 'Wholesale Branch', type: 'wholesale' }
    ]
  },
  deliveries: {
    data: [
      {
        id: 'DEL-1001',
        invoice_number: 'INV-2023-001',
        customer_name: 'Ahmed Ali',
        status: 'pending',
        platform: 'own_fleet',
        shipping_cost: 50.00,
        expected_date: '2023-11-20',
        created_at: '2023-11-19T10:00:00Z'
      },
      {
        id: 'DEL-1002',
        invoice_number: 'INV-2023-002',
        customer_name: 'Sara Khan',
        status: 'assigned',
        platform: 'aramex',
        driver_name: 'Mohammed',
        shipping_cost: 35.00,
        expected_date: '2023-11-21',
        created_at: '2023-11-19T11:30:00Z'
      },
      {
        id: 'DEL-1003',
        invoice_number: 'INV-2023-003',
        customer_name: 'Khaled Abdullah',
        status: 'dispatched',
        platform: 'smsa',
        tracking_code: 'SMSA-9988776655',
        shipping_cost: 40.00,
        expected_date: '2023-11-19',
        created_at: '2023-11-18T15:20:00Z'
      },
      {
        id: 'DEL-1004',
        invoice_number: 'INV-2023-004',
        customer_name: 'Fatima Omar',
        status: 'delivered',
        platform: 'own_fleet',
        driver_name: 'Yousef',
        shipping_cost: 50.00,
        expected_date: '2023-11-18',
        created_at: '2023-11-17T09:10:00Z'
      }
    ]
  },
  branches: {
    data: [
      { id: 1, name: 'الفرع الرئيسي - الرياض' },
      { id: 2, name: 'فرع جدة' },
      { id: 3, name: 'فرع الدمام' }
    ]
  },
  warehouses: {
    data: [
      { id: 1, name: 'مستودع الرياض الرئيسي', branch_id: 1 },
      { id: 2, name: 'مستودع جدة المركزي', branch_id: 2 },
      { id: 3, name: 'مستودع الشرقية', branch_id: 3 }
    ]
  },
  products: {
    data: [
      { id: 1, name: 'لابتوب ديل XPS', sku: 'DELL-XPS-13', price: 5500, stock: 15, tax_rate: 15 },
      { id: 2, name: 'شاشة سامسونج 27 بوصة', sku: 'SAM-MON-27', price: 1200, stock: 30, tax_rate: 15 },
      { id: 3, name: 'لوحة مفاتيح ميكانيكية', sku: 'KEY-MECH-01', price: 350, stock: 50, tax_rate: 15 },
      { id: 4, name: 'ماوس لاسلكي لوجيتك', sku: 'LOGI-M-001', price: 150, stock: 120, tax_rate: 15 }
    ]
  },
  customers: {
    data: [
      { id: 1, name: 'شركة التقنية الحديثة', phone: '0501112223' },
      { id: 2, name: 'مؤسسة الأفق للتجارة', phone: '0554445556' },
      { id: 3, name: 'عميل نقدي سريع', phone: '' }
    ]
  },
  users: {
    data: [
      { id: 1, name: 'أحمد المبيعات', role: 'sales' },
      { id: 2, name: 'خالد الكاشير', role: 'sales' }
    ]
  }
};
