import { Check } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ModalTone = 'emerald' | 'blue' | 'sky' | 'violet' | 'amber' | 'orange' | 'rose' | 'indigo';

const TONE_STYLES: Record<ModalTone, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-600 dark:text-emerald-400' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-950/50', text: 'text-blue-600 dark:text-blue-400' },
    sky: { bg: 'bg-sky-100 dark:bg-sky-950/50', text: 'text-sky-600 dark:text-sky-400' },
    violet: { bg: 'bg-violet-100 dark:bg-violet-950/50', text: 'text-violet-600 dark:text-violet-400' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-600 dark:text-amber-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-950/50', text: 'text-orange-600 dark:text-orange-400' },
    rose: { bg: 'bg-rose-100 dark:bg-rose-950/50', text: 'text-rose-600 dark:text-rose-400' },
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-950/50', text: 'text-indigo-600 dark:text-indigo-400' },
};

interface ModalHeaderProps {
    icon: React.ElementType;
    tone?: ModalTone;
    title: string;
    description?: string;
}

/**
 * Consistent dialog header with a colored icon badge.
 * Pair with `<ModalAccentBar />` inside a `DialogContent` that uses `p-0 overflow-hidden`.
 */
export function ModalHeader({ icon: Icon, tone = 'emerald', title, description }: ModalHeaderProps) {
    const { bg, text } = TONE_STYLES[tone];

    return (
        <DialogHeader>
            <div className="flex items-center gap-3">
                <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', bg)}>
                    <Icon className={cn('size-5', text)} />
                </div>
                <div>
                    <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
            </div>
        </DialogHeader>
    );
}

/** Thin colored bar across the top of the dialog. */
export function ModalAccentBar({ className }: { className?: string }) {
    return <div className={cn('h-1 w-full bg-emerald-500', className)} />;
}

export interface ModalStep {
    label: string;
    icon: React.ElementType;
}

/**
 * Numbered wizard step indicator used by multi-step create modals
 * (matches the Student modal design).
 */
export function ModalStepIndicator({
    steps,
    current,
}: {
    steps: ModalStep[];
    current: number;
}) {
    return (
        <div className="flex items-center justify-center gap-0 py-1">
            {steps.map(({ label, icon: Icon }, i) => {
                const num = i + 1;
                const done = num < current;
                const active = num === current;
                return (
                    <div key={label} className="flex items-center">
                        {i > 0 && (
                            <div
                                className={cn(
                                    'mx-2 h-0.5 w-8 rounded-full sm:w-14',
                                    num <= current ? 'bg-emerald-500' : 'bg-muted',
                                )}
                            />
                        )}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-full border-2 transition-colors',
                                    done && 'border-emerald-500 bg-emerald-500 text-white',
                                    active && 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40',
                                    !done && !active && 'border-muted bg-muted/30 text-muted-foreground',
                                )}
                            >
                                {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                            </div>
                            <span
                                className={cn(
                                    'text-[10px] font-medium',
                                    active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                                )}
                            >
                                {label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
