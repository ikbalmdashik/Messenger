"use client";

import React, { useEffect, useState } from "react";

import { AlertDialog, Button, Flex, Text } from "@radix-ui/themes";

import { Clock, Infinity as InfinityIcon, TimerOff } from "lucide-react";

import { SUSPENSION_OPTIONS } from "@/app/lib/suspension";

interface SuspendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Who is being suspended, e.g. "Alex" or "3 members". */
  targetLabel: string;

  /** Extra line under the title. */
  description?: React.ReactNode;

  busy?: boolean;

  /** minutes: null = until lifted. */
  onConfirm: (minutes: number | null) => void;
}

/**
 * Pick how long someone can't send messages.
 */
const SuspendDialog: React.FC<SuspendDialogProps> = ({
  open,
  onOpenChange,
  targetLabel,
  description,
  busy = false,
  onConfirm,
}) => {
  // Index into SUSPENSION_OPTIONS; default 1 hour.
  const [choice, setChoice] = useState(1);

  useEffect(() => {
    if (open) {
      setChoice(1);
    }
  }, [open]);

  const selected = SUSPENSION_OPTIONS[choice];

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth="420px">
        <AlertDialog.Title>
          <Flex align="center" gap="2">
            <TimerOff size={18} className="text-amber-500" />
            Suspend {targetLabel}?
          </Flex>
        </AlertDialog.Title>

        <AlertDialog.Description size="2" color="gray">
          {description ??
            "They can still read the chat but can't send messages until the suspension ends or you lift it."}
        </AlertDialog.Description>

        <Text as="div" size="1" weight="medium" color="gray" mt="4" mb="2">
          Duration
        </Text>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUSPENSION_OPTIONS.map((option, index) => {
            const active = index === choice;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => setChoice(index)}
                aria-pressed={active}
                className={`
                  flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-2
                  text-left text-sm transition-colors
                  ${
                    active
                      ? "border-[var(--accent-8)] bg-[var(--accent-a3)] text-[var(--accent-11)]"
                      : "border-[var(--gray-a5)] hover:bg-[var(--gray-a3)]"
                  }
                  ${option.minutes === null ? "col-span-2 sm:col-span-3" : ""}
                `}
              >
                {option.minutes === null ? (
                  <InfinityIcon size={14} className="shrink-0" />
                ) : (
                  <Clock size={14} className="shrink-0" />
                )}
                {option.label}
              </button>
            );
          })}
        </div>

        <Flex gap="3" mt="5" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray" disabled={busy}>
              Cancel
            </Button>
          </AlertDialog.Cancel>

          <Button
            color="amber"
            loading={busy}
            onClick={() => onConfirm(selected.minutes)}
          >
            <TimerOff size={15} />
            Suspend
            {selected.minutes === null ? "" : ` for ${selected.label}`}
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};

export default SuspendDialog;
