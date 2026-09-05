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
import { Check } from "lucide-react";

import Routes from "@/app/routes/routes";

const EmailVerifiedSuccess: React.FC = () => {
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
          {/* Success Icon */}
          <Flex
            align="center"
            justify="center"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--green-3)",
              color: "var(--green-11)",
            }}
          >
            <Check size={34} strokeWidth={2.5} />
          </Flex>

          {/* Heading */}
          <Flex direction="column" align="center" gap="2">
            <Heading size="6" weight="bold" align="center">
              Email Verified
            </Heading>

            <Text
              size="3"
              color="gray"
              align="center"
              style={{
                maxWidth: 340,
                lineHeight: 1.6,
              }}
            >
              Your email has been successfully verified.
              <br />
              You can now continue using your account securely.
            </Text>
          </Flex>

          {/* Action */}
          <Box style={{ width: "100%" }}>
            <Button
              size="2"
              variant="solid"
              color="green"
              style={{
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => router.replace(Routes.Login)}
            >
              Go to Login
            </Button>
          </Box>

          {/* Footer */}
          <Flex direction="column" align="center" gap="1">
            <Text size="1" color="gray" align="center">
              Thank you for verifying your email
            </Text>

            <Text size="1" color="gray" weight="medium">
              Messenger
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};

export default EmailVerifiedSuccess;