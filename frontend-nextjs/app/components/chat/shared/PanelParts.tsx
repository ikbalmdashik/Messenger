"use client";

import React, { useState } from "react";

import Link from "next/link";

import { Box, Flex, Text } from "@radix-ui/themes";

import { ChevronDown } from "lucide-react";

/*
 * Building blocks shared by the chat's right-hand
 * panels (direct-chat profile and group info).
 */

/**
 * Collapsible details section ("dropdown").
 */
export const Section = ({
  icon,
  title,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  defaultOpen?: boolean;
  /** Optional controlled state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Shown at the right of the header when open. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);

  const open = controlledOpen ?? innerOpen;

  const setOpen = (update: (current: boolean) => boolean) => {
    const next = update(open);
    setInnerOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Box className="rounded-lg border border-[var(--gray-a4)]">
      <Flex align="center" pr={action && open ? "2" : "0"}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--gray-a3)]"
      >
        <span className="text-[var(--gray-11)]">{icon}</span>
        <Text size="2" weight="bold" className="flex-1">
          {title}
        </Text>
        <ChevronDown
          size={16}
          className={`text-[var(--gray-10)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {action && open && <Box className="shrink-0">{action}</Box>}
      </Flex>

      {open && <Box px="3" pb="3">{children}</Box>}
    </Box>
  );
};

/**
 * One of the three highlighted actions under the name.
 */
export const HighlightAction = ({
  icon,
  label,
  danger = false,
  disabled = false,
  title,
  onClick,
  href,
}: {
  title?: string;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}) => {
  const className = `flex flex-1 min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-colors hover:bg-[var(--gray-a3)] disabled:cursor-not-allowed disabled:opacity-50 ${
    danger ? "text-[var(--red-11)]" : "text-[var(--gray-12)]"
  }`;

  const content = (
    <>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          danger ? "bg-[var(--red-a3)]" : "bg-[var(--accent-a3)] text-[var(--accent-11)]"
        }`}
      >
        {icon}
      </span>
      <span className="w-full truncate text-xs font-medium">{label}</span>
    </>
  );

  return href ? (
    <Link href={href} className={className} title={title}>
      {content}
    </Link>
  ) : (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {content}
    </button>
  );
};
