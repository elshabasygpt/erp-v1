import React, { memo } from 'react';

interface SalesHeaderProps {
    isRTL: boolean;
    dict: any;
    showExportMenu: boolean;
    setShowExportMenu: (v: boolean) => void;
    exportMenuRef: React.RefObject<HTMLDivElement>;
    handleExportPDF: () => void;
    handleExportDetailedPDF: () => void;
    handleExportCSV: () => void;
    setShowModal: (v: boolean) => void;
}

const SalesHeader = memo(function SalesHeader({
    isRTL, dict, showExportMenu, setShowExportMenu, exportMenuRef,
    handleExportPDF, handleExportDetailedPDF, handleExportCSV, setShowModal
}: SalesHeaderProps) {
    const s = dict.sales;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'إدارة المبيعات والإنتاجية' : 'Sales & Productivity Hub'}
                </h1>
                <p className="text-surface-400 mt-1 flex items-center gap-2">
                    {isRTL ? 'متابعة أداء الموظفين والأرباح المحققة' : 'Track employee performance and real-time profits'}
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Managerial Mode</span>
                </p>
            </div>
            <div className="flex items-center gap-3 relative" ref={exportMenuRef}>
                <div className="relative">
                    <button 
                        onClick={() => setShowExportMenu(!showExportMenu)} 
                        className="btn-secondary px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-colors"
                    >
                        📥 {isRTL ? 'تصدير التقارير' : 'Export Reports'}
                        <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {showExportMenu && (
                        <div className="absolute top-full end-0 mt-2 w-64 bg-surface-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-scale-in origin-top-right">
                            <button onClick={handleExportPDF} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors border-b border-white/5">
                                <span className="text-red-400 text-lg">📄</span>
                                {isRTL ? 'تصدير PDF (ملخص)' : 'Export PDF (Summary)'}
                            </button>
                            <button onClick={handleExportDetailedPDF} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors border-b border-white/5">
                                <span className="text-primary-400 text-lg">📈</span>
                                {isRTL ? 'التقرير الإداري (الأرباح)' : 'Managerial Report (Profits)'}
                            </button>
                            <button onClick={handleExportCSV} className="w-full px-4 py-3 text-start text-sm hover:bg-primary-500/10 flex items-center gap-2 transition-colors">
                                <span className="text-green-400 text-lg">📊</span>
                                {isRTL ? 'تصدير Excel/CSV' : 'Export to CSV'}
                            </button>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary-500/20">
                    <span className="text-xl">+</span> {s.createInvoice}
                </button>
            </div>
        </div>
    );
});

export default SalesHeader;