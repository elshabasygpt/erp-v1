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
                    className={`flex items-center gap-2 px-4 py-3 min-w-[150px] max-w-[200px] border-e cursor-pointer transition-all relative ${activeIdx === idx ? 'bg-white dark:bg-surface-800 border-t-2 border-t-primary-500 font-bold' : 'hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500'}`}
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
                            {isSyncing ? '⏳...' : `⚠️ ${isRTL ? 'مزامنة' : 'Sync'} (${pendingCount})`}
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