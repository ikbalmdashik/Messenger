"use client";

import React from "react";

import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";

/**
 * One settings block: title, optional description,
 * optional right-aligned action, then content.
 */
export const SettingsCard = ({
  title,
  description,
  action,
  children,
  danger = false,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  danger?: boolean;
}) => (
  <Card size="3" className={danger ? "border border-red-500/30" : undefined}>
    <Flex align="start" justify="between" gap="3" mb={children ? "4" : "0"}>
      <Box className="min-w-0">
        <Heading size="3" color={danger ? "red" : undefined}>
          {title}
        </Heading>

        {description && (
          <Text size="2" color="gray" as="p" mt="1">
            {description}
          </Text>
        )}
      </Box>

      {action && <Box className="shrink-0">{action}</Box>}
    </Flex>

    {children}
  </Card>
);

/**
 * Label on the left, control on the right; stacks
 * on narrow screens.
 */
export const SettingRow = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <Flex
    direction={{ initial: "column", sm: "row" }}
    align={{ initial: "start", sm: "center" }}
    justify="between"
    gap="2"
    py="2"
  >
    <Box className="min-w-0">
      <Text size="2" weight="medium" as="div">
        {label}
      </Text>
      {hint && (
        <Text size="1" color="gray" as="div">
          {hint}
        </Text>
      )}
    </Box>

    <Box className="shrink-0">{children}</Box>
  </Flex>
);

export const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="flex min-w-0 flex-1 flex-col gap-1">
    <Text size="1" weight="medium" color="gray">
      {label}
    </Text>
    {children}
  </label>
);

export const Muted = ({ children }: { children: React.ReactNode }) => (
  <Text size="2" color="gray">
    {children}
  </Text>
);
