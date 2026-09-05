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
import { AlertTriangle } from "lucide-react";

import Routes from "@/app/routes/routes";

const TokenExpire: React.FC = () => {
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
          {/* Warning Icon */}
          <Flex
            align="center"
            justify="center"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--red-3)",
              color: "var(--red-11)",
            }}
          >
            <AlertTriangle size={34} strokeWidth={2.2} />
          </Flex>

          {/* Heading */}
          <Flex direction="column" align="center" gap="2">
            <Heading size="6" weight="bold" align="center">
              Token Expired
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
              Your session link has expired or is no longer valid.
              <br />
              Please request a new link to continue securely.
            </Text>
          </Flex>

          {/* Action */}
          <Box style={{ width: "100%" }}>
            <Button
              size="2"
              variant="solid"
              color="red"
              style={{
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => router.replace(Routes.Login)}
            >
              Go Back to Login
            </Button>
          </Box>

          {/* Footer */}
          <Flex direction="column" align="center" gap="1">
            <Text size="1" color="gray" align="center">
              For your security, tokens expire after a limited time.
            </Text>

            <Text size="1" color="gray" align="center">
              You may request a new one if needed.
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};

export default TokenExpire;