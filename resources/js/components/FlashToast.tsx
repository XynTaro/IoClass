import { usePage } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FlashToast() {
    const { flash } = usePage<{ flash: { success?: string; error?: string } }>().props;

    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        if (flash?.success) {
            setMessage(flash.success);
            setType('success');
            setVisible(true);
            setAnimating(true);
        } else if (flash?.error) {
            setMessage(flash.error);
            setType('error');
            setVisible(true);
            setAnimating(true);
        }
    }, [flash]);

    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => dismiss(), 2000);
        return () => clearTimeout(timer);
    }, [visible]);

    const dismiss = () => {
        setAnimating(false);
        setTimeout(() => setVisible(false), 300);
    };

    if (!visible) return null;

    const isSuccess = type === 'success';
    const color = isSuccess ? '#10b981' : '#ef4444';
    const label = isSuccess ? 'SUCCESS' : 'ERROR';

    return (
        <div
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            style={{
                background: animating ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0)',
                backdropFilter: animating ? 'blur(4px)' : 'blur(0px)',
                WebkitBackdropFilter: animating ? 'blur(4px)' : 'blur(0px)',
                transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
            }}
            onClick={dismiss}
        >
            <div
                className="pointer-events-auto flex flex-col items-center gap-5 rounded-2xl px-10 py-8"
                style={{
                    background: '#ffffff',
                    boxShadow: `0 0 40px 0 ${color}25, 0 20px 40px -8px rgba(0,0,0,0.15)`,
                    border: `1px solid ${color}20`,
                    minWidth: 220,
                    opacity: animating ? 1 : 0,
                    transform: animating ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(16px)',
                    transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {/* Outer glow ring */}
                <div
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                        width: 110,
                        height: 110,
                        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
                        boxShadow: `0 0 0 2px ${color}35`,
                    }}
                >
                    {/* Pulse ring animation */}
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            boxShadow: `0 0 0 2px ${color}35`,
                            animation: animating ? 'ping 1.2s cubic-bezier(0,0,0.2,1) 0.1s 2' : 'none',
                        }}
                    />

                    {/* Mid ring */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            inset: 10,
                            boxShadow: `0 0 0 1.5px ${color}55`,
                            background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
                        }}
                    />

                    {/* Inner circle */}
                    <div
                        className="relative flex items-center justify-center rounded-full"
                        style={{
                            width: 68,
                            height: 68,
                            background: `radial-gradient(circle at 40% 35%, ${color}22, ${color}08 70%)`,
                            boxShadow: `0 0 0 2.5px ${color}, 0 0 18px 0 ${color}55`,
                            animation: animating ? 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' : 'none',
                        }}
                    >
                        {isSuccess ? (
                            <Check strokeWidth={2.5} style={{ color, width: 30, height: 30 }} />
                        ) : (
                            <X strokeWidth={2.5} style={{ color, width: 30, height: 30 }} />
                        )}
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <p className="max-w-[200px] text-center text-sm leading-snug text-gray-600">
                        {message}
                    </p>
                )}

                {/* Badge */}
                <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-widest"
                    style={{
                        background: `${color}12`,
                        border: `1px solid ${color}40`,
                        color,
                    }}
                >
                    <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ background: color }}
                    />
                    {label}
                </div>
            </div>

            <style>{`
                @keyframes bounceIn {
                    0%   { transform: scale(0.5); opacity: 0; }
                    60%  { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); }
                }
                @keyframes ping {
                    75%, 100% { transform: scale(1.4); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
