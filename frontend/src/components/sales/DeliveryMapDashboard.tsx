'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { deliveriesApiNew } from '@/lib/api';
import L from 'leaflet';
import { MapPin, Truck } from 'lucide-react';

// Fix leaflet default icon issue
const customMarker = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const redMarker = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface DeliveryMapDashboardProps {
    dict: any;
    locale: string;
}

function DeliveryMapDashboardComponent({ dict, locale }: DeliveryMapDashboardProps) {
    const isRTL = locale === 'ar';
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMapData = async () => {
            try {
                const res = await deliveriesApiNew.getMapData();
                const data = res.data?.data || res.data;
                setDeliveries(data.deliveries || []);
                setDrivers(data.drivers || []);
            } catch (error) {
                console.error("Failed to fetch map data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMapData();
        // Poll every 30 seconds to simulate live tracking
        const interval = setInterval(fetchMapData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="h-[600px] flex items-center justify-center animate-pulse bg-slate-50 dark:bg-[#1a1a2e] rounded-xl border border-slate-200 dark:border-white/10">Loading map...</div>;

    // Default center (Riyadh, SA)
    const center: [number, number] = [24.7136, 46.6753];
    
    // If we have active deliveries, center on the first one
    if (deliveries.length > 0 && deliveries[0].latitude) {
        center[0] = parseFloat(deliveries[0].latitude);
        center[1] = parseFloat(deliveries[0].longitude);
    }

    return (
        <div className="h-[700px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg relative">
            <MapContainer center={center} zoom={11} className="w-full h-full z-0">
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                
                {deliveries.map(d => (
                    d.latitude && d.longitude && (
                        <Marker key={`del-${d.id}`} position={[parseFloat(d.latitude), parseFloat(d.longitude)]} icon={redMarker}>
                            <Popup>
                                <div className="font-sans">
                                    <h3 className="font-bold text-sm mb-1">{d.delivery_number}</h3>
                                    <p className="text-xs text-slate-500 mb-2">{d.customer?.name}</p>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 uppercase">
                                        {d.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {drivers.map(driver => (
                    driver.latitude && driver.longitude && (
                        <Marker key={`drv-${driver.id}`} position={[parseFloat(driver.latitude), parseFloat(driver.longitude)]} icon={customMarker}>
                            <Popup>
                                <div className="font-sans flex flex-col items-center">
                                    <Truck className="w-6 h-6 text-blue-600 mb-1" />
                                    <h3 className="font-bold text-sm">{driver.name}</h3>
                                    <p className="text-xs text-slate-500">{isRTL ? 'توصيل قيد التنفيذ' : 'Active Delivery'}: {driver.current_delivery}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
            
            <div className="absolute top-4 right-4 z-[400] bg-white dark:bg-[#1a1a2e] p-4 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 max-w-[250px]">
                <h3 className="font-bold text-sm mb-3 text-slate-800 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    {isRTL ? 'مفتاح الخريطة' : 'Map Legend'}
                </h3>
                <div className="space-y-2 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
                        <span className="text-slate-600 dark:text-slate-300">{isRTL ? 'وجهة التوصيل' : 'Delivery Destination'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                        <span className="text-slate-600 dark:text-slate-300">{isRTL ? 'السائق (تتبع حي)' : 'Driver (Live Track)'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Next.js dynamic import with SSR disabled is required for react-leaflet
export const DeliveryMapDashboard = dynamic(() => Promise.resolve(DeliveryMapDashboardComponent), {
    ssr: false,
    loading: () => <div className="h-[700px] flex items-center justify-center bg-slate-50 dark:bg-[#1a1a2e] rounded-xl border border-slate-200 dark:border-white/10 animate-pulse">Loading map...</div>
});
