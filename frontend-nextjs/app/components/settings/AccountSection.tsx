"use client";

import React, { useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import { Badge, Button, Separator } from "@radix-ui/themes";

import { LogOut } from "lucide-react";

import API_ENDPOINTS, { MyProfile } from "@/app/routes/api";
import { getErrorMessage } from "@/app/lib/apiError";
import { logoutAndRedirect, signedOutRedirect } from "@/app/lib/session";

import { ConfirmOptions } from "../shared/useConfirm";
import { SettingRow, SettingsCard } from "./ui";

interface AccountSectionProps {
  profile: MyProfile;
  onProfileChange: (profile: MyProfile) => void;
  protect: (options: ConfirmOptions) => Promise<string | null>;
}

type Busy = "logout" | "reset" | "activation" | "delete" | null;

const AccountSection: React.FC<AccountSectionProps> = ({
  profile,
  onProfileChange,
  protect,
}) => {
  const [busy, setBusy] = useState<Busy>(null);

  /**
   * Confirm + verify, then run a sensitive request.
   */
  const run = async (
    action: Exclude<Busy, null>,
    options: ConfirmOptions,
    request: (verificationToken: string) => Promise<void>,
    failure: string,
  ) => {
    const verificationToken = await protect(options);

    if (!verificationToken) {
      return;
    }

    try {
      setBusy(action);
      await request(verificationToken);
    } catch (error) {
      toast.error(getErrorMessage(error, failure));
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    try {
      setBusy("logout");
      await logoutAndRedirect();
    } catch (error) {
      toast.error(getErrorMessage(error, "Logout failed."));
      setBusy(null);
    }
  };

  const resetAccount = () =>
    run(
      "reset",
      {
        title: "Reset your account?",
        description: "Your name, email, phone and password are kept.",
        consequences: [
          "You leave every group. Where you're the only admin, the longest-standing member becomes admin.",
          "All your chats are deleted for you. Other people keep their copies.",
          "Contact details, address and education are cleared.",
          "Everyone you blocked is unblocked.",
          "Privacy and group settings go back to their defaults.",
        ],
        confirmLabel: "Continue",
        danger: true,
      },
      async (verificationToken) => {
        await axios.post(
          API_ENDPOINTS.ResetAccount,
          { verificationToken },
          { withCredentials: true },
        );

        const response = await axios.post<MyProfile>(
          API_ENDPOINTS.MyProfile,
          {},
          { withCredentials: true },
        );

        onProfileChange(response.data);
        toast.success("Your account was reset.");
      },
      "Couldn't reset your account.",
    );

  const toggleActivation = () =>
    profile.isDeactivated
      ? run(
          "activation",
          {
            title: "Activate your profile?",
            changes: [
              { label: "Profile status", from: "Deactivated", to: "Active" },
            ],
            consequences: [
              "Your profile appears in search and on profile pages again.",
              "You can send and receive messages again.",
            ],
            confirmLabel: "Continue",
          },
          async (verificationToken) => {
            await axios.post(
              API_ENDPOINTS.ReactivateMyAccount,
              { verificationToken },
              { withCredentials: true },
            );

            onProfileChange({ ...profile, isDeactivated: false });
            toast.success("Your profile is active again.");
          },
          "Couldn't activate your profile.",
        )
      : run(
          "activation",
          {
            title: "Deactivate your profile?",
            changes: [
              { label: "Profile status", from: "Active", to: "Deactivated" },
            ],
            consequences: [
              "Your profile is hidden from search and profile pages.",
              "Nobody can message you, and you can't send messages.",
              "You're signed out on every device.",
              "Log in and choose Activate to come back.",
            ],
            confirmLabel: "Continue",
            danger: true,
          },
          async (verificationToken) => {
            await axios.post(
              API_ENDPOINTS.DeactivateMyAccount,
              { verificationToken },
              { withCredentials: true },
            );

            toast.success("Your profile is deactivated.");
            signedOutRedirect();
          },
          "Couldn't deactivate your profile.",
        );

  const deleteAccount = () =>
    run(
      "delete",
      {
        title: "Delete your account permanently?",
        consequences: [
          `${profile.fullName} (@${profile.publicId}) will be deleted.`,
          "Your messages and group memberships are removed.",
          "This can't be undone.",
        ],
        confirmLabel: "Continue",
        danger: true,
      },
      async (verificationToken) => {
        await axios.post(
          API_ENDPOINTS.DeleteMyAccount,
          { verificationToken },
          { withCredentials: true },
        );

        toast.success("Your account was deleted.");
        signedOutRedirect();
      },
      "Couldn't delete your account.",
    );

  return (
    <>
      <SettingsCard title="Session">
        <SettingRow
          label="Log out"
          hint="If another account is signed in on this browser, you'll switch to it."
        >
          <Button
            variant="soft"
            color="gray"
            onClick={logout}
            loading={busy === "logout"}
          >
            <LogOut size={15} />
            Log out
          </Button>
        </SettingRow>
      </SettingsCard>

      <div className="h-4" />

      <SettingsCard
        title="Danger zone"
        description="Each action shows what will change, then asks you to verify it's you."
        danger
      >
        <SettingRow
          label="Profile status"
          hint={
            profile.isDeactivated
              ? "Your profile is hidden and you can't send messages."
              : "Hide your profile and pause messaging."
          }
        >
          {profile.isDeactivated ? (
            <Button onClick={toggleActivation} loading={busy === "activation"}>
              Activate
            </Button>
          ) : (
            <Button
              variant="soft"
              color="red"
              onClick={toggleActivation}
              loading={busy === "activation"}
            >
              Deactivate
            </Button>
          )}
        </SettingRow>

        {profile.isDeactivated && (
          <Badge color="amber" variant="soft" mb="2">
            Deactivated
          </Badge>
        )}

        <Separator size="4" />

        <SettingRow
          label="Reset account"
          hint="Leave all groups, delete all chats for you, clear profile details and blocks, restore default settings."
        >
          <Button
            variant="soft"
            color="red"
            onClick={resetAccount}
            loading={busy === "reset"}
          >
            Reset account
          </Button>
        </SettingRow>

        <Separator size="4" />

        <SettingRow
          label="Delete account"
          hint="Permanently deletes your account and messages."
        >
          <Button
            color="red"
            onClick={deleteAccount}
            loading={busy === "delete"}
          >
            Delete account
          </Button>
        </SettingRow>
      </SettingsCard>
    </>
  );
};

export default AccountSection;
