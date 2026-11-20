"use client";

import React, { useEffect, useState } from "react";

import axios from "axios";
import Link from "next/link";

import {
  Avatar,
  Box,
  Button,
  Flex,
  IconButton,
  ScrollArea,
  Separator,
  Text,
} from "@radix-ui/themes";

import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Globe,
  GraduationCap,
  Info,
  Link2,
  Lock,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import API_ENDPOINTS, {
  GetUserByPublicIdResponse,
} from "@/app/routes/api";


import {
  formatLocation,
  formatYears,
  initialsOf,
  prettyUrl,
} from "@/app/lib/profile";

interface RightbarProps {
  receiverId: number | null;

  publicId?: string | null;

  onBack?: () => void;
}

const SectionTitle = ({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) => (
  <Flex align="center" gap="2" mb="2">
    <span className="text-[var(--gray-11)]">{icon}</span>
    <Text size="2" weight="bold">
      {title}
    </Text>
  </Flex>
);

const Row = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Flex align="center" gap="2" className="min-w-0 py-0.5">
    <span className="shrink-0 text-[var(--gray-10)]">{icon}</span>
    <Box className="min-w-0 flex-1 truncate text-sm">{children}</Box>
  </Flex>
);

const PrivateNote = () => (
  <Flex align="center" gap="2">
    <Lock size={13} color="var(--gray-10)" />
    <Text size="1" color="gray">
      Private
    </Text>
  </Flex>
);

const Rightbar: React.FC<RightbarProps> = ({
  receiverId,
  publicId = null,
  onBack,
}) => {
  const [profile, setProfile] =
    useState<GetUserByPublicIdResponse | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicId) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    setLoading(true);

    axios
      .post<GetUserByPublicIdResponse | null>(
        API_ENDPOINTS.GetUserByPublicId,
        { publicId },
        { withCredentials: true },
      )
      .then((response) => {
        if (!cancelled) {
          setProfile(response.data ?? null);
        }
      })
      .catch((error) => {
        console.log("Failed to load profile:", error);

        if (!cancelled) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicId]);

  if (!receiverId) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="2"
        className="h-full p-6 text-center"
      >
        <Info className="h-7 w-7 text-[var(--gray-9)]" />
        <Text size="2" color="gray">
          Select a chat to see who you&apos;re talking to.
        </Text>
      </Flex>
    );
  }

  const location = formatLocation(profile?.location);
  const education = profile?.education ?? [];
  const socials = profile?.contact?.socials ?? [];
  const website = profile?.contact?.website;

  const hasContact =
    Boolean(profile?.email) ||
    Boolean(profile?.phone) ||
    Boolean(website) ||
    socials.length > 0;

  return (
    <Flex direction="column" className="h-full w-full">
      {onBack && (
        <Flex
          align="center"
          gap="2"
          className="h-14 shrink-0 border-b border-[var(--gray-a4)] px-3 md:hidden"
        >
          <IconButton
            variant="ghost"
            color="gray"
            radius="full"
            aria-label="Back to chat"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </IconButton>

          <Text size="3" weight="bold">
            Profile
          </Text>
        </Flex>
      )}

      <ScrollArea type="hover" scrollbars="vertical" className="min-h-0 flex-1">
        {loading && !profile ? (
          <Box p="4">
            <Text size="2" color="gray">
              Loading…
            </Text>
          </Box>
        ) : !profile ? (
          <Box p="4">
            <Text size="2" color="gray">
              Profile unavailable.
            </Text>
          </Box>
        ) : (
          <Flex direction="column" gap="4" p="4">
            {/* IDENTITY */}

            <Flex direction="column" align="center" gap="1" className="text-center">
              <Avatar
                size="6"
                radius="full"
                color="sky"
                variant="soft"
                fallback={initialsOf(profile.fullName)}
                mb="2"
              />

              <Flex align="center" gap="1">
                <Text size="4" weight="bold">
                  {profile.fullName}
                </Text>

                {profile.isEmailVerified && (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 text-emerald-500"
                    aria-label="Verified"
                  />
                )}
              </Flex>

              <Text size="2" color="gray">
                @{profile.publicId}
              </Text>

              {(profile.blockedByMe || profile.blockedMe) && (
                <Text size="1" color="red">
                  {profile.blockedByMe ? "You blocked this person" : "Unavailable"}
                </Text>
              )}

              {location && (
                <Flex align="center" gap="1">
                  <MapPin size={13} color="var(--gray-10)" />
                  <Text size="1" color="gray">
                    {location}
                  </Text>
                </Flex>
              )}

              <Button variant="soft" size="2" mt="2" asChild>
                <Link href={`/${encodeURIComponent(profile.publicId)}`}>
                  <ExternalLink size={14} />
                  View full profile
                </Link>
              </Button>
            </Flex>

            <Separator size="4" />

            {/* CONTACT */}

            <Box>
              <SectionTitle icon={<Phone size={15} />} title="Contact" />

              {profile.hidden.contact ? (
                <PrivateNote />
              ) : !hasContact ? (
                <Text size="1" color="gray">
                  Nothing shared.
                </Text>
              ) : (
                <Flex direction="column" gap="1">
                  {profile.email && (
                    <Row icon={<Mail size={14} />}>
                      <a href={`mailto:${profile.email}`} className="hover:underline">
                        {profile.email}
                      </a>
                    </Row>
                  )}

                  {profile.phone && (
                    <Row icon={<Phone size={14} />}>
                      <a href={`tel:${profile.phone}`} className="hover:underline">
                        {profile.phone}
                      </a>
                    </Row>
                  )}

                  {website && (
                    <Row icon={<Globe size={14} />}>
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[var(--accent-11)] hover:underline"
                      >
                        {prettyUrl(website)}
                      </a>
                    </Row>
                  )}

                  {socials.map((social) => (
                    <Row
                      key={`${social.platform}-${social.url}`}
                      icon={<Link2 size={14} />}
                    >
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[var(--accent-11)] hover:underline"
                      >
                        {social.platform}
                      </a>
                    </Row>
                  ))}
                </Flex>
              )}
            </Box>

            <Separator size="4" />

            {/* EDUCATION */}

            <Box>
              <SectionTitle
                icon={<GraduationCap size={15} />}
                title="Education"
              />

              {profile.hidden.education ? (
                <PrivateNote />
              ) : education.length === 0 ? (
                <Text size="1" color="gray">
                  Nothing shared.
                </Text>
              ) : (
                <Flex direction="column" gap="2">
                  {education.map((item, index) => {
                    const years = formatYears(
                      item.startYear,
                      item.endYear,
                      item.current,
                    );

                    return (
                      <Box key={`${item.institution}-${index}`}>
                        <Text size="2" weight="medium" as="div">
                          {item.institution}
                        </Text>

                        <Text size="1" color="gray" as="div">
                          {[item.degree, item.fieldOfStudy, years]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </Box>
                    );
                  })}
                </Flex>
              )}
            </Box>
          </Flex>
        )}
      </ScrollArea>
    </Flex>
  );
};

export default Rightbar;
