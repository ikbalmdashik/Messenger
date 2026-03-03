"use client"

import API_ENDPOINTS from "@/app/routes/api";
import Routes from "@/app/routes/routes";
import axios from "axios";
import { redirect, useRouter } from "next/navigation";
import { useEffect } from "react";

interface ValidationProps {
  params: {
    token: string;
  };
}

const Validation = async ({ params }: ValidationProps) => {
  const router = useRouter()
  useEffect(() => {
    const fe = async () => {
      const token = params.token;
      try {
        const response = await axios.get(API_ENDPOINTS.Validate, { params: { token }, withCredentials: true })
        // console.log(response.data)
      } catch (error: any) {
        console.log(error.response?.data)
      }
      router.replace(Routes.SecureSession)
    }

    fe();
  }, [params.token]);

  return(
    <>
      <h1>Validating....</h1>
    </>
  );

};

export default Validation;