'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { crmApi, inventoryApi } from '@/lib/api';
import { format } from 'date-fns';

export interface InvoiceFormState {
  customer_id: string;
  branch_id: string;
  warehouse_id: string;
  sales_channel_id: string;
  invoice_date: string;
  due_date: string;
  type: string;
  status: string;
  notes: string;
  internal_notes: string;
  reference_no: string;
  paid_amount: number;
  credit_limit_override: boolean;
  installments: any[];
  cost_center_id: string;
  currency_id: string;
  exchange_rate: number;
}

interface InvoiceContextProps {
  isRTL: boolean;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  form: InvoiceFormState;
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormState>>;
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  customers: any[];
  products: any[];
  branches: any[];
  warehouses: any[];
  salesChannels: any[];
  employees: any[];
  costCenters: any[];
  currencies: any[];
  
  subtotal: number;
  discountTotal: number;
  netSubtotal: number;
  taxTotal: number;
  grandTotal: number;
  dueAmount: number;

  addItem: (product: any) => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: string, value: number) => void;
  handleSubmit: (status: string) => Promise<void>;
  
  showPrintPreview: boolean;
  savedInvoiceData: any;
  handlePrintConfirm: () => void;
  handlePrintSkip: () => void;
  
  calculateAdjustedPrice: (basePrice: number, channelId: string, vatRate?: number) => number;
}

const InvoiceFormContext = createContext<InvoiceContextProps | undefined>(undefined);

