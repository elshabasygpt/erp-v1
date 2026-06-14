import { getDictionary, type Locale } from '@/i18n/config';

export default async function InventoryPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    const isRTL = params.locale === 'ar';

    const products = [
        { name: 'Samsung TV 55"', nameAr: 'شاشة سامسونج 55', sku: 'TV-SAM-55', barcode: '8801234567890', costPrice: 1200, sellPrice: 1599, stock: 45 },
        { name: 'iPhone 15 Pro', nameAr: 'آيفون 15 برو', sku: 'PH-IPH-15P', barcode: '1901234567890', costPrice: 3500, sellPrice: 4299, stock: 12 },
        { name: 'HP Printer LaserJet', nameAr: 'طابعة اتش بي', sku: 'PR-HP-LJ', barcode: '2401234567890', costPrice: 450, sellPrice: 620, stock: 3 },
        { name: 'Office Chair', nameAr: 'كرسي مكتب', sku: 'FN-CH-OFC', barcode: '3001234567890', costPrice: 300, sellPrice: 450, stock: 28 },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{dict.common.inventory}</h1>
                    <p className="text-surface-200/50 text-sm mt-1">
                        {isRTL ? 'إدارة المنتجات والمخزون' : 'Manage products and stock levels'}
                    </p>
                </div>
                <button className="btn-primary">+ {isRTL ? 'إضافة منتج' : 'Add Product'}</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                    { label: dict.dashboard.totalProducts, value: '3,891', icon: '📦' },
                    { label: isRTL ? 'منتجات نشطة' : 'Active Products', value: '3,654', icon: '✅' },
                    { label: dict.inventory.lowStockAlerts, value: '17', icon: '⚠️' },
                    { label: isRTL ? 'المستودعات' : 'Warehouses', value: '3', icon: '🏭' },
                ].map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-surface-200/50 text-xs uppercase tracking-wider">{s.label}</p>
                                <p className="text-2xl font-bold text-white mt-2">{s.value}</p>
                            </div>
                            <span className="text-2xl">{s.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{isRTL ? 'قائمة المنتجات' : 'Product List'}</h3>
                    <input type="text" placeholder={dict.common.search} className="input-field w-64 py-2 text-sm" />
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{dict.inventory.productName}</th>
                            <th>{dict.inventory.sku}</th>
                            <th>{dict.inventory.barcode}</th>
                            <th>{dict.inventory.costPrice}</th>
                            <th>{dict.inventory.sellPrice}</th>
                            <th>{dict.inventory.stock}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p, i) => (
                            <tr key={i}>
                                <td className="text-white font-medium">{isRTL ? p.nameAr : p.name}</td>
                                <td className="text-surface-200/60 font-mono text-xs">{p.sku}</td>
                                <td className="text-surface-200/60 font-mono text-xs">{p.barcode}</td>
                                <td className="text-surface-200/60">SAR {p.costPrice.toLocaleString()}</td>
                                <td className="text-white">SAR {p.sellPrice.toLocaleString()}</td>
                                <td>
                                    <span className={`badge ${p.stock < 10 ? 'badge-danger' : p.stock < 20 ? 'badge-warning' : 'badge-success'}`}>
                                        {p.stock}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
