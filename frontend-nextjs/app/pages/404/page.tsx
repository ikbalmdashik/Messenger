"use client";

import Routes from "@/app/routes/routes";
import { useRouter } from "next/navigation";

const NotFoundPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white text-gray-900 dark:bg-gray-950 dark:text-white transition-colors">

      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-6 sm:p-8 text-center">

        {/* Icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg
            className="h-7 w-7 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M12 12h.01M8.5 9.5h.01M15.5 9.5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-semibold">
          404 - Page Not Found
        </h1>

        {/* Message */}
        <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
          The page you are looking for doesn’t exist or has been moved.
        </p>

        {/* Buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-[0.98]"
            onClick={() => router.replace(Routes.LandingPage)}
          >
            Go To Home
          </button>

        </div>

        {/* Footer */}
        <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
          Please check the URL.
        </p>

      </div>
    </div>
  );
};

export default NotFoundPage;
