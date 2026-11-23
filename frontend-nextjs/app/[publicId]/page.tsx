"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  ArrowLeft,
  BadgeCheck,
  Globe,
  GraduationCap,
  Link2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";

import API_ENDPOINTS, {
  GetUserByPublicIdResponse,
} from "../routes/api";
import Routes from "../routes/routes";
import {
  getErrorMessage,
  PENDING_CONVERSATION_KEY,
} from "../lib/apiError";
import {
  formatLocation,
  formatYears,
  initialsOf,
  prettyUrl,
  visibilityLabel,
} from "../lib/profile";
import useSessionEvents from "@/app/lib/useSessionEvents";
import useConfirm from "../components/shared/useConfirm";

/* ============================================================
   SMALL PIECES
============================================================ */

const SectionTitle = ({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  note?: string;
}) => (
  <Flex align="center" justify="between" gap="2" mb="3">
    <Flex align="center" gap="2">
      <span className="text-[var(--gray-11)]">{icon}</span>
      <Heading size="3">{title}</Heading>
    </Flex>

    {note && (
      <Badge variant="soft" color="gray">
        {note}
      </Badge>
    )}
  </Flex>
);

const HiddenNotice = () => (
  <Flex align="center" gap="2">
    <Lock size={14} color="var(--gray-10)" />
    <Text size="2" color="gray">
      This person keeps this private.
    </Text>
  </Flex>
);

const ContactRow = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Flex align="center" gap="3">
    <span className="shrink-0 text-[var(--gray-10)]">{icon}</span>
    <Box className="min-w-0 flex-1 truncate text-sm">{children}</Box>
  </Flex>
);

/* ============================================================
   PAGE
============================================================ */

