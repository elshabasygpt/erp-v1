"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { crmApi } from '@/lib/api';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function CRMPipelinePage() {
    const { isRTL } = useLanguage();
    const { format: formatCurrency } = useCurrencyFormatter();
    const [stages, setStages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [totalValue, setTotalValue] = useState(0);

    // New Deal Modal State
    const [showModal, setShowModal] = useState(false);
    const [newDealTitle, setNewDealTitle] = useState('');
    const [newDealValue, setNewDealValue] = useState('');

    useEffect(() => {
        loadPipeline();
    }, []);

    const loadPipeline = async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const res = await crmApi.getStagesWithDeals();
            const data = res.data?.data || res.data || [];
            setStages(data);

            // Calculate Total Pipeline Value
            let total = 0;
            data.forEach((stage: any) => {
                stage.deals?.forEach((deal: any) => {
                    total += parseFloat(deal.expected_value || 0);
                });
            });
            setTotalValue(total);
        } catch (err) {
            setLoadError(true);
            toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load pipeline');
        } finally {
            setLoading(false);
        }
    };


    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        // Optimistic UI Update
        const newStages = [...stages];
        const sourceStageIndex = newStages.findIndex(s => s.id === source.droppableId);
        const destStageIndex = newStages.findIndex(s => s.id === destination.droppableId);

        const sourceStage = newStages[sourceStageIndex];
        const destStage = newStages[destStageIndex];

        const [movedDeal] = sourceStage.deals.splice(source.index, 1);
        destStage.deals.splice(destination.index, 0, movedDeal);

        setStages(newStages);

        // API Call
        try {
            await crmApi.moveDeal(draggableId, {
                new_stage_id: destination.droppableId,
                new_order_index: destination.index
            });
        } catch (err) {
            toast.error('Failed to move deal');
            loadPipeline(); // Revert on failure
        }
    };

    const handleCreateDeal = async () => {
        if (!newDealTitle || stages.length === 0) return;
        
        try {
            await crmApi.createDeal({
                stage_id: stages[0].id,
                title: newDealTitle,
                expected_value: parseFloat(newDealValue || '0')
            });
            toast.success(isRTL ? 'تم إنشاء الصفقة' : 'Deal Created');
            setShowModal(false);
            setNewDealTitle('');
            setNewDealValue('');
            loadPipeline();
        } catch (err) {
            toast.error('Failed to create deal');
        }
    };

    if (loading) {
        return (
            <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className={`p-12 text-center ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <p className="mb-3 text-sm" style={{ color: 'var(--text-danger,#dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                <button onClick={() => loadPipeline()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
            </div>
        );
    }

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        {isRTL ? 'إدارة علاقات العملاء (CRM)' : 'Sales Pipeline (CRM)'}
                    </h1>
                    <p className="text-surface-500">
                        {isRTL ? 'قيمة خط الأنابيب الإجمالية:' : 'Total Pipeline Value:'} 
                        <span className="font-bold text-violet-600 ml-2 mr-2 text-xl">
                            {formatCurrency(totalValue)}
                        </span>
                    </p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition shadow-sm"
                >
                    + {isRTL ? 'صفقة جديدة' : 'New Deal'}
                </button>
            </div>

            {/* Kanban Board */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-6 overflow-x-auto pb-8 snap-x min-h-[600px]">
                    {stages.map((stage) => (
                        <div key={stage.id} className="min-w-[320px] max-w-[320px] bg-surface-100 dark:bg-surface-800/50 rounded-2xl flex flex-col snap-start border border-surface-200 dark:border-surface-700/50">
                            {/* Column Header */}
                            <div className="p-4 border-b border-surface-200 dark:border-surface-700/50 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#cbd5e1' }}></div>
                                    <h3 className="font-bold text-surface-900 dark:text-white">
                                        {isRTL ? (stage.name_ar || stage.name) : stage.name}
                                    </h3>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 bg-surface-200 dark:bg-surface-700 rounded-full text-surface-600 dark:text-surface-300">
                                    {stage.deals?.length || 0}
                                </span>
                            </div>

                            {/* Droppable Area */}
                            <Droppable droppableId={stage.id}>
                                {(provided, snapshot) => (
                                    <div 
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 p-4 space-y-3 transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-violet-50 dark:bg-violet-900/10' : ''}`}
                                    >
                                        {stage.deals?.map((deal: any, index: number) => (
                                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`bg-white dark:bg-surface-900 p-4 rounded-xl shadow-sm border ${snapshot.isDragging ? 'border-violet-400 shadow-md scale-105' : 'border-surface-200 dark:border-surface-700 hover:border-violet-300'} transition-all`}
                                                    >
                                                        <h4 className="font-semibold text-sm mb-2 text-surface-900 dark:text-white">{deal.title}</h4>
                                                        <div className="flex justify-between items-center mt-3">
                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                                                                {formatCurrency(parseFloat(deal.expected_value || 0))}
                                                            </span>
                                                            <span className="text-[10px] text-surface-400">
                                                                {new Date(deal.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* New Deal Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-surface-100 dark:border-surface-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{isRTL ? 'إضافة صفقة جديدة' : 'Add New Deal'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-900" aria-label={isRTL ? 'إغلاق' : 'Close'}>✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'عنوان الصفقة' : 'Deal Title'}</label>
                                <input 
                                    type="text" 
                                    value={newDealTitle}
                                    onChange={e => setNewDealTitle(e.target.value)}
                                    placeholder={isRTL ? 'مثال: تجهيز مكتب شركة أحمد' : 'e.g. Acme Corp Office Setup'}
                                    className="w-full p-2.5 border border-surface-200 dark:border-surface-700 rounded-lg bg-surface-50 dark:bg-surface-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{isRTL ? 'القيمة المتوقعة' : 'Expected Value'}</label>
                                <input 
                                    type="number" 
                                    value={newDealValue}
                                    onChange={e => setNewDealValue(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-2.5 border border-surface-200 dark:border-surface-700 rounded-lg bg-surface-50 dark:bg-surface-800"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 font-medium text-surface-600">
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button onClick={handleCreateDeal} className="px-6 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 shadow-sm">
                                {isRTL ? 'حفظ الصفقة' : 'Save Deal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
