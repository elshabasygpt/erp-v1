import React from 'react';
import clsx from 'clsx';
import { Package, Plus } from 'lucide-react';

interface PosProductGridProps {
    pagedProducts: any[];
    cartQtyMap: Record<string, number>;
    addToCart: (product: any) => void;
    activePriceLevel: string;
    isRTL: boolean;
}

function getProductPrice(product: any, level: string): number {
    const retail = parseFloat(product.sell_price || product.price || 0);
    if (level === 'wholesale') return parseFloat(product.wholesale_price || '') || retail * 0.80;
    if (level === 'half_wholesale') return parseFloat(product.half_wholesale_price || '') || retail * 0.90;
    return retail;
}

export function PosProductGrid({ pagedProducts, cartQtyMap, addToCart, activePriceLevel, isRTL }: PosProductGridProps) {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 dark:bg-transparent">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {pagedProducts.map(p => {
                    const q = cartQtyMap[p.id] || 0;
                    return (
                        <div key={p.id} onClick={() => addToCart(p)} className={clsx('group bg-white dark:bg-[#151522] rounded-[28px] overflow-hidden cursor-pointer border transition-all duration-300 active:scale-95 shadow-sm hover:shadow-2xl flex flex-col', q > 0 ? 'border-blue-500 ring-2 ring-blue-500 shadow-blue-500/20' : 'border-slate-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-white/20')}>
                            <div className="aspect-[4/3] bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center relative overflow-hidden border-b border-slate-100 dark:border-white/5">
                                {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/> : <Package className="w-12 h-12 text-slate-300 dark:text-white/10 transition-transform duration-700 group-hover:scale-110"/>}
                                {q > 0 && <div className="absolute top-3 right-3 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black shadow-lg shadow-blue-600/40 border-2 border-white dark:border-[#151522]">{q}</div>}
                                <div className="absolute inset-0 bg-blue-600/90 dark:bg-blue-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                                    <Plus className="w-10 h-10 text-white stroke-[3] scale-50 group-hover:scale-100 transition-transform duration-300 shadow-2xl" />
                                </div>
                            </div>
                            <div className="p-4 flex flex-col justify-between flex-1">
                                <h3 className="text-[12px] font-black text-slate-800 dark:text-white line-clamp-2 uppercase leading-snug mb-3 tracking-wide">{isRTL ? (p.name_ar||p.name) : p.name}</h3>
                                <div className="flex items-end justify-between mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none tracking-tight">{getProductPrice(p, activePriceLevel).toFixed(2)}</span>
                                        <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mt-1">SAR</span>
                                    </div>
                                    {p.quantity !== undefined && p.quantity < 5 && <span className="px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[9px] font-black rounded-lg uppercase tracking-widest border border-red-200 dark:border-red-500/30">Low</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {pagedProducts.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-40 dark:opacity-20 text-slate-500 dark:text-white"><Package className="w-20 h-20 mb-6 stroke-[1]"/><p className="text-xl font-black uppercase tracking-[0.2em]">{isRTL ? 'لا توجد منتجات' : 'No Products'}</p></div>}
        </div>
    );
}
