"use client";

import React, { useState } from "react";

import axios from "axios";
import Link from "next/link";

import { Avatar, Box, Flex, HoverCard, Text } from "@radix-ui/themes";

import {
  BadgeCheck,
  ExternalLink,
  GraduationCap,
  Lock,
  MapPin,
  ShieldBan,
} from "lucide-react";

import API_ENDPOINTS, { GetUserByPublicIdResponse } from "@/app/routes/api";
import { formatLocation, initialsOf } from "@/app/lib/profile";

/**
 * Profiles fetched this page load. Short-lived on
 * purpose: privacy or block changes show up after
 * CACHE_MS.
 */
const CACHE_MS = 60 * 1000;

const cache = new Map<
  string,
  { at: number; profile: GetUserByPublicIdResponse | null }
>();

const inFlight = new Map<string, Promise<GetUserByPublicIdResponse | null>>();

const fetchProfile = (publicId: string) => {
  const cached = cache.get(publicId);

  if (cached && Date.now() - cached.at < CACHE_MS) {
    return Promise.resolve(cached.profile);
  }

  const pending = inFlight.get(publicId);

  if (pending) {
    return pending;
  }

  const request = axios
    .post<GetUserByPublicIdResponse | null>(
      API_ENDPOINTS.GetUserByPublicId,
      { publicId },
      { withCredentials: true },
    )
    .then((response) => {
      const profile = response.data ?? null;
      cache.set(publicId, { at: Date.now(), profile });
      return profile;
    })
    .finally(() => {
      inFlight.delete(publicId);
    });

  inFlight.set(publicId, request);

  return request;
};

interface ProfileHoverCardProps {
  publicId: string | null | undefined;
  /** The name (or any trigger). Rendered as-is. */
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Hover a name to see a short profile overview:
 * avatar, name, @id, location, latest education and
 * a link to the full profile. Respects privacy: the
 * server hides what the viewer may not see.
 */
const ProfileHoverCard: React.FC<ProfileHoverCardProps> = ({
  publicId,
  children,
  side = "bottom",
}) => {
  const [profile, setProfile] = useState<GetUserByPublicIdResponse | null>(
    null,
  );
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  if (!publicId) {
    return children;
  }

  const load = () => {
    setState("loading");

    fetchProfile(publicId)
      .then((result) => {
        setProfile(result);
        setState(result ? "idle" : "error");
      })
      .catch(() => setState("error"));
  };

  const location = formatLocation(profile?.location);
  const latestEducation = profile?.education?.[0];

  return (
    <HoverCard.Root
      openDelay={350}
      closeDelay={120}
      onOpenChange={(open) => {
        if (open) {
          load();
        }
      }}
    >
      <HoverCard.Trigger>{children}</HoverCard.Trigger>

      <HoverCard.Content side={side} align="start" size="1" maxWidth="300px">
        {!profile ? (
          <Text size="1" color="gray">
            {state === "error" ? "Profile unavailable." : "Loading…"}
          </Text>
        ) : (
          <Flex direction="column" gap="2" style={{ minWidth: 220 }}>
            <Flex align="center" gap="3">
              <Avatar
                size="4"
                radius="full"
                color="sky"
                variant="soft"
                fallback={initialsOf(profile.fullName)}
              />

              <Box className="min-w-0">
                <Flex align="center" gap="1">
                  <Text size="3" weight="bold" className="truncate">
                    {profile.fullName}
                  </Text>

                  {profile.isEmailVerified && (
                    <BadgeCheck
                      className="h-4 w-4 shrink-0 text-emerald-500"
                      aria-label="Verified"
                    />
                  )}
                </Flex>

                <Text size="1" color="gray" as="div" className="truncate">
                  @{profile.publicId}
                </Text>
              </Box>
            </Flex>

            {(profile.blockedByMe || profile.blockedMe) && (
              <Flex align="center" gap="1">
                <ShieldBan size={13} color="var(--red-10)" />
                <Text size="1" color="red">
                  {profile.blockedByMe ? "You blocked this person" : "Unavailable"}
                </Text>
              </Flex>
            )}

            {profile.hidden.location ? (
              <Flex align="center" gap="1">
                <Lock size={13} color="var(--gray-10)" />
                <Text size="1" color="gray">
                  Location is private
                </Text>
              </Flex>
            ) : (
              location && (
                <Flex align="center" gap="1" className="min-w-0">
                  <MapPin size={13} color="var(--gray-10)" className="shrink-0" />
                  <Text size="1" color="gray" className="truncate">
                    {location}
                  </Text>
                </Flex>
              )
            )}

            {!profile.hidden.education && latestEducation && (
              <Flex align="center" gap="1" className="min-w-0">
                <GraduationCap
                  size={13}
                  color="var(--gray-10)"
                  className="shrink-0"
                />
                <Text size="1" color="gray" className="truncate">
                  {[latestEducation.degree, latestEducation.institution]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Flex>
            )}

            <Link
              href={`/${encodeURIComponent(profile.publicId)}`}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-11)] hover:underline"
            >
              <ExternalLink size={12} />
              View full profile
            </Link>
          </Flex>
        )}
      </HoverCard.Content>
    </HoverCard.Root>
  );
};

export default ProfileHoverCard;
