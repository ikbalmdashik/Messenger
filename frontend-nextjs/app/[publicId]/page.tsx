
"use client";

import axios from "axios";
import API_ENDPOINTS, {
  GetUserByPublicIdResponse,
} from "../routes/api";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Separator,
  Skeleton,
  Text,
} from "@radix-ui/themes";

import {
  CheckCircle2,
  Mail,
  Phone,
  UserRound,
  MessageCircle,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";

export default function PublicProfile() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [user, setUser] =
    useState<GetUserByPublicIdResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getUserByPublicId = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.post(
          API_ENDPOINTS.GetUserByPublicId,
          { publicId },
          { withCredentials: true }
        );

        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Unable to find this user.");
      } finally {
        setLoading(false);
      }
    };

    if (publicId) {
      getUserByPublicId();
    }
  }, [publicId]);

  if (loading) {
    return (
      <Container size="3" px="4" py="8">
        <Card size="4">
          <Flex direction="column" align="center" gap="4">
            <Skeleton width="100px" height="100px" />
            <Skeleton width="180px" height="24px" />
            <Skeleton width="120px" height="16px" />
            <Skeleton width="100%" height="100px" />
          </Flex>
        </Card>
      </Container>
    );
  }

  if (error || !user) {
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        style={{ minHeight: "70vh" }}
      >
        <Box
          p="4"
          style={{
            borderRadius: "50%",
            background: "var(--gray-a3)",
          }}
        >
          <UserRound size={36} color="var(--gray-9)" />
        </Box>

        <Heading size="5">User not found</Heading>

        <Text color="gray" size="2">
          {error || "This profile may no longer be available."}
        </Text>

        <Button variant="soft" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </Flex>
    );
  }

  const initials = user.fullName
    .split(" ")
    .map((name) => name[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Container size="3" px="4" py={{ initial: "5", sm: "8" }}>
      <Flex direction="column" gap="5">

        {/* Profile Card */}
        <Card size="3">
          <Flex
            direction="column"
            align="center"
            gap="3"
            py="5"
          >
            {/* Avatar */}
            <Box
              p="1"
              style={{
                borderRadius: "50%",
                border: "2px solid var(--accent-a6)",
              }}
            >
              <Avatar
                size="8"
                radius="full"
                fallback={initials}
                color="indigo"
                variant="soft"
              />
            </Box>

            {/* Name */}
            <Flex align="center" gap="2" wrap="wrap" justify="center">
              <Heading size="6" align="center">
                {user.fullName}
              </Heading>

              {user.isEmailVerified && (
                <CheckCircle2
                  size={19}
                  color="var(--accent-9)"
                />
              )}
            </Flex>

            {/* Public ID */}
            <Text color="gray" size="2">
              @{user.publicId}
            </Text>

            {/* Badges */}
            <Flex gap="2" wrap="wrap" justify="center">
              <Badge
                color={user.isEmailVerified ? "green" : "gray"}
                variant="soft"
                size="2"
              >
                {user.isEmailVerified
                  ? "Verified Account"
                  : "Unverified Account"}
              </Badge>

              <Badge color="indigo" variant="soft" size="2">
                {user.role}
              </Badge>
            </Flex>

            {/* Actions */}
            <Flex gap="3" mt="2" wrap="wrap" justify="center">
              <Button size="3">
                <MessageCircle size={17} />
                Message
              </Button>

            </Flex>
          </Flex>

          <Separator size="4" />

          {/* User Information */}
          <Box p="4">
            <Heading size="3" mb="4">
              Account Information
            </Heading>

            <Flex direction="column" gap="4">

              {/* Email */}
              <Flex align="center" gap="3">
                <Box
                  p="2"
                  style={{
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-3)",
                  }}
                >
                  <Mail size={19} color="var(--gray-11)" />
                </Box>

                <Box flexGrow="1" minWidth="0">
                  <Text size="2" weight="medium" style={{ overflowWrap: "anywhere" }}>
                    {user.email}
                  </Text>
                </Box>

                {user.isEmailVerified && (
                  <Badge color="green" variant="soft">
                    Verified
                  </Badge>
                )}
              </Flex>

              <Separator size="4" />

              {/* Phone */}
              <Flex align="center" gap="3">
                <Box
                  p="2"
                  style={{
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-3)",
                  }}
                >
                  <Phone size={19} color="var(--gray-11)" />
                </Box>

                <Box flexGrow="1">
                  <Text size="2" weight="medium">
                    {user.phone || "Not provided"}
                  </Text>
                </Box>
              </Flex>

              <Separator size="4" />

              {/* Public ID */}
              <Flex align="center" gap="3">
                <Box
                  p="2"
                  style={{
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-3)",
                  }}
                >
                  <UserRound size={19} color="var(--gray-11)" />
                </Box>

                <Box flexGrow="1">
                  <Text size="2" weight="medium">
                    @{user.publicId}
                  </Text>
                </Box>
              </Flex>

              <Separator size="4" />

              {/* Account Status */}
              <Flex align="center" gap="3">
                <Box
                  p="2"
                  style={{
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-3)",
                  }}
                >
                  <ShieldCheck size={19} color="var(--gray-11)" />
                </Box>

                <Box flexGrow="1">
                  <Text size="2" weight="medium">
                    Active Account
                  </Text>
                </Box>

                <Badge color="green" variant="soft">
                  Active
                </Badge>
              </Flex>

            </Flex>
          </Box>
        </Card>

        {/* Footer */}
        <Text color="gray" size="1" align="center">
          Messenger · Public Profile
        </Text>

      </Flex>
    </Container>
  );
}
