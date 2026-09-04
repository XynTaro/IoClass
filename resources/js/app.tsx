import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { NavProgressBar } from './components/NavProgressBar';
import { NetworkStatusOverlay } from './components/NetworkStatusOverlay';
import { initializeTheme } from './hooks/use-appearance';
import {
    isNetworkError,
    triggerConnectionError,
} from './hooks/use-online-status';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Force full page reload if restored from browser back-forward cache (BF-Cache)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});

// Intercept browser back/forward buttons after logout to prevent showing cached protected pages
window.addEventListener('popstate', () => {
    // Ignore hash-only navigation on the current page
    if (
        sessionStorage.getItem('is_logged_out') === 'true' &&
        !window.location.hash
    ) {
        window.location.replace('/login');
    }
});

// Track auth status on navigate to update logged_out flag
router.on('navigate', (event) => {
    const page = event.detail.page;
    const user = (page.props as Record<string, any>)?.auth?.user;

    if (user) {
        sessionStorage.removeItem('is_logged_out');
    }
});

// Intercept Inertia network exceptions when offline or network drops
router.on('exception', (event) => {
    const exception = event.detail.exception;
    if (!navigator.onLine || isNetworkError(exception)) {
        event.preventDefault();
        triggerConnectionError({
            message:
                'Unable to connect to the server. Please check your internet connection.',
            onRetry: () => router.reload(),
        });
    }
});

// Intercept invalid Inertia responses when connection drops mid-flight
router.on('invalid', (event) => {
    const response = event.detail.response;
    if (!navigator.onLine || response?.status === 0) {
        event.preventDefault();
        triggerConnectionError({
            message:
                'Connection was interrupted. Please check your internet connection.',
            onRetry: () => router.reload(),
        });
    }
});

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <NavProgressBar />
                <App {...props} />
                <NetworkStatusOverlay />
            </StrictMode>,
        );
    },
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();
