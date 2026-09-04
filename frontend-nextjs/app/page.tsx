"use client";

import { Box, Progress, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Routes from "@/app/routes/routes";

export default function LoadingProgress() {
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  // Progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }

        return Math.min(prev + Math.random() * 8, 100);
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Redirect AFTER progress reaches 100
  useEffect(() => {
    if (progress >= 50) {
      router.replace(Routes.LandingPage);
    }
  }, [progress, router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Box maxWidth="300px" className="w-full">
        <Box className="w-full space-y-2">
          <Text size="5" align="center" className="block">
            {Math.round(progress)}%
          </Text>

          <Progress value={progress} size="2" />
        </Box>
      </Box>
    </div>
  );
}