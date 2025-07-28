"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Routes from "./routes/routes";
import { AuthStepSkeleton } from "./components/auth/sleleton/authSkeleton";

export default function Home() {
  const Router = useRouter();

  useEffect(() => {
    Router.push(Routes.Login);
  }, []);

  return (
    <>
      <AuthStepSkeleton step={1} />
    </>

  );
}
