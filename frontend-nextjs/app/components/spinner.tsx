"use client";

import React from "react";
import { Flex, Spinner, Text } from "@radix-ui/themes";

interface FullScreenSpinnerProps {
  /** Size of the Radix Spinner: "1" | "2" | "3" */
  size?: "1" | "2" | "3";
  /** Optional loading message displayed under the spinner */
  label?: string;
}

export const FullScreenSpinner: React.FC<FullScreenSpinnerProps> = ({
  size = "3",
  label,
}) => {
  return (
    <Flex
      align="center"
      justify="center"
      direction="column"
      gap="3"
      className="
        fixed
        inset-0
        z-50
        h-screen
        w-screen
        backdrop-blur
      "
    >
      <Spinner size={size} />

      {label && (
        <Text
          size="2"
          weight="medium"
          className="text-slate-600 dark:text-slate-300 animate-pulse"
        >
          {label}
        </Text>
      )}
    </Flex>
  );
};

export default FullScreenSpinner;