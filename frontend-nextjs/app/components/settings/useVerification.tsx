"use client";

import React, { useCallback, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import PasswordModal from "@/app/components/auth/PasswordModal";

interface VerificationForm {
  password: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_FORM: VerificationForm = {
  password: "",
  otpCode: "",
  newPassword: "",
  confirmPassword: "",
};

/**
 * Wraps the existing PasswordModal (password or OTP)
 * and exposes `verify()`, which resolves with the
 * one-time token from /auth/validateUser, or null if
 * the user cancels.
 *
 * Usage:
 *   const { verify, verificationModal } = useVerification(email);
 *   const token = await verify();
 *   if (token) await axios.post(url, { ...body, verificationToken: token });
 *   ...
 *   return <>{verificationModal}</>;
 */
export const useVerification = (email: string | null | undefined) => {
  const methods = useForm<VerificationForm>({ defaultValues: EMPTY_FORM });

  const [open, setOpen] = useState(false);

  const resolverRef = useRef<((token: string | null) => void) | null>(null);

  const settle = useCallback(
    (token: string | null) => {
      resolverRef.current?.(token);
      resolverRef.current = null;
      setOpen(false);
      methods.reset(EMPTY_FORM);
    },
    [methods],
  );

  const verify = useCallback((): Promise<string | null> => {
    // Cancel any verification still waiting.
    resolverRef.current?.(null);

    methods.reset(EMPTY_FORM);
    setOpen(true);

    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, [methods]);

  const verificationModal = (
    <FormProvider {...methods}>
      <PasswordModal
        isOpen={open}
        onOpenChange={(next) => {
          if (!next) {
            settle(null);
          }
        }}
        subtitleAccount={email ?? undefined}
        onVerifySuccess={(_method, token) => settle(token)}
      />
    </FormProvider>
  );

  return { verify, verificationModal };
};

export default useVerification;
