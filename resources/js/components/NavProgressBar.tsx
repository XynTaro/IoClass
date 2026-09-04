import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/**
 * Top navigation progress bar.
 * Appears at the very top of the window when navigating between pages.
 */
export function NavProgressBar() {
    const [showProgress, setShowProgress] = useState(false);

    useEffect(() => {
        const stopStart = router.on('start', () => {
            setShowProgress(true);
        });
        const stopFinish = router.on('finish', () => {
            setShowProgress(false);
        });

        return () => {
            stopStart();
            stopFinish();
        };
    }, []);

    if (!showProgress) {
        return null;
    }

    return <div className="nav-progress-bar" aria-hidden="true" />;
}