export function InvoiceFormProvider({ children }: { children: ReactNode }) {
  const isRTL = true;
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [salesChannels, setSalesChannels] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const [form, setForm] = useState<InvoiceFormState>({
    customer_id: '',
    branch_id: '',
    warehouse_id: '',
    sales_channel_id: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    type: 'cash',
    status: 'draft',
    notes: '',
    internal_notes: '',
    reference_no: '',
    paid_amount: 0,
    credit_limit_override: false,
    installments: [],
    cost_center_id: '',
    currency_id: '',
    exchange_rate: 1,
  });

  const [items, setItems] = useState<any[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [savedInvoiceData, setSavedInvoiceData] = useState<any>(null);

  useEffect(() => {
    const extractArray = (res: any) => {
        const data = res.data?.data?.data || res.data?.data || res.data || [];
        return Array.isArray(data) ? data : [];
    };
    inventoryApi.getProducts().then(res => setProducts(extractArray(res))).catch(() => setProducts([]));
    inventoryApi.getBranches().then(res => setBranches(extractArray(res))).catch(() => setBranches([]));
    inventoryApi.getWarehouses().then(res => setWarehouses(extractArray(res))).catch(() => setWarehouses([]));
    crmApi.getCustomers().then(res => setCustomers(extractArray(res))).catch(() => setCustomers([]));
    api.get('/users?role=sales').then(res => setEmployees(extractArray(res))).catch(() => setEmployees([]));
    api.get('/sales/channels?active_only=1').then(res => setSalesChannels(extractArray(res))).catch(() => setSalesChannels([]));
    api.get('/accounting/cost-centers').then(res => setCostCenters(extractArray(res))).catch(() => setCostCenters([]));
    api.get('/accounting/currencies').then(res => setCurrencies(extractArray(res))).catch(() => setCurrencies([]));
  }, []);

  const calculateAdjustedPrice = (basePrice: number, channelId: string, vatRate: number = 15) => {
    if (!channelId) return basePrice;
    const channel = salesChannels.find(c => c.id === channelId);
    if (!channel) return basePrice;
    
    if (channel.pricing_method === 'percentage') {
      return basePrice * (1 + (channel.markup_percentage / 100));
    } else {
      if (channel.apply_before_tax) {
        return basePrice + channel.fixed_markup;
      } else {
        return basePrice + (channel.fixed_markup / (1 + (vatRate / 100)));
      }
    }
  };

  useEffect(() => {
    if (items.length > 0) {
      setItems(prevItems => prevItems.map(item => ({
        ...item,
        unit_price: calculateAdjustedPrice(item.base_unit_price || item.unit_price, form.sales_channel_id, item.vat_rate)
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sales_channel_id, salesChannels]);

  const addItem = (product: any) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        product_id: product.id,
        name: isRTL ? (product.name_ar || product.name) : product.name,
        code: product.sku || product.barcode || '',
        quantity: 1,
        base_unit_price: product.sell_price || 0,
        unit_price: calculateAdjustedPrice(product.sell_price || 0, form.sales_channel_id, product.vat_rate || 15),
        discount_percent: 0,
        vat_rate: product.vat_rate || 15,
        stock: product.warehouseStocks ? (product.warehouseStocks.reduce((a:any, b:any) => a + Number(b.quantity), 0)) : 0,
      }]);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountTotal = items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.discount_percent / 100)), 0);
  const netSubtotal = subtotal - discountTotal;
  const taxTotal = items.reduce((sum, item) => {
    const net = (item.quantity * item.unit_price) * (1 - (item.discount_percent / 100));
    return sum + (net * (item.vat_rate / 100));
  }, 0);
  const grandTotal = netSubtotal + taxTotal;
  const dueAmount = grandTotal - form.paid_amount;

  const handleSubmit = async (status: string) => {
    if (items.length === 0) return alert(isRTL ? 'الرجاء إضافة منتج واحد على الأقل' : 'Please add at least one item');
    if (!form.warehouse_id) return alert(isRTL ? 'الرجاء اختيار المستودع' : 'Please select a warehouse');
    if (form.type === 'credit' && !form.customer_id) return alert(isRTL ? 'مطلوب اختيار العميل في الفاتورة الآجلة' : 'Customer is required for credit invoice');
    
    // Check stock
    const outOfStock = items.find(i => i.quantity > i.stock);
    if (outOfStock) return alert(isRTL ? `الكمية المطلوبة من ${outOfStock.name} أكبر من المخزون المتوفر (${outOfStock.stock})` : `Quantity for ${outOfStock.name} exceeds available stock (${outOfStock.stock})`);
    
    setLoading(true);
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id || undefined,
        cost_center_id: form.cost_center_id || undefined,
        currency_id: form.currency_id || undefined,
        exchange_rate: form.exchange_rate,
        paid_amount: form.type === 'cash' ? grandTotal : form.paid_amount,
        status,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: Math.round(i.unit_price * 100) / 100,
          base_unit_price: Math.round((i.base_unit_price || i.unit_price) * 100) / 100,
          adjusted_unit_price: Math.round(i.unit_price * 100) / 100,
          adjustment_amount: Math.round((i.unit_price - (i.base_unit_price || i.unit_price)) * 100) / 100,
          discount_percent: Math.round(i.discount_percent * 100) / 100,
          vat_rate: Math.round(i.vat_rate * 100) / 100,
        }))
      };
      
      const res = await api.post('/sales/invoices', payload);
      
      if (status === 'confirmed') {
          setSavedInvoiceData({ ...payload, id: res.data.data?.id, total: grandTotal, subtotal, vat_amount: taxTotal, invoice_number: 'NEW' });
          setShowPrintPreview(true);
      } else {
          alert(isRTL ? 'تم حفظ المسودة بنجاح!' : 'Draft saved successfully!');
          window.location.href = '/dashboard/sales/list';
      }
    } catch (error: any) {
      alert(error.response?.data?.message || (isRTL ? 'خطأ في حفظ الفاتورة' : 'Error saving invoice'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintConfirm = () => {
      window.print();
      setTimeout(() => {
          window.location.href = '/dashboard/sales/list';
      }, 1000);
  };

  const handlePrintSkip = () => {
      window.location.href = '/dashboard/sales/list';
  };

  return (
    <InvoiceFormContext.Provider value={{
      isRTL, loading, setLoading, form, setForm, items, setItems,
      customers, products, branches, warehouses, salesChannels, employees,
      costCenters, currencies,
      subtotal, discountTotal, netSubtotal, taxTotal, grandTotal, dueAmount,
      addItem, removeItem, updateItem, handleSubmit,
      showPrintPreview, savedInvoiceData, handlePrintConfirm, handlePrintSkip,
      calculateAdjustedPrice
    }}>
      {children}
    </InvoiceFormContext.Provider>
  );
}

export function useInvoiceForm() {
  const context = useContext(InvoiceFormContext);
  if (context === undefined) {
    throw new Error('useInvoiceForm must be used within an InvoiceFormProvider');
  }
  return context;
}
