import React, { useState, useEffect } from 'react';

const BetaBanner: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const wasDismissed = sessionStorage.getItem('zeroBetaDismissed');
        if (wasDismissed) {
            setDismissed(true);
            return;
        }
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        sessionStorage.setItem('zeroBetaDismissed', 'true');
        setTimeout(() => setDismissed(true), 400);
    };

    if (dismissed) return null;

    return (
        <div
            className={`fixed bottom-6 left-1/2 z-[9999] transition-all duration-500 ease-out ${
                visible
                    ? 'opacity-100 translate-y-0 -translate-x-1/2'
                    : 'opacity-0 translate-y-4 -translate-x-1/2 pointer-events-none'
            }`}
        >
            <div
                className="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl max-w-[92vw] sm:max-w-md
                    bg-white border border-neutral-200"
            >
                {/* Rocket icon */}
                <span className="text-lg flex-shrink-0" aria-hidden="true">🚀</span>

                <p className="text-sm leading-snug text-neutral-600">
                    <span className="font-semibold text-neutral-900">We're evolving!</span>{' '}
                    You may spot a quirk or two — we're actively polishing things up.
                </p>

                {/* Dismiss button */}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 ml-1 p-1.5 rounded-full
                        text-neutral-400 hover:text-neutral-700
                        hover:bg-neutral-100
                        transition-colors duration-200"
                    aria-label="Dismiss"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default BetaBanner;
