import { Head, Link } from '@inertiajs/react';
import { Home, Compass } from 'lucide-react';

type Props = {
    status: number;
};

const MESSAGES: Record<number, { title: string; description: string }> = {
    401: {
        title: 'Session Expired',
        description: 'Your session has ended. Please log in again to continue.',
    },
    403: {
        title: 'Access Denied',
        description: "You don't have permission to view this page.",
    },
    404: {
        title: 'Page Not Found',
        description: "The page you're looking for might have been moved or doesn't exist.",
    },
    500: {
        title: 'Server Error',
        description: 'Something went wrong on our end. Please try again later.',
    },
    503: {
        title: 'Service Unavailable',
        description: 'The system is currently down for maintenance. Check back shortly.',
    },
};

export default function Error({ status }: Props) {
    const message = MESSAGES[status] ?? {
        title: 'Unexpected Error',
        description: 'Something went wrong. Please go back and try again.',
    };

    return (
        <>
            <Head title={`${status} — ${message.title}`} />

            <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
                {/* Large faded status number */}
                <div
                    aria-hidden
                    className="select-none text-[10rem] font-black leading-none tracking-tight sm:text-[13rem]"
                    style={{
                        background: 'linear-gradient(180deg, #1a1a1a 0%, #d1d5db 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    {status}
                </div>

                {/* Message */}
                <h1 className="-mt-4 text-xl font-semibold text-gray-800 sm:text-2xl">
                    {message.title}
                </h1>
                <p className="mt-2 max-w-sm text-sm text-gray-500">
                    {message.description}
                </p>

                {/* Actions */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
                    >
                        <Home className="size-4" />
                        Go Home
                    </Link>

                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                        <Compass className="size-4" />
                        {status === 401 ? 'Log In' : 'Explore'}
                    </Link>
                </div>
            </div>
        </>
    );
}
