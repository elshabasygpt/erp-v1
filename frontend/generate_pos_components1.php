<?php
$dir = __DIR__ . '/src/components/pos';

$PosTabs = <<<EOT
import React, { memo } from 'react';

interface PosTabsProps {
    sessions: any[];
    activeIdx: number;
    setActiveIdx: (idx: number) => void;
    handleCloseTab: (idx: number, e: any) => void;
    handleNewTab: () => void;
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    syncPendingInvoices: () => void;
    toggleFullscreen: () => void;
    isRTL: boolean;
}

const PosTabs = memo(function PosTabs({
    sessions, activeIdx, setActiveIdx, handleCloseTab, handleNewTab,
    isOnline, pendingCount, isSyncing, syncPendingInvoices, toggleFullscreen, isRTL
}: PosTabsProps) {
    return (
        <div className="flex items-center bg-surface-50 dark:bg-surface-900 border-b overflow-x-auto no-scrollbar shadow-sm">
            {sessions.map((sess, idx) => (
                <div 
                    key={sess.id}
                    onClick={() => setActiveIdx(idx)}
                    className={`flex items-center gap-2 px-4 py-3 min-w-[150px] max-w-[200px] border-e cursor-pointer transition-all relative \${activeIdx === idx ? 'bg-white dark:bg-surface-800 border-t-2 border-t-primary-500 font-bold' : 'hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500'}`}
                >
                    <span className="absolute top-1 start-1 text-[8px] opacity-30 font-mono">Alt+{idx+1}</span>
                    <span className="truncate text-xs flex-1 mt-1">
                        {sess.isHeld ? '⏸' : '📄'} {sess.title} 
                        {sess.cart.length > 0 && <span className="ms-2 rounded-full px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px]">{sess.cart.reduce((a:any,c:any)=>a+c.qty,0)}</span>}
                    </span>
                    <button onClick={(e) => handleCloseTab(idx, e)} className="text-surface-400 hover:text-red-500 rounded-full hover:bg-red-50 p-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            ))}
            <button onClick={handleNewTab} title="F1 (New Tab)" className="px-4 py-3 text-surface-500 hover:text-primary-500 hover:bg-primary-50 transition-colors font-bold flex items-center gap-1">
                <span>+</span> <kbd className="hidden md:inline text-[10px] bg-surface-200 rounded px-1 ms-1">F1</kbd>
            </button>
            
            <div className="ms-auto pe-4 flex items-center gap-2">
                {isOnline ? (
                    pendingCount > 0 ? (
                        <button onClick={syncPendingInvoices} disabled={isSyncing} className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-yellow-200 transition-colors">
                            {isSyncing ? '⏳...' : `⚠️ \${isRTL ? 'مزامنة' : 'Sync'} (\${pendingCount})`}
                        </button>
                    ) : (
                        <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Online"></span>
                    )
                ) : (
                    <span className="w-3 h-3 rounded-full bg-red-500" title="Offline"></span>
                )}
                <button onClick={toggleFullscreen} className="p-2 bg-surface-200 rounded-lg hover:bg-surface-300 transition" title={isRTL ? 'شاشة كاملة' : 'Fullscreen'}>
                    🔲
                </button>
            </div>
        </div>
    );
});

export default PosTabs;
EOT;
file_put_contents("$dir/PosTabs.tsx", $PosTabs);

$PosProductGrid = <<<EOT
import React, { memo } from 'react';

interface PosProductGridProps {
    isRTL: boolean;
    successMsg: string;
    filteredProducts: any[];
    activeSession: any;
    addToCart: (product: any) => void;
}

const PosProductGrid = memo(function PosProductGrid({
    isRTL, successMsg, filteredProducts, activeSession, addToCart
}: PosProductGridProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4 bg-surface-100 dark:bg-surface-950">
            {successMsg && (
                <div className="mb-4 p-3 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold text-center animate-slide-up shadow-sm">
                    {successMsg}
                </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => {
                    const inCart = activeSession.cart.find((i: any) => i.product.id === product.id);
                    const outOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0;
                    
                    return (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            disabled={outOfStock}
                            className={`relative flex flex-col items-start p-3 bg-white dark:bg-surface-900 rounded-2xl border text-start transition-all hover:shadow-lg active:scale-95 group \${
                                outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'
                            } \${inCart ? 'border-primary-500 shadow-md ring-1 ring-primary-500' : 'border-surface-200 dark:border-surface-800'}`}
                        >
                            <div className="w-full aspect-video rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-3xl mb-2 overflow-hidden relative">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    product.category === 'phones' ? '📱' : product.category === 'electronics' ? '📺' : '📦'
                                )}
                                {outOfStock && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">{isRTL ? 'نفذت الكمية' : 'Out of Stock'}</span></div>}
                            </div>
                            
                            <h3 className="text-xs font-bold leading-tight mb-1 line-clamp-2 text-surface-800 dark:text-surface-200">
                                {isRTL ? (product.nameAr || product.name) : product.name}
                            </h3>
                            <p className="text-[10px] font-mono text-surface-400 dark:text-surface-500 mb-2">{product.barcode || product.code}</p>
                            
                            <div className="w-full mt-auto flex items-center justify-between border-t border-dashed pt-2">
                                <span className="text-sm font-black text-primary-600 dark:text-primary-400">{parseFloat(product.price).toLocaleString()} <span className="text-[9px]">ر.س</span></span>
                                {product.stock_quantity !== undefined && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold \${product.stock_quantity <= 5 ? 'bg-red-50 text-red-600' : 'bg-surface-100 text-surface-600'}`}>
                                        {product.stock_quantity}
                                    </span>
                                )}
                            </div>

                            {inCart && (
                                <div className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white animate-scale-in z-10">
                                    {inCart.qty}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

export default PosProductGrid;
EOT;
file_put_contents("$dir/PosProductGrid.tsx", $PosProductGrid);
?>
