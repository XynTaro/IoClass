import { Archive, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { archiveModalConfirmClassName } from '@/lib/archive-ui';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    confirmClassName?: string;
    type?: 'archive' | 'restore' | 'default';
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText,
    cancelText = 'Cancel',
    isLoading = false,
    confirmVariant,
    confirmClassName,
    type = 'default',
}: ConfirmationModalProps) {
    // Determine defaults based on type
    let icon = null;
    let iconBg = '';
    let topStripe = '';
    let ambientBg = '';
    let glowShadow = '';
    let buttonGlow = '';
    let defaultConfirmText = confirmText || 'Confirm';
    const defaultConfirmVariant = confirmVariant || 'default';
    let defaultConfirmClassName = confirmClassName;

    if (type === 'archive') {
        icon = <Archive className="size-6 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300" />;
        iconBg = 'bg-amber-500/10 dark:bg-amber-500/20 ring-8 ring-amber-500/5';
        topStripe = 'bg-gradient-to-r from-amber-500/20 via-amber-500 to-amber-500/20';
        ambientBg = 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 dark:from-amber-500/10 via-transparent to-transparent';
        glowShadow = 'shadow-[0_20px_50px_-12px_rgba(245,158,11,0.12)] border-amber-500/20 dark:border-amber-500/30';
        buttonGlow = 'hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] dark:hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]';
        defaultConfirmText = confirmText || 'Archive';
        defaultConfirmClassName = confirmClassName || archiveModalConfirmClassName;
    } else if (type === 'restore') {
        icon = <RotateCcw className="size-6 text-emerald-600 dark:text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />;
        iconBg = 'bg-emerald-500/10 dark:bg-emerald-500/20 ring-8 ring-emerald-500/5';
        topStripe = 'bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20';
        ambientBg = 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/5 dark:from-emerald-500/10 via-transparent to-transparent';
        glowShadow = 'shadow-[0_20px_50px_-12px_rgba(16,185,129,0.12)] border-emerald-500/20 dark:border-emerald-500/30';
        buttonGlow = 'hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        defaultConfirmText = confirmText || 'Restore';
        defaultConfirmClassName = confirmClassName || 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600';
    } else {
        topStripe = 'bg-gradient-to-r from-primary/20 via-primary to-primary/20';
        ambientBg = 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent';
        glowShadow = 'shadow-[0_20px_50px_-12px_rgba(59,130,246,0.08)]';
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={`sm:max-w-[420px] p-6 overflow-hidden rounded-xl border bg-background/95 backdrop-blur-md transition-all duration-300 select-none ${glowShadow}`}>
                {/* Decorative Ambient Top Radial Glow */}
                <div className={`absolute inset-0 w-full h-[150px] pointer-events-none ${ambientBg}`} />
                
                {/* Decorative Top Accent Stripe */}
                <div className={`absolute top-0 left-0 w-full h-[3px] z-20 ${topStripe}`} />

                {/* Grid backdrop pattern for tech aesthetic */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none opacity-50 dark:opacity-80" />

                <div className="relative z-10 flex flex-col items-center text-center sm:items-start sm:text-left gap-4 mt-1">
                    {icon && (
                        <div className="group relative flex items-center justify-center size-12 rounded-full transition-all duration-500 hover:shadow-md">
                            {/* Inner circle wrapper with ripple effect */}
                            <div className={`absolute inset-0 rounded-full ${iconBg} opacity-100 transition-opacity duration-300 group-hover:opacity-85`} />
                            {/* Glowing radial gradient backdrop */}
                            <div className="absolute -inset-1 rounded-full bg-radial from-current/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <span className="relative z-10">{icon}</span>
                        </div>
                    )}
                    <div className="space-y-2 w-full">
                        <DialogHeader className="p-0 text-center sm:text-left">
                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground/95 antialiased">
                                {title}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="text-sm leading-relaxed text-muted-foreground/80 font-normal">
                            {description}
                        </DialogDescription>
                    </div>
                </div>
                
                <DialogFooter className="relative z-10 mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full sm:w-auto border-border/60 hover:bg-muted/70 text-foreground transition-all duration-200 active:scale-[0.97] hover:scale-[1.01]"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={defaultConfirmVariant}
                        className={`w-full sm:w-auto font-semibold shadow-xs transition-all duration-200 active:scale-[0.97] hover:scale-[1.01] flex items-center justify-center gap-2 ${buttonGlow} ${defaultConfirmClassName}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin text-current" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <span>{defaultConfirmText}</span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
