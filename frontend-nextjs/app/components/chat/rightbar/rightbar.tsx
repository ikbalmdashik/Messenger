"use client";

import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import {
  Avatar,
  Box,
  Flex,
  IconButton,
  ScrollArea,
  Separator,
  Text,
} from "@radix-ui/themes";

import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Globe,
  GraduationCap,
  Info,
  Link2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  TimerOff,
  TimerReset,
  Trash2,
  UserRound,
} from "lucide-react";

import API_ENDPOINTS, {
  BlockStatus,
  DirectSuspensionStatus,
  GetUserByPublicIdResponse,
} from "@/app/routes/api";
import { getErrorMessage } from "@/app/lib/apiError";
import {
  BLOCK_UPDATED_EVENT,
  SUSPENSION_UPDATED_EVENT,
} from "@/app/lib/chatEvents";
import { activeUntil, formatUntil } from "@/app/lib/suspension";
import SuspendDialog from "../shared/SuspendDialog";
import useConfirm from "../../shared/useConfirm";
import { HighlightAction, Section } from "../shared/PanelParts";


import {
  formatLocation,
  formatYears,
  initialsOf,
  prettyUrl,
} from "@/app/lib/profile";

interface RightbarProps {
  receiverId: number | null;

  publicId?: string | null;

  /** For "Delete chat". */
  conversationId?: number | null;

