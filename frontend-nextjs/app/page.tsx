"use client"

import { useEffect } from "react";
import Chat from "./pages/chat/page";
import { useRouter } from "next/navigation";
import Routes from "./routes/routes";

export default function Home() {
  const Router = useRouter();

  useEffect(() => {
    Router.push(Routes.Login);
  }, []);

  return (
    <div className="">
      {/* <Chat /> */}
    </div>
  );
}
