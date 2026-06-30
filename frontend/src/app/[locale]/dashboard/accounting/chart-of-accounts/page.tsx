"use client";

import React, { useEffect, useState } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { accountingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2 } from 'lucide-react';
import AccountFormModal from '@/components/accounting/AccountFormModal';

interface Account {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    level: number;
    parent_id: string | null;
    children?: Account[];
    is_active: boolean;
    total_debit?: number;
    total_credit?: number;
    total_balance?: number;
}

export default function ChartOfAccountsPage() {
    const { isRTL } = useLanguage();
    const confirm = useConfirm();
    const [accountsTree, setAccountsTree] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const res = await accountingApi.getAccountsTree();
            const tree = res.data?.data || res.data || [];
            setAccountsTree(tree);
            
            // Expand root nodes by default
            const newExpanded: Record<string, boolean> = {};
            tree.forEach((acc: Account) => {
                newExpanded[acc.id] = true;
            });
            setExpanded(newExpanded);
            
        } catch (err) {
            toast.error('Failed to load chart of accounts');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDelete = async (account: Account) => {
        if (account.children && account.children.length > 0) {
            toast.error(isRTL ? 'لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية' : 'Cannot delete a parent account with sub-accounts');
            return;
        }
        if (!await confirm(isRTL ? 'هل أنت متأكد من حذف هذا الحساب؟' : 'Are you sure you want to delete this account?')) return;
        
        try {
            await accountingApi.deleteAccount(account.id);
            toast.success('Account deleted successfully');
            loadAccounts();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete account');
        }
    };

    const openModal = (accountToEdit: Account | null = null, parentId: string | null = null) => {
        setEditingAccount(accountToEdit);
        setSelectedParentId(parentId);
        setIsModalOpen(true);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'asset': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
            case 'liability': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            case 'equity': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
            case 'revenue': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
            case 'expense': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
            default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        }
    };

    // Recursive rendering of tree rows
    const renderTree = (nodes: Account[], currentLevel: number = 0) => {
        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expanded[node.id];
            const indent = currentLevel * 24; // 24px per level

            return (
                <React.Fragment key={node.id}>
                    <tr className={`border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors ${currentLevel === 0 ? 'bg-surface-50/50 dark:bg-surface-900/50 font-medium' : ''}`}>
                        <td className="px-6 py-4 flex items-center">
                            <div style={{ width: indent, flexShrink: 0 }} />
                            <button 
                                onClick={() => hasChildren ? toggleExpand(node.id) : null}
                                className={`w-6 h-6 flex items-center justify-center rounded hover:bg-surface-200 dark:hover:bg-surface-700 mr-2 ${!hasChildren ? 'invisible' : ''}`}
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} className={isRTL ? 'rotate-180' : ''} />}
                            </button>
                            <span className="font-mono text-sm text-surface-500 mr-3 w-16">{node.code}</span>
                            <span className="font-semibold text-surface-900 dark:text-surface-100">
                                {isRTL ? node.name_ar : node.name}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getTypeColor(node.type)}`}>
                                {node.type.toUpperCase()}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-right text-surface-600 dark:text-surface-300">
                            {node.total_debit !== undefined ? parseFloat(node.total_debit.toString()).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-right text-surface-600 dark:text-surface-300">
                            {node.total_credit !== undefined ? parseFloat(node.total_credit.toString()).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-mono font-bold text-right ${(node.total_balance ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                            {node.total_balance !== undefined ? parseFloat(node.total_balance.toString()).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => openModal(null, node.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition" title="Add Sub-Account">
                                    <Plus size={16} />
                                </button>
                                <button onClick={() => openModal(node, null)} className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition" title="Edit">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(node)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition" title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                    {hasChildren && isExpanded && renderTree(node.children!, currentLevel + 1)}
                </React.Fragment>
            );
        });
    };

    return (
        <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{isRTL ? 'شجرة الحسابات' : 'Chart of Accounts'}</h1>
                    <p className="text-surface-500 text-sm">
                        {isRTL ? 'إدارة الهيكل المالي وحسابات دفتر الأستاذ العام' : 'Manage your financial structure and general ledger accounts.'}
                    </p>
                </div>
                <button onClick={() => openModal()} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2">
                    <Plus size={18} />
                    {isRTL ? 'إضافة حساب رئيسي' : 'Add Root Account'}
                </button>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-200 dark:border-surface-800 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-surface-500">Loading accounts...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 border-b border-surface-200 dark:border-surface-800 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">{isRTL ? 'الحساب' : 'Account'}</th>
                                    <th className="px-6 py-4 w-32">{isRTL ? 'النوع' : 'Type'}</th>
                                    <th className="px-6 py-4 w-32 text-right">{isRTL ? 'إجمالي المدين' : 'Total Debit'}</th>
                                    <th className="px-6 py-4 w-32 text-right">{isRTL ? 'إجمالي الدائن' : 'Total Credit'}</th>
                                    <th className="px-6 py-4 w-40 text-right">{isRTL ? 'الرصيد الفعلي' : 'Net Balance'}</th>
                                    <th className="px-6 py-4 w-32 text-right">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderTree(accountsTree)}
                                {accountsTree.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-surface-500">
                                            {isRTL ? 'لا توجد حسابات مضافة. انقر على "إضافة حساب" للبدء.' : 'No accounts found. Add a new account to get started.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <AccountFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        loadAccounts();
                    }}
                    account={editingAccount}
                    parentId={selectedParentId}
                    allAccounts={accountsTree} // Used to populate Parent Dropdown if needed
                />
            )}
        </div>
    );
}
