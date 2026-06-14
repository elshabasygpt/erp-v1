import React from 'react';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    isRTL?: boolean;
}

export default function EmptyState({ icon, title, description, action, isRTL = false }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in w-full h-full min-h-[300px]">
            <div className="w-24 h-24 mb-6 rounded-full flex items-center justify-center text-5xl" 
                 style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                <span className="opacity-80 drop-shadow-md">{icon}</span>
            </div>
            
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
                {title}
            </h3>
            
            <p className="max-w-md text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {description}
            </p>
            
            {action && (
                <button 
                    onClick={action.onClick}
                    className="btn-primary px-8 py-3 ring-4 ring-primary-500/10 hover:ring-primary-500/20"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
