"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2 } from '@/lib/icons'; // المصدر المرجعي للأيقونات
import { OmegaErrorPanel } from '@/components/shared/omega-error-panel'; // لوحة الأخطاء النيون

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // [LOG] بداية محاولة الدخول
        console.log(`[OMEGA AUTH] Initializing authentication for: ${email}`);

        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            // [CHECK] فحص طبيعة الرد قبل الـ Parsing لمنع الـ Unexpected Token Error
            const contentType = res.headers.get("content-type");
            let data;

            if (contentType && contentType.includes("application/json")) {
                data = await res.json();
            } else {
                // لو السيرفر بعت HTML (Error 500) هنقراه كـ Text ونطلعه في اللوجز
                const rawText = await res.text();
                console.error("[OMEGA AUTH] Critical Server Fault. Raw Response:", rawText);
                throw new Error(`Server Fault: Received HTML instead of JSON. Check Laravel logs.`);
            }

            if (!res.ok) {
                console.warn("[OMEGA AUTH] Access Denied:", res.status, data);
                throw new Error(data.message || 'Login failed. Please check your credentials.');
            }

            // [SUCCESS] نجاح الدخول
            console.log("[OMEGA AUTH] Cockpit Initialized successfully.");
            router.push('/orders');
        } catch (err: any) {
            console.error("[OMEGA AUTH] Submission Failure:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 relative overflow-hidden">
            {/* تأثيرات النيون الخلفية - Crystal Cockpit Aesthetic */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/5 blur-[120px] rounded-full" />

            <div className="w-full max-w-md z-10">
                <div className="backdrop-blur-xl bg-slate-900/40 border border-teal-500/20 p-8 shadow-2xl rounded-[18px]">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">OMEGA Ω</h1>
                        <p className="text-slate-400">Chief Architect Authentication</p>
                    </div>

                    {error && (
                        <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                            <OmegaErrorPanel message={error} />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500/50" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="omega-control w-full pl-12 pr-4 bg-slate-950/50 border border-slate-800 text-white focus:outline-none focus:border-teal-500/50 transition-all placeholder:text-slate-600"
                                    placeholder="jemy@omega.world"
                                /> {/* ميثاق 56px و 18px */}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Access Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500/50" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="omega-control w-full pl-12 pr-4 bg-slate-950/50 border border-slate-800 text-white focus:outline-none focus:border-teal-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="omega-control w-full bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all flex items-center justify-center gap-2 group shadow-lg shadow-teal-500/20 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>INITIALIZE COCKPIT</span>
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}