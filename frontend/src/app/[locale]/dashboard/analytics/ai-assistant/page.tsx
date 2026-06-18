'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { analyticsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
};

export default function AIAssistantPage() {
    const { d, isRTL } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'مرحباً بك! أنا مساعدك المالي الذكي 🤖\n\nيمكنني مساعدتك في تحليل أداء الشركة، وتتبع المبيعات، ومراقبة المخزون، وتلخيص الأرباح. اسألني أي شيء!',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const suggestedQuestions = [
        "ما هي أرباح الشركة هذا الشهر؟",
        "هل يوجد نواقص في المخزون؟",
        "ما هي أكثر المنتجات مبيعاً؟"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await analyticsApi.chat(text);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data.data.reply || res.data.reply || d?.ai?.error || 'عذراً، حدث خطأ في معالجة طلبك.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: d?.ai?.connectionError || 'عذراً، لا يمكنني الاتصال بالخادم حالياً. يرجى المحاولة لاحقاً.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">{d?.ai?.title || 'المساعد المالي الذكي (AI)'}</h1>
                        <p className="text-sm opacity-90">{d?.ai?.subtitle || 'مدعوم ببيانات الـ ERP الحية'}</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-md'
                        }`}>
                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                        </div>
                        
                        <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                        }`}>
                            {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                                <div className="prose prose-sm max-w-none dark:prose-invert prose-indigo prose-table:border prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-td:p-2 prose-th:p-2">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                            <span className={`text-[10px] block mt-2 opacity-50 ${msg.role === 'user' ? 'text-right text-indigo-200' : 'text-left'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-md flex items-center justify-center">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
                {/* Suggestions */}
                {messages.length <= 2 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {suggestedQuestions.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(q)}
                                className="text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-600 dark:text-indigo-300 px-3 py-1.5 rounded-full transition-colors border border-indigo-100 dark:border-indigo-800"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
                
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                    className="flex gap-2 relative"
                >
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={d?.ai?.placeholder || 'اسأل عن أرباحك، مبيعاتك، أو مخزونك...'}
                        className="flex-1 border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                        disabled={isLoading}
                        dir="rtl"
                    />
                    <Button 
                        type="submit" 
                        disabled={!input.trim() || isLoading}
                        className="absolute left-1 top-1 bottom-1 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 p-0 flex items-center justify-center"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
