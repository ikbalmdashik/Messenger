"use client";

import React from "react";

import { useRouter } from "next/navigation";
import { Button } from "@radix-ui/themes";

import Routes from "@/app/routes/routes";

interface AuthRequiredProps {
  /** e.g. "the chat", "settings" */
  what?: string;
}

/**
 * Shown by signed-in-only pages when there is no
 * valid session (logged out, revoked, or reached
 * again with the browser's Back button).
 */
const AuthRequired: React.FC<AuthRequiredProps> = ({ what = "this page" }) => {
  const router = useRouter();

  return (
    <div className="h-[100dvh] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Authentication required
        </h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Please log in to access {what}.
        </p>

        <Button
          mt="2"
          style={{ width: "100%" }}
          className="text-xl"
          onClick={() => router.push(Routes.Login)}
        >
          Log In
        </Button>
      </div>
    </div>
  );
};

export default AuthRequired;
