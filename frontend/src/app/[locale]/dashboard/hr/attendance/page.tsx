"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';

export default function AttendancePage() {
    const { d, isRTL } = useLanguage();
    const [attendances, setAttendances] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchData();
        fetchEmployees();
    }, [selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await hrApi.getAttendance({ limit: 100, date: selectedDate });
            setAttendances(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch attendance", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await hrApi.getEmployees({ limit: 100, is_active: true });
            setEmployees(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const handleCheckIn = async (employeeId: string) => {
        try {
            await hrApi.checkIn({ employee_id: employeeId, date: selectedDate });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleCheckOut = async (employeeId: string) => {
        try {
            await hrApi.checkOut({ employee_id: employeeId, date: selectedDate });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-600">
                        {d.hr?.attendance || 'Attendance'}
                    </h1>
                    <p className="text-slate-500 mt-1">{d.hr?.recordAttendance || 'Record Attendance'}</p>
                </div>
                <div>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        <tr>
                            <th className="px-6 py-4">{d.hr?.employeeName || 'Name'}</th>
                            <th className="px-6 py-4">{d.hr?.shiftStart || 'Shift'}</th>
                            <th className="px-6 py-4">{d.hr?.checkIn || 'Check In'}</th>
                            <th className="px-6 py-4">{d.hr?.checkOut || 'Check Out'}</th>
                            <th className="px-6 py-4">{d.hr?.status || 'Status'}</th>
                            <th className="px-6 py-4 text-center">{d.hr?.actions || 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => {
                            const att = attendances.find(a => a.employee_id === emp.id);
                            return (
                                <tr key={emp.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 font-medium" style={{ textAlign: isRTL ? 'right' : 'left' }}>{emp.name}</td>
                                    <td className="px-6 py-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>{emp.shift_start} - {emp.shift_end}</td>
                                    <td className="px-6 py-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                                        {att?.check_in ? <span className="text-green-600 font-bold">{att.check_in}</span> : '-'}
                                    </td>
                                    <td className="px-6 py-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                                        {att?.check_out ? <span className="text-blue-600 font-bold">{att.check_out}</span> : '-'}
                                    </td>
                                    <td className="px-6 py-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                                        {att ? (
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                att.status === 'present' ? 'bg-green-100 text-green-700' :
                                                att.status === 'late' ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {d.hr?.[att.status] || att.status}
                                                {att.late_minutes > 0 ? ` (${att.late_minutes}m)` : ''}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                                                {d.hr?.absent || 'Absent'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center space-x-2 space-x-reverse">
                                        {!att?.check_in && (
                                            <button onClick={() => handleCheckIn(emp.id)} className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-bold mx-1">
                                                {d.hr?.checkIn || 'Check IN'}
                                            </button>
                                        )}
                                        {!att?.check_out && (
                                            <button onClick={() => handleCheckOut(emp.id)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-bold mx-1">
                                                {d.hr?.checkOut || 'Check OUT'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {employees.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-slate-500">No employees found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
