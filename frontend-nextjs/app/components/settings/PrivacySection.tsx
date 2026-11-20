"use client";

import React, { useEffect, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import { Button, Flex, Select, Separator, Text } from "@radix-ui/themes";

import API_ENDPOINTS, {
  MyProfile,
  ProfileVisibility,
  UserPrivacy,
} from "@/app/routes/api";
import { getErrorMessage } from "@/app/lib/apiError";
import {
  PRIVACY_SECTIONS,
  VISIBILITY_OPTIONS,
  visibilityLabel,
} from "@/app/lib/profile";
import { changed, ConfirmOptions } from "../shared/useConfirm";

import { SettingRow, SettingsCard } from "./ui";

interface PrivacySectionProps {
  profile: MyProfile;
  onProfileChange: (profile: MyProfile) => void;
  protect: (options: ConfirmOptions) => Promise<string | null>;
}

const PrivacySection: React.FC<PrivacySectionProps> = ({
  profile,
  onProfileChange,
  protect,
}) => {
  const [privacy, setPrivacy] = useState<UserPrivacy>(profile.privacy);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrivacy(profile.privacy);
  }, [profile.privacy]);

  const hasChanges = PRIVACY_SECTIONS.some(
    (section) => privacy[section.key] !== profile.privacy[section.key],
  );

  const save = async () => {
    const verificationToken = await protect({
      title: "Change who can see your details?",
      changes: PRIVACY_SECTIONS.flatMap((section) =>
        changed(
          section.label,
          visibilityLabel(profile.privacy[section.key]),
          visibilityLabel(privacy[section.key]),
        ),
      ),
      confirmLabel: "Continue",
    });

    if (!verificationToken) {
      return;
    }

    try {
      setSaving(true);

      const response = await axios.post<MyProfile>(
        API_ENDPOINTS.UpdateMyProfile,
        { verificationToken, privacy },
        { withCredentials: true },
      );

      onProfileChange(response.data);
      toast.success("Privacy settings saved.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't save privacy settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title="Who can see my details"
      description={
        <>
          &ldquo;My contacts&rdquo; means people you have a chat or group
          with. Street address and postal code are never shown to anyone.
        </>
      }
    >
      <Flex direction="column">
        {PRIVACY_SECTIONS.map((section, index) => (
          <React.Fragment key={section.key}>
            {index > 0 && <Separator size="4" />}

            <SettingRow label={section.label} hint={section.hint}>
              <Select.Root
                value={privacy[section.key]}
                onValueChange={(value) =>
                  setPrivacy({
                    ...privacy,
                    [section.key]: value as ProfileVisibility,
                  })
                }
              >
                <Select.Trigger className="w-40" />
                <Select.Content>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </SettingRow>
          </React.Fragment>
        ))}
      </Flex>

      <Flex justify="end" gap="2" mt="4">
        {hasChanges && (
          <Button
            variant="soft"
            color="gray"
            onClick={() => setPrivacy(profile.privacy)}
            disabled={saving}
          >
            Reset
          </Button>
        )}
        <Button onClick={save} disabled={!hasChanges} loading={saving}>
          Save
        </Button>
      </Flex>

      {!hasChanges && (
        <Text size="1" color="gray" as="p" mt="2" align="right">
          Changes ask you to verify it&apos;s you.
        </Text>
      )}
    </SettingsCard>
  );
};

export default PrivacySection;
