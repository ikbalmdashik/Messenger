"use client";

import EmailVerifiedSuccess from "@/app/components/validation/successEmail";
import TokenExpire from "@/app/components/validation/tokenExpire";
import API_ENDPOINTS from "@/app/routes/api";
import Routes from "@/app/routes/routes";
import { FullScreenSpinner } from "@/app/components/spinner";
import axios from "axios";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import PasswordChange from "@/app/components/secure-session/passwordChange";

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
    // Prevent duplicate calls in React Strict Mode
    if (hasCalled.current) return;
    hasCalled.current = true;

    const validateToken = async () => {
      try {
        const res = await axios.post(API_ENDPOINTS.ValidateLink, {
          token: token,
        });

        const action = res.data?.action;

        if (action === "RESET_PASSWORD") {
          setStatus("valid1");
        } else if (action === "VERIFY_EMAIL") {
          setStatus("valid2");

          // Broadcast message ONLY after email verification succeeds
          const channel = new BroadcastChannel("verify_channel");
          channel.postMessage({ type: "VERIFIED" });
          channel.close();
        } else {
          setStatus("expired");
        }
      } catch (error: any) {
        console.log("Error:", error.response?.data);
        const statusCode = error?.response?.data?.statusCode;

        if (statusCode === 404) {
          setStatus("notfound");
        } else {
          setStatus("expired");
        }
      }
    };

    if (token) {
      validateToken();
    }
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
      <div className="flex items-center justify-center min-h-screen">
        <FullScreenSpinner size={"3"} />
      </div>
    );
  }

  if (status === "valid1") {
    return <PasswordChange token={token} />
  }

  if (status === "valid2") {
    return <EmailVerifiedSuccess />;
  }

  if (status === "notfound") {
    return null;
  }

  return <TokenExpire />;
};

export default Validation;