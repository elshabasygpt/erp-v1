import React, { memo } from 'react';

interface BasicPosProductGridProps {
    isRTL: boolean;
    successMsg: string;
    filteredProducts: any[];
    activeSession: any;
    addToCart: (product: any) => void;
    onShowAlternatives: (product: any) => void;
}

const BasicPosProductGrid = memo(function BasicPosProductGrid({
    isRTL, successMsg, filteredProducts, activeSession, addToCart, onShowAlternatives
}: BasicPosProductGridProps) {
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
                            onClick={(e) => {
                                if (outOfStock) {
                                    onShowAlternatives(product);
                                } else {
                                    addToCart(product);
                                }
                            }}
                            className={`relative flex flex-col items-start p-3 bg-white dark:bg-surface-900 rounded-2xl border text-start transition-all hover:shadow-lg active:scale-95 group ${
                                outOfStock ? 'opacity-75 cursor-pointer' : 'cursor-pointer'
                            } ${inCart ? 'border-primary-500 shadow-md ring-1 ring-primary-500' : 'border-surface-200 dark:border-surface-800'}`}
                        >
                            <div className="w-full aspect-video rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-3xl mb-2 overflow-hidden relative">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${outOfStock ? 'grayscale opacity-50' : ''}`} />
                                ) : (
                                    product.category === 'phones' ? '📱' : product.category === 'electronics' ? '📺' : '📦'
                                )}
                                {outOfStock && <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center"><span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">{isRTL ? 'نفذت الكمية - انقر للبدائل' : 'Out of Stock - View Alts'}</span></div>}
                                
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowAlternatives(product);
                                    }}
                                    className="absolute top-2 start-2 w-8 h-8 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors z-10 border border-blue-100 dark:border-blue-800 shadow-sm"
                                    title={isRTL ? "عرض البدائل" : "Show Alternatives"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                </button>
                            </div>
                            
                            <h3 className="text-xs font-bold leading-tight mb-1 line-clamp-2 text-surface-800 dark:text-surface-200">
                                {isRTL ? (product.nameAr || product.name) : product.name}
                            </h3>
                            <p className="text-[10px] font-mono text-surface-400 dark:text-surface-500 mb-2">{product.barcode || product.code}</p>
                            
                            <div className="w-full mt-auto flex items-center justify-between border-t border-dashed pt-2">
                                <span className="text-sm font-black text-primary-600 dark:text-primary-400">{parseFloat(product.price).toLocaleString()} <span className="text-[9px]">ر.س</span></span>
                                {product.stock_quantity !== undefined && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${product.stock_quantity <= 5 ? 'bg-red-50 text-red-600' : 'bg-surface-100 text-surface-600'}`}>
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

export default BasicPosProductGrid;