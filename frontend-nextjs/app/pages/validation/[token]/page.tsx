"use client";

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

const Validation = ({ params }: ValidationProps) => {
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fe = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.Validate, {
          params: { token: params.token },
          withCredentials: true,
        });

        setTokenData(res.data);
      } catch (error: any) {
        console.log(error.response?.data);
        setTokenData({ statusCode: error.response?.data.statusCode });
      } finally {
        setLoading(false);
      }
    };

    fe();
  }, [params.token]);

  useEffect(() => {
    if (!loading && tokenData?.statusCode === 200) {
      router.replace(Routes.SecureSession);
    }
    
    if (!loading && tokenData?.statusCode === 404) {
      router.replace(Routes.NotFOund);
    }
  }, [loading, tokenData, router]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 flex items-center justify-center min-h-screen">
        <Spinner size={50} />
      </div>
    );
  }

  if (tokenData?.statusCode !== 200) {
    return(
      <div>
        <h1>Token Expired!</h1>
      </div>
    );
  }

  return null;
};

export default Validation;
