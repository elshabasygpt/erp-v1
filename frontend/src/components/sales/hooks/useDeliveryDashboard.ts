import { useState, useEffect, useMemo, useCallback } from 'react';
import { salesApi } from '@/lib/api';

export function useDeliveryDashboard(isRTL: boolean) {
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [search, setSearch] = useState('');

    const [showAssignModal, setShowAssignModal] = useState<any>(null);
    const [assigning, setAssigning] = useState(false);

    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [eta, setEta] = useState('');
    const [trackingCode, setTrackingCode] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);

    const [showStatusModal, setShowStatusModal] = useState<any>(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusNotes, setStatusNotes] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await salesApi.getDeliveries({ limit: 100 });
            setDeliveries(res?.data?.data?.data || res?.data?.data || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, []);

    const fetchReferences = useCallback(async () => {
        try {
            const chRes = await salesApi.getSalesChannels();
            setPlatforms(chRes?.data?.data?.data || chRes?.data?.data || []);
        } catch (e) {
            console.error("Failed to load reference data", e);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchReferences();
    }, [fetchData, fetchReferences]);

    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            const matchStatus = filterStatus === 'all' || d.status === filterStatus;
            const q = search.toLowerCase();
            const matchSearch = (d.delivery_number || '').toLowerCase().includes(q) 
                             || (d.customer?.name || '').toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }, [deliveries, filterStatus, search]);

    const handleAssign = useCallback(async () => {
        if (!showAssignModal) return;
        setAssigning(true);
        try {
            await salesApi.assignDelivery(showAssignModal.id, {
                driver_id: selectedDriver || null,
                delivery_platform_id: selectedPlatform || null,
                eta: eta || null,
                tracking_code: trackingCode || null,
                delivery_fee: deliveryFee || null,
            });
            setShowAssignModal(null);
            fetchData();
        } catch (e) {
            alert(isRTL ? 'فشل التعيين' : 'Assignment failed');
        }
        setAssigning(false);
    }, [showAssignModal, selectedDriver, selectedPlatform, eta, trackingCode, deliveryFee, fetchData, isRTL]);

    const handleUpdateStatus = useCallback(async () => {
        if (!showStatusModal) return;
        setUpdatingStatus(true);
        try {
            await salesApi.updateDeliveryStatus(showStatusModal.id, {
                status: newStatus,
                notes: statusNotes
            });
            setShowStatusModal(null);
            fetchData();
        } catch (e) {
            alert(isRTL ? 'فشل تحديث الحالة' : 'Status update failed');
        }
        setUpdatingStatus(false);
    }, [showStatusModal, newStatus, statusNotes, fetchData, isRTL]);

    const openAssignModal = useCallback((d: any) => {
        setShowAssignModal(d);
        setSelectedDriver(d.driver_id || '');
        setSelectedPlatform(d.delivery_platform_id || '');
        setEta(d.eta ? d.eta.split('T')[0] : '');
        setTrackingCode(d.tracking_code || '');
        setDeliveryFee(d.delivery_fee || 0);
    }, []);

    const openStatusModal = useCallback((d: any) => {
        setShowStatusModal(d);
        setNewStatus(d.status);
        setStatusNotes('');
    }, []);

    return {
        deliveries, employees, platforms,
        loading, filterStatus, setFilterStatus, search, setSearch,
        showAssignModal, setShowAssignModal, assigning,
        selectedDriver, setSelectedDriver, selectedPlatform, setSelectedPlatform, eta, setEta, trackingCode, setTrackingCode, deliveryFee, setDeliveryFee,
        showStatusModal, setShowStatusModal, newStatus, setNewStatus, statusNotes, setStatusNotes, updatingStatus,
        filteredDeliveries, handleAssign, handleUpdateStatus, openAssignModal, openStatusModal
    };
}