export default function PublicProfile() {
  const params = useParams<{ publicId: string }>();
  const publicId = decodeURIComponent(params.publicId ?? "");
  const router = useRouter();

  const [user, setUser] = useState<GetUserByPublicIdResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewerId, setViewerId] = useState<number | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState("");

  const loadViewer = useCallback(() => {
    axios
      .post(API_ENDPOINTS.GetUserByToken, {}, { withCredentials: true })
      .then((response) => {
        const id = Number(response.data?.userId);
        setViewerId(Number.isFinite(id) ? id : null);
      })
      .catch(() => setViewerId(null));
  }, []);

  useEffect(() => {
    loadViewer();
  }, [loadViewer]);

  /**
   * quiet: refresh in place (no "Loading…" flash),
   * e.g. after the viewer was signed out.
   */
  const loadProfile = useCallback(
    async (quiet = false) => {
      if (!publicId) {
        return;
      }

      try {
        if (!quiet) setLoading(true);
        setError("");

        const response = await axios.post<GetUserByPublicIdResponse | null>(
          API_ENDPOINTS.GetUserByPublicId,
          { publicId },
          { withCredentials: true },
        );

        if (!response.data) {
          setError("This profile doesn't exist.");
        }

        setUser(response.data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Unable to load this profile.");
      } finally {
        setLoading(false);
      }
    },
    [publicId],
  );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /*
   * Live: the viewer's session was signed out (another
   * tab or device). The server now treats this page as
   * anonymous, so reload it as the public view: private
   * sections, owner tools and Message/Block go away.
   */
  useSessionEvents({
    onRevoked: () => {
      setViewerId(null);
      setMessageError("");
      void loadProfile(true);
    },
  });

  const goBack = () =>
    window.history.length > 1 ? router.back() : router.push(Routes.Chat);

  const [blockBusy, setBlockBusy] = useState(false);

  const { confirm, confirmDialog } = useConfirm();

  const toggleBlock = async (block: boolean) => {
    if (!user) {
      return;
    }

    const ok = await confirm(
      block
        ? {
            title: `Block ${user.fullName}?`,
            consequences: [
              "Neither of you can message the other.",
              "They can't add you to groups or see your private details.",
              "You can unblock any time from Settings → Blocked.",
            ],
            confirmLabel: "Block",
            danger: true,
          }
        : {
            title: `Unblock ${user.fullName}?`,
            consequences: ["You can message each other again."],
            confirmLabel: "Unblock",
          },
    );

    if (!ok) {
      return;
    }

    try {
      setBlockBusy(true);
      setMessageError("");

      const response = await axios.post<{
        blockedByMe: boolean;
        blockedMe: boolean;
      }>(
        block ? API_ENDPOINTS.BlockUser : API_ENDPOINTS.UnblockUser,
        { userId: user.userId },
        { withCredentials: true },
      );

      setUser({ ...user, ...response.data });
    } catch (err) {
      setMessageError(
        getErrorMessage(err, block ? "Couldn't block." : "Couldn't unblock."),
      );
    } finally {
      setBlockBusy(false);
    }
  };

  const handleMessage = async () => {
    if (!user) {
      return;
    }

    if (viewerId === null) {
      router.push(Routes.Login);
      return;
    }

    try {
      setMessageLoading(true);
      setMessageError("");

      const response = await axios.post(
        API_ENDPOINTS.CreateConversation,
        { userId: user.userId },
        { withCredentials: true },
      );

      const conversationId = Number(response.data?.conversationId);

      if (Number.isFinite(conversationId)) {
        try {
          sessionStorage.setItem(
            PENDING_CONVERSATION_KEY,
            String(conversationId),
          );
        } catch {
          // Storage unavailable: chat just opens normally.
        }
      }

      router.push(Routes.Chat);
    } catch (err) {
      setMessageError(getErrorMessage(err, "Couldn't start a conversation."));
    } finally {
      setMessageLoading(false);
    }
  };

  /* ----------------------------------------------------------
     Loading / not found
  ---------------------------------------------------------- */

  if (loading) {
    return (
      <Container size="2" px="4" py="8">
        <Card size="3">
          <Flex direction="column" align="center" gap="3">
            <Skeleton width="96px" height="96px" style={{ borderRadius: "50%" }} />
            <Skeleton width="180px" height="24px" />
            <Skeleton width="120px" height="16px" />
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
        <UserRound size={40} color="var(--gray-9)" />
        <Heading size="5">User not found</Heading>
        <Text color="gray" size="2">
          {error || "This profile may no longer be available."}
        </Text>
        <Button variant="soft" onClick={goBack}>
          Go back
        </Button>
      </Flex>
    );
  }

  /* ----------------------------------------------------------
     Profile
  ---------------------------------------------------------- */

  const location = formatLocation(user.location);
  const education = user.education ?? [];
  const socials = user.contact?.socials ?? [];
  const website = user.contact?.website;

  const hasContact =
    Boolean(user.email) || Boolean(user.phone) || Boolean(website) || socials.length > 0;

  const ownerNote = (key: "contact" | "education" | "location") =>
    user.isOwner && user.privacy
      ? `Visible to: ${visibilityLabel(user.privacy[key])}`
      : undefined;

  return (
    <Container size="2" px="4" py={{ initial: "4", sm: "7" }}>
      {confirmDialog}

      <Flex direction="column" gap="4">
        <Flex>
          <Button variant="ghost" color="gray" onClick={goBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
        </Flex>

        {/* HEADER */}

        <Card size="3">
          <Flex
            direction={{ initial: "column", sm: "row" }}
            align="center"
            gap="4"
          >
            <Avatar
              size="7"
              radius="full"
              color="indigo"
              variant="soft"
              fallback={initialsOf(user.fullName)}
            />

            <Flex
              direction="column"
              gap="1"
              align={{ initial: "center", sm: "start" }}
              className="min-w-0 flex-1"
            >
              <Flex align="center" gap="2">
                <Heading size="6" className="truncate">
                  {user.fullName}
                </Heading>

                {user.isEmailVerified && (
                  <BadgeCheck
                    size={20}
                    className="shrink-0 text-emerald-500"
                    aria-label="Verified"
                  />
                )}
              </Flex>

              <Text color="gray" size="2">
                @{user.publicId}
              </Text>

              {location && (
                <Flex align="center" gap="1">
                  <MapPin size={14} color="var(--gray-10)" />
                  <Text size="2" color="gray">
                    {location}
                  </Text>
                </Flex>
              )}
            </Flex>

            <Flex direction="column" align="center" gap="1" className="shrink-0">
              {user.isOwner ? (
                <Button variant="soft" asChild>
                  <Link href={`${Routes.Settings}?tab=profile`}>
                    <Pencil size={15} />
                    Edit profile
                  </Link>
                </Button>
              ) : user.blockedByMe ? (
                <Button
                  variant="soft"
                  color="gray"
                  onClick={() => toggleBlock(false)}
                  loading={blockBusy}
                >
                  Unblock
                </Button>
              ) : user.blockedMe ? null : (
                // Blocking lives in the chat's profile panel.
                <Button onClick={handleMessage} loading={messageLoading}>
                  <MessageCircle size={16} />
                  {viewerId === null ? "Log in to message" : "Message"}
                </Button>
              )}

              {messageError && (
                <Text size="1" color="red">
                  {messageError}
                </Text>
              )}
            </Flex>
          </Flex>
        </Card>

        {/* CONTACT */}

        <Card size="3">
          <SectionTitle
            icon={<Phone size={17} />}
            title="Contact"
            note={ownerNote("contact")}
          />

          {user.hidden.contact ? (
            <HiddenNotice />
          ) : !hasContact ? (
            <Text size="2" color="gray">
              No contact details added.
            </Text>
          ) : (
            <Flex direction="column" gap="3">
              {user.email && (
                <ContactRow icon={<Mail size={16} />}>
                  <a href={`mailto:${user.email}`} className="hover:underline">
                    {user.email}
                  </a>
                </ContactRow>
              )}

              {user.phone && (
                <ContactRow icon={<Phone size={16} />}>
                  <a href={`tel:${user.phone}`} className="hover:underline">
                    {user.phone}
                  </a>
                </ContactRow>
              )}

              {website && (
                <ContactRow icon={<Globe size={16} />}>
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[var(--accent-11)] hover:underline"
                  >
                    {prettyUrl(website)}
                  </a>
                </ContactRow>
              )}

              {socials.map((social) => (
                <ContactRow
                  key={`${social.platform}-${social.url}`}
                  icon={<Link2 size={16} />}
                >
                  <Text color="gray">{social.platform} · </Text>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[var(--accent-11)] hover:underline"
                  >
                    {prettyUrl(social.url)}
                  </a>
                </ContactRow>
              ))}
            </Flex>
          )}
        </Card>

        {/* EDUCATION */}

        <Card size="3">
          <SectionTitle
            icon={<GraduationCap size={17} />}
            title="Education"
            note={ownerNote("education")}
          />

          {user.hidden.education ? (
            <HiddenNotice />
          ) : education.length === 0 ? (
            <Text size="2" color="gray">
              No education added.
            </Text>
          ) : (
            <Flex direction="column" gap="3">
              {education.map((item, index) => {
                const years = formatYears(item.startYear, item.endYear, item.current);

                const subtitle = [item.degree, item.fieldOfStudy]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Box key={`${item.institution}-${index}`}>
                    {index > 0 && <Separator size="4" mb="3" />}

                    <Flex justify="between" gap="3">
                      <Box className="min-w-0">
                        <Text size="2" weight="bold" as="div">
                          {item.institution}
                        </Text>

                        {subtitle && (
                          <Text size="2" color="gray" as="div">
                            {subtitle}
                          </Text>
                        )}
                      </Box>

                      {years && (
                        <Text size="1" color="gray" className="shrink-0">
                          {years}
                        </Text>
                      )}
                    </Flex>

                    {item.description && (
                      <Text
                        size="2"
                        as="p"
                        mt="1"
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {item.description}
                      </Text>
                    )}
                  </Box>
                );
              })}
            </Flex>
          )}
        </Card>
      </Flex>
    </Container>
  );
}