  /** Mobile only: back to the chat. */
  onBack?: () => void;
}


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
  conversationId = null,
  onBack,
}) => {
  const [profile, setProfile] =
    useState<GetUserByPublicIdResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [busy, setBusy] = useState<
    "block" | "delete" | "suspend" | null
  >(null);

  const [suspension, setSuspension] =
    useState<DirectSuspensionStatus | null>(null);

  const [suspendOpen, setSuspendOpen] = useState(false);

  // Bumped to re-read the profile (e.g. after a block
  // change, which can hide private details).
  const [version, setVersion] = useState(0);

  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    const handleBlockUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: number }>).detail;

      if (Number(detail?.userId) === Number(receiverId)) {
        setVersion((value) => value + 1);
      }
    };

    window.addEventListener(BLOCK_UPDATED_EVENT, handleBlockUpdated);

    return () => {
      window.removeEventListener(BLOCK_UPDATED_EVENT, handleBlockUpdated);
    };
  }, [receiverId]);

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
  }, [publicId, version]);

  const toggleBlock = useCallback(async () => {
    if (!profile) {
      return;
    }

    const blocking = !profile.blockedByMe;

    const ok = await confirm(
      blocking
        ? {
            title: `Block ${profile.fullName}?`,
            consequences: [
              "Neither of you can message the other.",
              "They can't add you to groups or see your private details.",
              "Your chat history stays; you can unblock any time.",
            ],
            confirmLabel: "Block",
            danger: true,
          }
        : {
            title: `Unblock ${profile.fullName}?`,
            consequences: [
              "You can message each other again.",
              "Your privacy settings apply to them as usual.",
            ],
            confirmLabel: "Unblock",
          },
    );

    if (!ok) {
      return;
    }

    try {
      setBusy("block");

      const response = await axios.post<BlockStatus>(
        blocking ? API_ENDPOINTS.BlockUser : API_ENDPOINTS.UnblockUser,
        { userId: profile.userId },
        { withCredentials: true },
      );

      setProfile((current) =>
        current ? { ...current, ...response.data } : current,
      );

      toast.success(
        blocking
          ? `${profile.fullName} is blocked.`
          : `${profile.fullName} is unblocked.`,
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, blocking ? "Couldn't block." : "Couldn't unblock."),
      );
    } finally {
      setBusy(null);
    }
  }, [profile, confirm]);

  /* Suspension status of this direct chat. */
  useEffect(() => {
    setSuspension(null);

    const id = Number(conversationId);

    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    let cancelled = false;

    const load = () => {
      axios
        .post<DirectSuspensionStatus>(
          API_ENDPOINTS.SuspensionStatus,
          { conversationId: id },
          { withCredentials: true },
        )
        .then((response) => {
          if (!cancelled) {
            setSuspension(response.data ?? null);
          }
        })
        .catch(() => undefined);
    };

    load();

    const handleUpdated = (event: Event) => {
      const detail = (
        event as CustomEvent<{ conversationId: number }>
      ).detail;

      if (Number(detail?.conversationId) === id) {
        load();
      }
    };

    window.addEventListener(SUSPENSION_UPDATED_EVENT, handleUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(SUSPENSION_UPDATED_EVENT, handleUpdated);
    };
  }, [conversationId]);

  const theirSuspendedUntil = activeUntil(
    suspension?.theirSuspendedUntil,
  );

  const changeSuspension = useCallback(
    async (minutes: number | null | "lift") => {
      const id = Number(conversationId);

      if (!Number.isFinite(id) || id <= 0) {
        return;
      }

      const lifting = minutes === "lift";

      if (
        lifting &&
        !(await confirm({
          title: `Lift ${profile?.fullName ?? "their"} suspension?`,
          consequences: ["They can send you messages again right away."],
          confirmLabel: "Lift suspension",
        }))
      ) {
        return;
      }

      try {
        setBusy("suspend");

        const response = await axios.post<DirectSuspensionStatus>(
          lifting ? API_ENDPOINTS.UnsuspendDirect : API_ENDPOINTS.SuspendDirect,
          lifting
            ? { conversationId: id }
            : { conversationId: id, durationMinutes: minutes },
          { withCredentials: true },
        );

        setSuspension(response.data);
        setSuspendOpen(false);

        window.dispatchEvent(
          new CustomEvent(SUSPENSION_UPDATED_EVENT, {
            detail: { conversationId: id },
          }),
        );

        toast.success(
          lifting
            ? `${profile?.fullName ?? "They"} can send messages again.`
            : `${profile?.fullName ?? "They"} is suspended.`,
        );
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            lifting ? "Couldn't lift the suspension." : "Couldn't suspend.",
          ),
        );
      } finally {
        setBusy(null);
      }
    },
    [conversationId, profile?.fullName, confirm],
  );

  /**
   * Delete for me. The server's "conversation_deleted"
   * event closes the chat.
   */
  const deleteChat = useCallback(async () => {
    const id = Number(conversationId);

    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    const ok = await confirm({
      title: "Delete this chat?",
      consequences: [
        "All messages are removed for you.",
        `${profile?.fullName ?? "The other person"} keeps their copy.`,
      ],
      confirmLabel: "Delete chat",
      danger: true,
    });

    if (!ok) {
      return;
    }

    try {
      setBusy("delete");

      await axios.post(
        API_ENDPOINTS.DeleteChat,
        { conversationId: id },
        { withCredentials: true },
      );

      toast.success("Chat deleted.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't delete the chat."));
    } finally {
      setBusy(null);
    }
  }, [conversationId, profile?.fullName, confirm]);

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

              {theirSuspendedUntil && (
                <Flex align="center" gap="1">
                  <TimerOff size={12} className="text-amber-500" />
                  <Text size="1" color="amber">
                    Suspended {formatUntil(theirSuspendedUntil)}
                  </Text>
                </Flex>
              )}

              {location && (
                <Flex align="center" gap="1">
                  <MapPin size={13} color="var(--gray-10)" />
                  <Text size="1" color="gray">
                    {location}
                  </Text>
                </Flex>
              )}

            </Flex>

            {/* HIGHLIGHTED ACTIONS */}

            <Flex gap="1">
              <HighlightAction
                icon={<UserRound size={18} />}
                label="Profile"
                href={`/${encodeURIComponent(profile.publicId)}`}
              />

              <HighlightAction
                icon={
                  profile.blockedByMe ? (
                    <ShieldCheck size={18} />
                  ) : (
                    <Ban size={18} />
                  )
                }
                label={
                  busy === "block"
                    ? "…"
                    : profile.blockedByMe
                      ? "Unblock"
                      : "Block"
                }
                danger={!profile.blockedByMe}
                disabled={busy !== null}
                onClick={() => void toggleBlock()}
              />

              <HighlightAction
                icon={
                  theirSuspendedUntil ? (
                    <TimerReset size={18} />
                  ) : (
                    <TimerOff size={18} />
                  )
                }
                label={
                  busy === "suspend"
                    ? "…"
                    : theirSuspendedUntil
                      ? "Unsuspend"
                      : "Suspend"
                }
                disabled={
                  busy !== null ||
                  !conversationId ||
                  profile.blockedByMe ||
                  profile.blockedMe
                }
                title={
                  theirSuspendedUntil
                    ? "Let them send messages again"
                    : "Stop them from messaging you for a while"
                }
                onClick={() =>
                  theirSuspendedUntil
                    ? void changeSuspension("lift")
                    : setSuspendOpen(true)
                }
              />

              <HighlightAction
                icon={<Trash2 size={18} />}
                label={busy === "delete" ? "…" : "Delete chat"}
                danger
                disabled={busy !== null || !conversationId}
                onClick={() => void deleteChat()}
              />
            </Flex>

            <Separator size="4" />

            {/* CONTACT */}

            <Section
              icon={<Phone size={15} />}
              title="Contact info"
              defaultOpen
            >

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
            </Section>

            {/* EDUCATION */}

            <Section
              icon={<GraduationCap size={15} />}
              title="Education"
            >

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
            </Section>

            {/* LOCATION */}

            <Section icon={<MapPin size={15} />} title="Location">
              {profile.hidden.location ? (
                <PrivateNote />
              ) : location ? (
                <Text size="2">{location}</Text>
              ) : (
                <Text size="1" color="gray">
                  Nothing shared.
                </Text>
              )}
            </Section>
          </Flex>
        )}
      </ScrollArea>

      {confirmDialog}

      <SuspendDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        targetLabel={profile?.fullName ?? "this person"}
        description="They can still read this chat but can't send you messages until the suspension ends or you lift it."
        busy={busy === "suspend"}
        onConfirm={(minutes) => void changeSuspension(minutes)}
      />
    </Flex>
  );
};

export default Rightbar;
