'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';

interface LoginPageProps {
    params: { locale: string };
}

export default function LoginPage({ params }: LoginPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const locale = params.locale;
    const isRTL = locale === 'ar';

    const dict = {
        title: isRTL ? 'مرحباً بك مجدداً' : 'Welcome Back',
        subtitle: isRTL ? 'سجّل دخولك لمتابعة إدارة أعمالك بذكاء' : 'Sign in to intelligently manage your business',
        email: isRTL ? 'البريد الإلكتروني' : 'Email Address',
        password: isRTL ? 'كلمة المرور' : 'Password',
        submit: isRTL ? 'تسجيل الدخول' : 'Sign In',
        noAccount: isRTL ? 'ليس لديك حساب؟' : "Don't have an account?",
        register: isRTL ? 'إنشاء حساب جديد' : 'Create an Account',
        appName: isRTL ? 'نظام المحاسبة السحابي' : 'SaaS Accounting',
        invalidCredentials: isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password',
        rememberMe: isRTL ? 'تذكرني' : 'Remember me',
        forgotPassword: isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?',
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(email, password);

        if (result.success) {
            router.push(`/${locale}/dashboard`);
        } else {
            setError(result.error || dict.invalidCredentials);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 selection:bg-indigo-500/30">
            {/* ── Dynamic Abstract Background ── */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-emerald-600/10 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }} />
                
                {/* Subtle Grid overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4PHBhdGggZD0iTTU0LjYyNyAwTDYwIDUuMzczVjBoLTUuMzczek0yNy4zMTMgMGwzLjQxNCAzLjQxNEwyNy4zMTMgNi44MjhWMHptLTE0IDEwbDMuNDE0IDMuNDE0TDEzLjMxMyAxNi44MjhWMTB6bTEwIDE0bDMuNDE0IDMuNDE0TDIzLjMxMyAyNi44MjhWMjR6bTEwIDE0bDMuNDE0IDMuNDE0TDMzLjMxMyA0MC44MjhWMzh6TTAgMjMuMzEzbDMuNDE0LTMuNDE0TDAgMTYuNDg2djYuODI4em0wIDE0bDMuNDE0LTMuNDE0TDAgMzAuNDg2djYuODI4em0wIDE0bDMuNDE0LTMuNDE0TDAgNDQuNDg2djYuODI4em00NS40ODYtMi4xNzJsNC4xMDEtNC4xLTMuNDE0LTMuNDE0LTQuMTAxIDQuMXptMC0xNGw0LjEwMS00LjEtMy40MTQtMy40MTQtNC4xMDEgNC4xem0wLTE0bDQuMTAxLTQuMS0zLjQxNC0zLjQxNC00LjEwMSA0LjF6TTI3LjMxMyA2MGwzLjQxNC0zLjQxNEwyNy4zMTMgNTMuMTcxVjYwem0tMTQgMGwzLjQxNC0zLjQxNEwxMy4zMTMgNTMuMTcxVjYwem0xMCAwbTMuNDE0LTMuNDE0TDIzLjMxMyA1My4xNzFWMjN6TTYwIDMzLjMxM2wtMy40MTQtMy40MTRMNjAgMjYuNDg2djYuODI4em0wIDE0bC0zLjQxNC0zLjQxNEw2MCA0MC44MjhWNDBoLTYuODI4em0wIDEwLjUyN2wtNC40NzMtNC40NzMgMy40MTQtMy40MTQgNC40NzMgNC40NzNWNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50 z-0" />
            </div>

            {/* ── Center Glass Card ── */}
            <div className="relative z-10 w-full max-w-[420px] p-8 mx-4 sm:mx-auto">
                <div className="absolute inset-0 bg-white/[0.04] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] ring-1 ring-white/5" />
                
                <div className="relative z-20 flex flex-col items-center">
                    {/* Logo Aura */}
                    <div className="mb-8 relative group">
                        <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center relative shadow-xl transform group-hover:scale-105 transition-transform duration-300">
                            <span className="text-white font-black text-2xl tracking-tighter">$</span>
                        </div>
                    </div>

                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2 text-center">
                        {dict.title}
                    </h1>
                    <p className="text-indigo-200/60 text-sm text-center mb-8 px-4 font-medium">
                        {dict.subtitle}
                    </p>

                    {/* Auth Error Banner */}
                    {error && (
                        <div className="w-full mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md animate-scale-in flex items-center gap-3">
                            <span className="text-rose-400 text-lg">⚠️</span>
                            <p className="text-rose-200 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="w-full space-y-5">
                        {/* Email Input */}
                        <div className="space-y-1.5 group">
                            <label className="block text-xs font-semibold text-indigo-200/70 uppercase tracking-wider ms-1">
                                {dict.email}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 start-0 pl-4 flex items-center pointer-events-none text-indigo-300/50 group-focus-within:text-indigo-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@company.com"
                                    className="w-full h-12 bg-indigo-950/40 border border-indigo-500/20 rounded-xl ps-11 pe-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-indigo-200/20"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5 group">
                            <div className="flex justify-between items-center ms-1">
                                <label className="block text-xs font-semibold text-indigo-200/70 uppercase tracking-wider">
                                    {dict.password}
                                </label>
                                <button type="button" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                    {dict.forgotPassword}
                                </button>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 start-0 pl-4 flex items-center pointer-events-none text-indigo-300/50 group-focus-within:text-indigo-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-12 bg-indigo-950/40 border border-indigo-500/20 rounded-xl ps-11 pe-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-indigo-200/20 tracking-wider font-mono"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 end-0 pr-4 flex items-center text-indigo-300/50 hover:text-white transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="relative w-full h-12 bg-gradient-to-r from-indigo-500 hover:from-indigo-400 to-violet-600 hover:to-violet-500 text-white font-bold rounded-xl overflow-hidden transition-all shadow-[0_4px_20px_0_rgba(99,102,241,0.4)] hover:shadow-[0_4px_25px_0_rgba(99,102,241,0.6)] disabled:opacity-70 disabled:cursor-not-allowed group mt-4!"
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out" />
                            <span className="relative flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {isRTL ? 'جاري التحقق...' : 'Authenticating...'}
                                    </>
                                ) : (
                                    <>
                                        {dict.submit}
                                        <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                    
                    {/* Demo Account Tip */}
                    <div className="mt-8 text-center text-xs text-indigo-200/50 flex flex-col items-center gap-1">
                        <span className="flex items-center justify-center gap-1 bg-white/5 border border-white/5 rounded-full px-3 py-1 mb-2">
                           ✨ {isRTL ? 'حساب للتجربة السريعة' : 'Quick Demo Account'}
                        </span>
                        <code className="font-mono bg-black/20 px-2 py-0.5 rounded text-indigo-300">admin@company.com</code>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

                    <p className="text-sm text-indigo-200/60 font-medium">
                        {dict.noAccount}{' '}
                        <Link href={`/${locale}/register`} className="text-white hover:text-indigo-300 font-bold transition-colors">
                            {dict.register}
                        </Link>
                    </p>
                </div>
            </div>

            {/* Locale Toggles */}
            <div className="absolute top-6 right-6 flex gap-3 z-20 backdrop-blur-md bg-white/5 border border-white/5 rounded-2xl p-1.5 shadow-lg">
                <Link href="/en/login" className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${locale === 'en' ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-white/60 hover:text-white'}`}>
                    EN
                </Link>
                <Link href="/ar/login" className={`px-4 py-1.5 rounded-xl text-xs font-bold font-arabic transition-all ${locale === 'ar' ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-white/60 hover:text-white'}`}>
                    العربية
                </Link>
            </div>
        </div>
    );
}
