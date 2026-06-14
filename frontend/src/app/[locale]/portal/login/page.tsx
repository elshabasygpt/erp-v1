'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { portalAuthApi } from '@/lib/portal-api';

export default function PortalLoginPage({ params }: { params: { locale: string } }) {
    const isRTL = params.locale === 'ar';
    const router = useRouter();

    const [mode, setMode] = useState<'password' | 'magic'>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [magicSent, setMagicSent] = useState(false);
    const [devMagicToken, setDevMagicToken] = useState('');

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !tenantId) return;
        setIsLoading(true);
        setError('');

        // Store tenant_id so portal-api interceptor can attach it
        localStorage.setItem('partner_tenant_id', tenantId);

        try {
            const res = await portalAuthApi.login({ email, password, tenant_id: tenantId });
            const { token, partner } = res.data.data;
            localStorage.setItem('partner_token', token);
            localStorage.setItem('partner_data', JSON.stringify(partner));
            router.push(`/${params.locale}/portal`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'بيانات الدخول غير صحيحة');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !tenantId) return;
        setIsLoading(true);
        setError('');
        localStorage.setItem('partner_tenant_id', tenantId);

        try {
            const res = await portalAuthApi.sendMagicLink({ email, tenant_id: tenantId });
            setMagicSent(true);
            // In dev mode, backend returns the token directly
            if (res.data?.data?.magic_token) {
                setDevMagicToken(res.data.data.magic_token);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyMagicLink = async () => {
        if (!devMagicToken) return;
        setIsLoading(true);
        try {
            const tid = localStorage.getItem('partner_tenant_id') || tenantId;
            const res = await portalAuthApi.verifyMagicLink({ token: devMagicToken, tenant_id: tid });
            const { token, partner } = res.data.data;
            localStorage.setItem('partner_token', token);
            localStorage.setItem('partner_data', JSON.stringify(partner));
            router.push(`/${params.locale}/portal`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'الرابط غير صالح أو منتهي الصلاحية');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4"
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{ background: 'radial-gradient(ellipse at 60% 50%, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
        >
            {/* Animated orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-96 h-96 rounded-full opacity-10 top-0 -right-20" style={{ background: 'radial-gradient(circle, #ffd700, transparent)' }} />
                <div className="absolute w-64 h-64 rounded-full opacity-5 bottom-10 left-10" style={{ background: 'radial-gradient(circle, #c0a000, transparent)' }} />
            </div>

            <div className="w-full max-w-md relative z-10 space-y-6">
                {/* Logo / Title */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, #ffd700, #b8860b)' }}>
                        🏦
                    </div>
                    <h1 className="text-2xl font-black text-white">
                        {isRTL ? 'بوابة الشريك' : 'Partner Portal'}
                    </h1>
                    <p className="text-sm" style={{ color: '#ffd700' }}>
                        {isRTL ? 'لوحة تحكم المستثمر الخاصة' : 'Your private investor dashboard'}
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl shadow-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.2)', backdropFilter: 'blur(20px)' }}>

                    {/* Mode Toggle */}
                    <div className="flex" style={{ borderBottom: '1px solid rgba(255,215,0,0.1)' }}>
                        {['password', 'magic'].map((m) => (
                            <button
                                key={m}
                                onClick={() => { setMode(m as any); setError(''); setMagicSent(false); }}
                                className="flex-1 py-4 text-sm font-bold transition-all"
                                style={mode === m
                                    ? { background: 'rgba(255,215,0,0.1)', color: '#ffd700', borderBottom: '2px solid #ffd700' }
                                    : { color: 'rgba(255,255,255,0.4)' }
                                }
                            >
                                {m === 'password'
                                    ? (isRTL ? '🔑 كلمة المرور' : '🔑 Password')
                                    : (isRTL ? '🪄 رابط سحري' : '🪄 Magic Link')}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Tenant ID input */}
                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {isRTL ? 'معرّف المتجر (Tenant ID)' : 'Store ID (Tenant ID)'}
                            </label>
                            <input
                                type="text"
                                value={tenantId}
                                onChange={e => setTenantId(e.target.value)}
                                placeholder="e.g. default"
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,215,0,0.2)', color: '#fff' }}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="partner@company.com"
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,215,0,0.2)', color: '#fff' }}
                            />
                        </div>

                        {/* Password (password mode only) */}
                        {mode === 'password' && (
                            <form onSubmit={handlePasswordLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                        {isRTL ? 'كلمة المرور' : 'Password'}
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,215,0,0.2)', color: '#fff' }}
                                    />
                                </div>
                                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
                                    style={{ background: 'linear-gradient(135deg, #ffd700, #b8860b)', color: '#1a1a2e' }}
                                >
                                    {isLoading ? '...' : (isRTL ? 'تسجيل الدخول' : 'Sign In')}
                                </button>
                            </form>
                        )}

                        {/* Magic Link mode */}
                        {mode === 'magic' && (
                            <div className="space-y-4">
                                {!magicSent ? (
                                    <>
                                        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                                        <button
                                            onClick={handleMagicLink}
                                            disabled={isLoading}
                                            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
                                            style={{ background: 'linear-gradient(135deg, #ffd700, #b8860b)', color: '#1a1a2e' }}
                                        >
                                            {isLoading ? '...' : (isRTL ? '✉️ إرسال رابط الدخول' : '✉️ Send Magic Link')}
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-3 text-center">
                                        <p className="text-green-400 text-sm font-bold">✅ {isRTL ? 'تم إرسال الرابط للبريد الإلكتروني! صالح 30 دقيقة.' : 'Link sent! Valid for 30 minutes.'}</p>
                                        {devMagicToken && (
                                            <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(255,215,0,0.1)', border: '1px dashed rgba(255,215,0,0.3)', color: '#ffd700' }}>
                                                <p className="mb-2 font-bold">🧪 وضع التطوير — الرمز الخاص:</p>
                                                <p className="font-mono break-all">{devMagicToken}</p>
                                                <button
                                                    onClick={handleVerifyMagicLink}
                                                    disabled={isLoading}
                                                    className="mt-2 w-full py-2 rounded-lg font-bold text-xs"
                                                    style={{ background: '#ffd700', color: '#1a1a2e' }}
                                                >
                                                    {isRTL ? 'دخول بالرمز أعلاه' : 'Enter with above token'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {isRTL ? 'بوابة محمية للشركاء والمستثمرين فقط' : 'Secure portal for partners & investors only'}
                </p>
            </div>
        </div>
    );
}
