import React, { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import { Tag, Star, X, Loader2, Plus, Users } from 'lucide-react';

interface ProductAliasesTabProps {
  productId: string;
  isRTL: boolean;
}

export function ProductAliasesTab({ productId, isRTL }: ProductAliasesTabProps) {
  const [aliases, setAliases] = useState<any[]>([]);
  const [customerAliases, setCustomerAliases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlias, setNewAlias] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [productId]);

  const load = async () => {
    setLoading(true);
    try {
      const [aliasRes, customerAliasRes] = await Promise.all([
        inventoryApi.getAliases(productId),
        inventoryApi.getCustomerAliases(productId),
      ]);
      setAliases(aliasRes.data?.data || aliasRes.data || []);
      setCustomerAliases(customerAliasRes.data?.data || customerAliasRes.data || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newAlias.trim()) return;
    setSaving(true);
    try {
      await inventoryApi.createAlias(productId, { alias_name: newAlias.trim() });
      setNewAlias('');
      await load();
    } catch (e) {
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (aliasId: string) => {
    try {
      await inventoryApi.updateAlias(productId, aliasId, { is_default_print: true });
      await load();
    } catch (e) {
    }
  };

  const handleDelete = async (aliasId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
    try {
      await inventoryApi.deleteAlias(productId, aliasId);
      await load();
    } catch (e) {
    }
  };

  const handleDeleteCustomerAlias = async (aliasId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
    try {
      await inventoryApi.deleteCustomerAlias(productId, aliasId);
      await load();
    } catch (e) {
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Add Alias */}
      <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
        <label className="block text-xs font-bold mb-2 text-slate-700 dark:text-white">
          {isRTL ? 'إضافة اسم تجاري بديل' : 'Add Alternative Commercial Name'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={isRTL ? 'مثال: تيل فرامل A5 أو OEM 8K0698151' : 'e.g. Brake Pad A4 or OEM 8K0698151'}
            className="flex-1 h-10 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-lg px-3 text-sm outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newAlias.trim()}
            className="px-4 h-10 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {isRTL ? 'إضافة' : 'Add'}
          </button>
        </div>
      </div>

      {/* Aliases list */}
      <div>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
          <Tag className="w-4 h-4 text-blue-500" />
          {isRTL ? 'الأسماء التجارية البديلة' : 'Alternative Names'}
        </h3>
        {aliases.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-white/10">
            {isRTL ? 'لا توجد أسماء بديلة لهذا المنتج' : 'No alternative names for this product'}
          </div>
        ) : (
          <div className="space-y-2">
            {aliases.map(alias => (
              <div key={alias.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151522] shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => !alias.is_default_print && handleSetDefault(alias.id)}
                    title={isRTL ? 'تعيين كاسم الطباعة الافتراضي' : 'Set as default print name'}
                  >
                    <Star className={`w-4 h-4 ${alias.is_default_print ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-400'}`} />
                  </button>
                  <span className="font-bold text-sm text-slate-800 dark:text-white">{alias.alias_name}</span>
                  {alias.is_default_print && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      {isRTL ? 'افتراضي للطباعة' : 'Default print'}
                    </span>
                  )}
                </div>
                <button onClick={() => handleDelete(alias.id)} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer-specific aliases (read-only summary; managed from the customer side) */}
      <div>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
          <Users className="w-4 h-4 text-purple-500" />
          {isRTL ? 'أسماء طباعة خاصة بعملاء معينين' : 'Customer-Specific Print Names'}
        </h3>
        {customerAliases.length === 0 ? (
          <div className="text-center py-6 text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-white/10 text-sm">
            {isRTL ? 'لا توجد أسماء خاصة بعملاء لهذا المنتج' : 'No customer-specific print names for this product'}
          </div>
        ) : (
          <div className="space-y-2">
            {customerAliases.map(ca => (
              <div key={ca.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151522] shadow-sm">
                <div>
                  <span className="font-bold text-sm text-slate-800 dark:text-white">{ca.customer?.name || ca.customer_id}</span>
                  <span className="text-slate-400 mx-2">→</span>
                  <span className="text-sm text-slate-600 dark:text-white/70">{ca.alias_name}</span>
                </div>
                <button onClick={() => handleDeleteCustomerAlias(ca.id)} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
