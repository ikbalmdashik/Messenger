"use client";

import TokenExpire from "@/app/components/validation/tokenExpire";
import API_ENDPOINTS from "@/app/routes/api";
import Routes from "@/app/routes/routes";
import { Spinner } from "@/components/ui/spinner";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ValidationProps {
  params: {
    token: string;
  };
}

type Status = "loading" | "valid" | "expired" | "notfound";

const Validation = ({ params }: ValidationProps) => {
  const [status, setStatus] = useState<Status>("loading");
  const router = useRouter();

  // Fetch token validation
  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.Validate, {
          params: { token: params.token },
          withCredentials: true,
        });

        // Valid token
        if (res.data?.action === "RESET_PASSWORD_ALLOWED") {
          setStatus("valid");
        } else {
          // Token exists but expired/used
          setStatus("expired");
        }

      } catch (error: any) {
        const code = error?.response?.data?.statusCode;

        if (code === 404) {
          // Token not found
          console.log(error?.response?.data);
          setStatus("notfound");
        } else {
          // Any other error → treat as expired
          setStatus("expired");
        }
      }
    };

    validateToken();
  }, [params.token]);

  // Handle redirects
  useEffect(() => {
    if (status === "valid") {
      router.replace(Routes.SecureSession);
    }

    if (status === "notfound") {
      router.replace(Routes.NotFOund);
    }
  }, [status, router]);

  // Loading UI
  if (status === "loading") {
    return (
      <div className="bg-white dark:bg-slate-950 flex items-center justify-center min-h-screen">
        <Spinner size={50} />
      </div>
    );
  }

  // Prevent flicker during redirect
  if (status === "valid" || status === "notfound") {
    return null;
  }

  // Token expired / used
  return <TokenExpire />;
};

export default Validation;
