"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import { Frown } from "lucide-react";

import Routes from "@/app/routes/routes";

const NotFoundPage: React.FC = () => {
  const router = useRouter();

  return (
    <Flex
      align="center"
      justify="center"
      px="4"
      style={{
        minHeight: "100dvh",
      }}
    >
      <Card
        size="3"
        variant="ghost"
        style={{
          width: "100%",
          maxWidth: 420,
        }}
      >
        <Flex
          direction="column"
          align="center"
          gap="5"
          p={{ initial: "2", sm: "4" }}
        >
          {/* Icon */}
          <Flex
            align="center"
            justify="center"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--gray-4)",
              color: "var(--gray-11)",
            }}
          >
            <Frown size={34} strokeWidth={2} />
          </Flex>

          {/* Heading */}
          <Flex direction="column" align="center" gap="2">
            <Heading size="6" weight="bold" align="center">
              404 - Page Not Found
            </Heading>

            <Text
              size="3"
              color="gray"
              align="center"
              style={{
                maxWidth: 350,
                lineHeight: 1.6,
              }}
            >
              The page you are looking for doesn&apos;t exist or has been
              moved.
            </Text>
          </Flex>

          {/* Action */}
          <Box style={{ width: "100%" }}>
            <Button
              size="2"
              variant="solid"
              style={{
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => router.replace(Routes.LandingPage)}
            >
              Go To Home
            </Button>
          </Box>

          {/* Footer */}
          <Text size="1" color="gray" align="center">
            Please check the URL and try again.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
};

export default NotFoundPage;