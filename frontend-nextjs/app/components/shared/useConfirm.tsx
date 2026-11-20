"use client";

import React, { useCallback, useRef, useState } from "react";

import { AlertDialog, Box, Button, Flex, Text } from "@radix-ui/themes";

import { ArrowRight } from "lucide-react";

/**
 * One changed value shown as "Label: before → after".
 */
export interface ChangeItem {
  label: string;
  from: string;
  to: string;
}

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;

  /** Field-by-field changes (edits). */
  changes?: ChangeItem[];

  /** What will happen (destructive actions). */
  consequences?: string[];

  confirmLabel?: string;
  danger?: boolean;
}

const EMPTY = "Not set";

const show = (value: string) => (value.trim() ? value : EMPTY);

/**
 * Build a ChangeItem only when the value changed.
 */
export const changed = (
  label: string,
  from: string | number | null | undefined,
  to: string | number | null | undefined,
): ChangeItem[] => {
  const before = show(String(from ?? ""));
  const after = show(String(to ?? ""));

  return before === after ? [] : [{ label, from: before, to: after }];
};

/**
 * Promise-based confirmation dialog.
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title, changes }))) return;
 *   ...
 *   return <>{confirmDialog}</>;
 */
export const useConfirm = () => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolverRef.current?.(false);

    setOptions(next);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const confirmDialog = (
    <AlertDialog.Root
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) {
          settle(false);
        }
      }}
    >
      <AlertDialog.Content maxWidth="460px">
        <AlertDialog.Title>{options?.title}</AlertDialog.Title>

        {options?.description && (
          <AlertDialog.Description size="2" color="gray">
            {options.description}
          </AlertDialog.Description>
        )}

        {options?.changes && options.changes.length > 0 && (
          <Box
            mt="3"
            className="max-h-72 overflow-y-auto rounded-md border border-[var(--gray-a4)]"
          >
            {options.changes.map((change, index) => (
              <Box
                key={`${change.label}-${index}`}
                px="3"
                py="2"
                className={
                  index > 0 ? "border-t border-[var(--gray-a3)]" : undefined
                }
              >
                <Text size="1" weight="bold" color="gray" as="div">
                  {change.label}
                </Text>

                <Flex align="center" gap="2" wrap="wrap">
                  <Text
                    size="2"
                    color="gray"
                    className={
                      change.from === EMPTY ? "italic" : "line-through"
                    }
                  >
                    {change.from}
                  </Text>
                  <ArrowRight size={13} className="shrink-0 text-[var(--gray-9)]" />
                  <Text
                    size="2"
                    weight="medium"
                    className={change.to === EMPTY ? "italic" : undefined}
                  >
                    {change.to}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Box>
        )}

        {options?.consequences && options.consequences.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {options.consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        <Flex gap="3" mt="4" justify="end">
          <Button variant="soft" color="gray" onClick={() => settle(false)}>
            Cancel
          </Button>

          <Button
            color={options?.danger ? "red" : undefined}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? "Confirm"}
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );

  return { confirm, confirmDialog };
};

export default useConfirm;
