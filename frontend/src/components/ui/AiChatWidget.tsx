"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { aiApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

export default function AiChatWidget() {
    const { isRTL } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;
        
        const userMsg = text.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await aiApi.chat(userMsg);
            const reply = res.data?.data?.reply || res.data?.reply || "I'm sorry, I couldn't process that.";
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred while connecting to the AI Co-Pilot." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(input);
        }
    };

    return (
        <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 flex flex-col items-end`} dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* Chat Window */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'scale-100 opacity-100 mb-4 h-[500px] w-[380px]' : 'scale-90 opacity-0 h-0 w-[380px] pointer-events-none'}`}>
                <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 flex flex-col h-full w-full">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 rounded-t-2xl flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                ✨
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">AI CFO Co-Pilot</h3>
                                <p className="text-[10px] text-white/80">Online & ready to assist</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition" aria-label={isRTL ? 'إغلاق' : 'Close'}>
                            ✕
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50 dark:bg-surface-950">
                        {messages.length === 0 && (
                            <div className="text-center mt-8">
                                <div className="text-4xl mb-3">👋</div>
                                <p className="text-sm text-surface-500 font-medium mb-4">
                                    {isRTL ? 'مرحباً! أنا مساعدك المالي الذكي. كيف يمكنني مساعدتك اليوم؟' : 'Hello! I am your AI Financial Assistant. How can I help you today?'}
                                </p>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => handleSend("What is my predicted cash flow?")} className="text-xs bg-white dark:bg-surface-800 p-2 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-violet-500 transition text-left">
                                        "What is my predicted cash flow?"
                                    </button>
                                    <button onClick={() => handleSend("Are there any inventory warnings?")} className="text-xs bg-white dark:bg-surface-800 p-2 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-violet-500 transition text-left">
                                        "Are there any inventory warnings?"
                                    </button>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-violet-600 text-white rounded-br-sm' 
                                        : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-bl-sm prose prose-sm dark:prose-invert'
                                }`}>
                                    {msg.role === 'assistant' ? (
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800">
                        <div className="relative">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isRTL ? "اسألني عن مبيعاتك، مخزونك..." : "Ask about revenue, cash flow..."}
                                className="w-full bg-surface-100 dark:bg-surface-800 border-none rounded-xl pl-4 pr-12 py-3 text-sm resize-none focus:ring-2 focus:ring-violet-500 outline-none h-[48px] overflow-hidden"
                                rows={1}
                            />
                            <button 
                                onClick={() => handleSend(input)}
                                disabled={!input.trim() || loading}
                                className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-2 p-1.5 rounded-lg transition ${
                                    input.trim() && !loading ? 'bg-violet-600 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-400'
                                }`}
                            >
                                ↑
                            </button>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-[9px] text-surface-400 font-medium tracking-wider uppercase">AI Co-Pilot is currently simulated</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl shadow-violet-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
                    isOpen ? 'bg-surface-800 text-white rotate-90' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                }`}
            >
                {isOpen ? '✕' : '✨'}
            </button>
        </div>
    );
}
