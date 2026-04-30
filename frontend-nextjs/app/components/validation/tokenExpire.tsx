"use client";

import Routes from "@/app/routes/routes";
import { useRouter } from "next/navigation";

const TokenExpire: React.FC = () => {
    const router = useRouter();
    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-white text-gray-900 dark:bg-gray-950 dark:text-white transition-colors">

            <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-6 sm:p-8 text-center">

                {/* Icon */}
                <div className="mx-auto mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <svg
                        className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 dark:text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v4m0 4h.01M10.29 3.86l-8.2 14.2A2 2 0 003.8 21h16.4a2 2 0 001.71-3.04l-8.2-14.2a2 2 0 00-3.42 0z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-semibold">
                    Token Expired
                </h1>

                {/* Message */}
                <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    Your session link has expired or is no longer valid.
                    <br className="hidden sm:block" />
                    Please request a new link to continue securely.
                </p>

                {/* Buttons */}
                <div className="mt-6 flex flex-col gap-3">

                    <button
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-[0.98]"
                        onClick={() => router.replace(Routes.Login)}
                        >
                            Go Back to Login
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
                    For your security, tokens expire after a limited time <br />
                    You may request a new one if needed.
                </p>
            </div>
        </div>
    );
};

export default TokenExpire;