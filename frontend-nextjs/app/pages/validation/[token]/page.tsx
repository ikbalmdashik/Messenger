"use client";

import EmailVerifiedSuccess from "@/app/components/validation/successEmail";
import TokenExpire from "@/app/components/validation/tokenExpire";
import API_ENDPOINTS from "@/app/routes/api";
import Routes from "@/app/routes/routes";
import { FullScreenSpinner } from "@/app/components/spinner";
import axios from "axios";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

interface ValidationProps {
  params: Promise<{
    token: string;
  }>;
}

type Status = "loading" | "valid1" | "valid2" | "expired" | "notfound";

const Validation = ({ params }: ValidationProps) => {
  const { token } = use(params);

  const [status, setStatus] = useState<Status>("loading");
  const router = useRouter();

  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    const validateToken = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.Validate, {
          params: { token },
          withCredentials: true,
        });

        const action = res.data?.action;

        if (action === "RESET_PASSWORD_ALLOWED") {
          setStatus("valid1");
        } else if (action === "EMAIL_VERIFIED") {
          setStatus("valid2");
        } else {
          setStatus("expired");
        }
      } catch (error: any) {
        const code = error?.response?.data?.statusCode;

        if (code === 404) {
          setStatus("notfound");
        } else {
          setStatus("expired");
        }
      }
    };

    validateToken();
  }, [token]);

  useEffect(() => {
    if (status === "valid1") {
      router.replace(Routes.SecureSession);
    }

    if (status === "notfound") {
      router.replace(Routes.NotFOund);
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="bg-white dark:bg-slate-950 flex items-center justify-center min-h-screen">
        <FullScreenSpinner size={"3"} />
      </div>
    );
  }

  if (status === "valid2") {
    return <EmailVerifiedSuccess />;
  }

  if (status === "valid1" || status === "notfound") {
    return null;
  }

  return <TokenExpire />;
};

export default Validation;