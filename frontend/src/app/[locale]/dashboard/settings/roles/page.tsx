'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Shield, Users, Save, X } from 'lucide-react';

export default function RolesPage() {
    const { d } = useLanguage();
    const [roles, setRoles] = useState<any[]>([]);
    const [permissionsData, setPermissionsData] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', permissions: [] as string[] });

    useEffect(() => {
        fetchRoles();
        fetchPermissions();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const res = await authApi.getRoles();
            setRoles(res.data.data.data || res.data.data || []);
        } catch (error) {
            toast.error('Failed to load roles');
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const res = await authApi.getPermissions();
            setPermissionsData(res.data.data || {});
        } catch (error) {
            toast.error('Failed to load permissions');
        }
    };

    const handleOpenModal = (role?: any) => {
        if (role) {
            setEditingRole(role);
            setFormData({
                name: role.name,
                permissions: role.permissions?.map((p: any) => p.name) || []
            });
        } else {
            setEditingRole(null);
            setFormData({ name: '', permissions: [] });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRole(null);
        setFormData({ name: '', permissions: [] });
    };

    const togglePermission = (permName: string) => {
        setFormData(prev => {
            const has = prev.permissions.includes(permName);
            if (has) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== permName) };
            } else {
                return { ...prev, permissions: [...prev.permissions, permName] };
            }
        });
    };

    const toggleModulePermissions = (modulePerms: any[], isAllSelected: boolean) => {
        const modulePermNames = modulePerms.map(p => p.name);
        setFormData(prev => {
            if (isAllSelected) {
                return { ...prev, permissions: prev.permissions.filter(p => !modulePermNames.includes(p)) };
            } else {
                const newPerms = new Set([...prev.permissions, ...modulePermNames]);
                return { ...prev, permissions: Array.from(newPerms) };
            }
        });
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Role name is required');
            return;
        }

        try {
            if (editingRole) {
                await authApi.updateRole(editingRole.id, formData);
                toast.success('Role updated successfully');
            } else {
                await authApi.createRole(formData);
                toast.success('Role created successfully');
            }
            handleCloseModal();
            fetchRoles();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save role');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the role ${name}?`)) return;
        try {
            await authApi.deleteRole(id);
            toast.success('Role deleted successfully');
            fetchRoles();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete role');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-600" />
                        Roles & Permissions / الأدوار والصلاحيات
                    </h1>
                    <p className="text-gray-500 mt-1">Manage system access levels and user permissions</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Role / دور جديد
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <Card key={role.id} className="p-6 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{role.name}</h3>
                                    <p className="text-sm text-gray-500">{role.permissions?.length || 0} Permissions</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleOpenModal(role)}>
                                    <Edit className="w-4 h-4 text-blue-600" />
                                </Button>
                                {role.name !== 'Super Admin' && (
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(role.id, role.name)}>
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-4">
                            {role.permissions?.slice(0, 5).map((p: any) => (
                                <span key={p.id} className="px-2 py-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
                                    {p.name.replace(/_/g, ' ')}
                                </span>
                            ))}
                            {role.permissions?.length > 5 && (
                                <span className="px-2 py-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
                                    +{role.permissions.length - 5} more
                                </span>
                            )}
                        </div>
                        {role.name === 'Super Admin' && (
                            <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                                <div className="absolute transform rotate-45 bg-amber-400 text-white text-[10px] font-bold py-1 right-[-35px] top-[15px] w-[120px] text-center shadow-sm">
                                    SYSTEM
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingRole ? 'Edit Role' : 'Create Role'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">Role Name / اسم الدور</label>
                                <input 
                                    type="text"
                                    className="w-full border dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Cashier, Warehouse Manager..."
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    disabled={editingRole?.name === 'Super Admin'}
                                />
                            </div>

                            <h3 className="font-bold text-lg mb-4">Permissions / الصلاحيات الممنوحة</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {Object.entries(permissionsData).map(([module, perms]) => {
                                    const isAllSelected = perms.every((p: any) => formData.permissions.includes(p.name));
                                    const isSomeSelected = perms.some((p: any) => formData.permissions.includes(p.name)) && !isAllSelected;

                                    return (
                                        <Card key={module} className="p-4 border-l-4 border-l-indigo-500">
                                            <div className="flex justify-between items-center mb-3 pb-2 border-b dark:border-gray-800">
                                                <h4 className="font-bold capitalize text-indigo-700 dark:text-indigo-400">
                                                    {module}
                                                </h4>
                                                <button 
                                                    className={`text-xs px-2 py-1 rounded ${isAllSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}
                                                    onClick={() => toggleModulePermissions(perms, isAllSelected)}
                                                >
                                                    {isAllSelected ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {perms.map((p: any) => (
                                                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded">
                                                        <input 
                                                            type="checkbox"
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                            checked={formData.permissions.includes(p.name)}
                                                            onChange={() => togglePermission(p.name)}
                                                            disabled={editingRole?.name === 'Super Admin'}
                                                        />
                                                        <span className="truncate" title={p.name}>{p.name.replace(/_/g, ' ')}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 border-t dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
                            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700" disabled={editingRole?.name === 'Super Admin'}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Role
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
