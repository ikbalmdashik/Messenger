"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Routes from "./routes/routes";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const Router = useRouter();

  useEffect(() => {
    Router.push(Routes.LandingPage);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-950 flex items-center justify-center min-h-screen">
      <Spinner size={50} />
    </div>
  );
}
