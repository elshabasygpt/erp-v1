'use client';

import { useDeliveryDashboard } from './hooks/useDeliveryDashboard';

interface DeliveryDashboardProps {
    dict: any;
    locale: string;
}

export default function DeliveryDashboard({ dict, locale }: DeliveryDashboardProps) {
    const isRTL = locale === 'ar';
    const s = dict.sales;
    const common = dict.common;

    const {
        platforms, loading, filterStatus, setFilterStatus, search, setSearch,
        showAssignModal, setShowAssignModal, assigning,
        selectedDriver, setSelectedDriver, selectedPlatform, setSelectedPlatform, eta, setEta, trackingCode, setTrackingCode, deliveryFee, setDeliveryFee,
        showStatusModal, setShowStatusModal, newStatus, setNewStatus, statusNotes, setStatusNotes, updatingStatus,
        filteredDeliveries, handleAssign, handleUpdateStatus, openAssignModal, openStatusModal
    } = useDeliveryDashboard(isRTL);

    const getStatusColor = (st: string) => {
        switch (st) {
            case 'pending': return 'border-orange-500/30 text-orange-400 bg-orange-500/10';
            case 'assigned': return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
            case 'dispatched': return 'border-purple-500/30 text-purple-400 bg-purple-500/10';
            case 'out_for_delivery': return 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10';
            case 'delivered': return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
            case 'failed': case 'returned': return 'border-red-500/30 text-red-400 bg-red-500/10';
            default: return 'border-surface-600/30 text-surface-400 bg-surface-600/10';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إدارة التوصيل والمقادير' : 'Delivery Management'}
                    </h1>
                    <p className="text-surface-400 text-sm mt-1">
                        {isRTL ? 'لوحة تحكم وتتبع الشحنات والتوصيل' : 'Delivery tracking and dispatch board'}
                    </p>
                </div>
            </div>

            <div className="flex gap-4">
                <input 
                    type="text" 
                    className="input-field flex-1 max-w-md" 
                    placeholder={isRTL ? 'بحث برقم التوصيل أو العميل...' : 'Search delivery # or customer...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select className="select-field w-48" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">{common.all}</option>
                    <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                    <option value="assigned">{isRTL ? 'مُعين' : 'Assigned'}</option>
                    <option value="dispatched">{isRTL ? 'تم الإرسال' : 'Dispatched'}</option>
                    <option value="out_for_delivery">{isRTL ? 'في الطريق' : 'Out for Delivery'}</option>
                    <option value="delivered">{isRTL ? 'تم التوصيل' : 'Delivered'}</option>
                    <option value="failed">{isRTL ? 'فشل' : 'Failed'}</option>
                </select>
            </div>

            {loading ? (
                <div className="py-20 text-center text-surface-400">{common.loading}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredDeliveries.map(d => (
                        <div key={d.id} className="card p-5 space-y-4 hover:border-indigo-500/30 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{d.delivery_number}</h3>
                                    <p className="text-xs text-surface-400 font-mono mt-1 uppercase tracking-widest">{d.order_type.replace('_', ' ')}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(d.status)}`}>
                                    {d.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm border-t border-white/5 pt-4">
                                <div className="flex justify-between">
                                    <span className="text-surface-400">{isRTL ? 'العميل:' : 'Customer:'}</span>
                                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.customer?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-surface-400">{isRTL ? 'المندوب:' : 'Driver:'}</span>
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.driver?.name || d.deliveryPlatform?.name || '---'}</span>
                                </div>
                                {d.eta && (
                                    <div className="flex justify-between">
                                        <span className="text-surface-400">{isRTL ? 'وقت الوصول:' : 'ETA:'}</span>
                                        <span className="font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>{new Date(d.eta).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                <button onClick={() => openAssignModal(d)} className="btn-secondary flex-1 py-2 text-xs">
                                    {isRTL ? 'تعيين' : 'Assign'}
                                </button>
                                <button onClick={() => openStatusModal(d)} className="btn-primary flex-1 py-2 text-xs">
                                    {isRTL ? 'تحديث الحالة' : 'Update Status'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredDeliveries.length === 0 && (
                        <div className="col-span-full py-20 text-center text-surface-400">
                            {common.noData}
                        </div>
                    )}
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAssignModal(null)}>
                    <div className="modal-content max-w-md p-6 space-y-6">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'تعيين سائق أو منصة' : 'Assign Driver/Platform'}
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{isRTL ? 'منصة التوصيل' : 'Delivery Platform'}</label>
                                <select className="select-field w-full" value={selectedPlatform} onChange={e => { setSelectedPlatform(e.target.value); setSelectedDriver(''); }}>
                                    <option value="">{common.select}</option>
                                    {platforms.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Assume driver selection comes here if employees api is hooked up */}

                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{isRTL ? 'رقم التتبع' : 'Tracking Code'}</label>
                                <input type="text" className="input-field w-full" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{isRTL ? 'وقت الوصول المتوقع' : 'ETA'}</label>
                                <input type="date" className="input-field w-full" value={eta} onChange={e => setEta(e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{isRTL ? 'رسوم التوصيل' : 'Delivery Fee'}</label>
                                <input type="number" className="input-field w-full" value={deliveryFee} onChange={e => setDeliveryFee(+e.target.value)} />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleAssign} disabled={assigning} className="btn-primary flex-1 py-3">
                                {assigning ? common.loading : common.save}
                            </button>
                            <button onClick={() => setShowAssignModal(null)} className="btn-secondary py-3 px-6">
                                {common.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Modal */}
            {showStatusModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowStatusModal(null)}>
                    <div className="modal-content max-w-md p-6 space-y-6">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'تحديث الحالة' : 'Update Status'}
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{isRTL ? 'الحالة الجديدة' : 'New Status'}</label>
                                <select className="select-field w-full" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                                    <option value="pending">Pending</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="dispatched">Dispatched</option>
                                    <option value="out_for_delivery">Out for Delivery</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="failed">Failed</option>
                                    <option value="returned">Returned</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-surface-400 mb-1">{common.notes}</label>
                                <textarea className="input-field w-full" rows={3} value={statusNotes} onChange={e => setStatusNotes(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleUpdateStatus} disabled={updatingStatus} className="btn-primary flex-1 py-3">
                                {updatingStatus ? common.loading : common.save}
                            </button>
                            <button onClick={() => setShowStatusModal(null)} className="btn-secondary py-3 px-6">
                                {common.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
