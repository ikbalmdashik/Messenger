"use client";

import React, { useState } from "react";

import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";

import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Flex,
  IconButton,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";

import {
  BadgeCheck,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import API_ENDPOINTS, { MyProfile } from "@/app/routes/api";
import { getErrorMessage } from "@/app/lib/apiError";
import {
  formatLocation,
  formatYears,
  initialsOf,
  prettyUrl,
} from "@/app/lib/profile";

import { Field, Muted, SettingsCard } from "./ui";
import {
  changed,
  ChangeItem,
  ConfirmOptions,
} from "../shared/useConfirm";

const describeSocials = (
  socials: { platform: string; url: string }[],
) =>
  socials
    .filter((social) => social.platform.trim() || social.url.trim())
    .map((social) => `${social.platform}: ${prettyUrl(social.url)}`)
    .join(", ");

const describeEducation = (
  items: {
    institution: string;
    degree?: string;
    startYear?: number | string | null;
    endYear?: number | string | null;
    current?: boolean;
  }[],
) =>
  items
    .map((item) =>
      [
        item.institution,
        item.degree,
        formatYears(
          item.startYear ? Number(item.startYear) : null,
          item.endYear ? Number(item.endYear) : null,
          item.current,
        ),
      ]
        .filter(Boolean)
        .join(" · "),
    )
    .join("; ");

/**
 * Field-by-field summary for the confirmation dialog.
 */
const summarizeChanges = (
  profile: MyProfile,
  form: ProfileForm,
): ChangeItem[] => [
  ...changed("Full name", profile.fullName, form.fullName.trim()),
  ...changed("Phone", profile.phone, form.phone.trim()),
  ...changed(
    "Website",
    profile.contact?.website ? prettyUrl(profile.contact.website) : "",
    form.website.trim() ? prettyUrl(form.website.trim()) : "",
  ),
  ...changed(
    "Social links",
    describeSocials(profile.contact?.socials ?? []),
    describeSocials(form.socials),
  ),
  ...changed("Street address", profile.address?.line1, form.address.line1.trim()),
  ...changed("Apartment, suite", profile.address?.line2, form.address.line2.trim()),
  ...changed("City", profile.address?.city, form.address.city.trim()),
  ...changed("State / region", profile.address?.state, form.address.state.trim()),
  ...changed("Postal code", profile.address?.postalCode, form.address.postalCode.trim()),
  ...changed("Country", profile.address?.country, form.address.country.trim()),
  ...changed(
    "Education",
    describeEducation(profile.education),
    describeEducation(form.education),
  ),
];

/* ============================================================
   FORM STATE
============================================================ */

interface EducationForm {
  key: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  current: boolean;
  description: string;
}

interface SocialForm {
  key: string;
  platform: string;
  url: string;
}

interface ProfileForm {
  fullName: string;
  phone: string;
  website: string;
  socials: SocialForm[];
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  education: EducationForm[];
}

const MAX_EDUCATION = 10;
const MAX_SOCIALS = 8;

let keyCounter = 0;
const newKey = () => `k-${Date.now()}-${keyCounter++}`;

const toForm = (profile: MyProfile): ProfileForm => ({
  fullName: profile.fullName ?? "",
  phone: profile.phone ?? "",
  website: profile.contact?.website ?? "",
  socials: (profile.contact?.socials ?? []).map((social) => ({
    key: newKey(),
    platform: social.platform,
    url: social.url,
  })),
  address: {
    line1: profile.address?.line1 ?? "",
    line2: profile.address?.line2 ?? "",
    city: profile.address?.city ?? "",
    state: profile.address?.state ?? "",
    postalCode: profile.address?.postalCode ?? "",
    country: profile.address?.country ?? "",
  },
  education: (profile.education ?? []).map((item) => ({
    key: newKey(),
    institution: item.institution ?? "",
    degree: item.degree ?? "",
    fieldOfStudy: item.fieldOfStudy ?? "",
    startYear: item.startYear ? String(item.startYear) : "",
    endYear: item.endYear ? String(item.endYear) : "",
    current: Boolean(item.current),
    description: item.description ?? "",
  })),
});

interface ProfileSectionProps {
  profile: MyProfile;
  onProfileChange: (profile: MyProfile) => void;
  protect: (options: ConfirmOptions) => Promise<string | null>;
}

/* ============================================================
   COMPONENT
============================================================ */

const ProfileSection: React.FC<ProfileSectionProps> = ({
  profile,
  onProfileChange,
  protect,
}) => {
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = form !== null;

  const patch = (changes: Partial<ProfileForm>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchAddress = (changes: Partial<ProfileForm["address"]>) =>
    setForm((current) =>
      current
        ? { ...current, address: { ...current.address, ...changes } }
        : current,
    );

  const patchEducation = (key: string, changes: Partial<EducationForm>) =>
    setForm((current) =>
      current
        ? {
            ...current,
            education: current.education.map((item) =>
              item.key === key ? { ...item, ...changes } : item,
            ),
          }
        : current,
    );

  const patchSocial = (key: string, changes: Partial<SocialForm>) =>
    setForm((current) =>
      current
        ? {
            ...current,
            socials: current.socials.map((item) =>
              item.key === key ? { ...item, ...changes } : item,
            ),
          }
        : current,
    );

  const save = async () => {
    if (!form) {
      return;
    }

    if (!form.fullName.trim()) {
      toast.error("Name is required.");
      return;
    }

    if (form.education.some((item) => !item.institution.trim())) {
      toast.error("Each education entry needs a school or institution.");
      return;
    }

    const changes = summarizeChanges(profile, form);

    if (changes.length === 0) {
      toast.info("Nothing changed.");
      setForm(null);
      return;
    }

    const verificationToken = await protect({
      title: "Save profile changes?",
      description: "Review the changes below. Next you'll verify it's you.",
      changes,
      confirmLabel: "Continue",
    });

    if (!verificationToken) {
      return;
    }

    try {
      setSaving(true);

      const response = await axios.post<MyProfile>(
        API_ENDPOINTS.UpdateMyProfile,
        {
          verificationToken,
          fullName: form.fullName,
          phone: form.phone,
          address: form.address,
          contact: {
            website: form.website,
            socials: form.socials
              .filter((social) => social.platform.trim() || social.url.trim())
              .map(({ platform, url }) => ({ platform, url })),
          },
          education: form.education.map((item) => ({
            institution: item.institution,
            degree: item.degree,
            fieldOfStudy: item.fieldOfStudy,
            startYear: item.startYear ? Number(item.startYear) : null,
            endYear:
              item.current || !item.endYear ? null : Number(item.endYear),
            current: item.current,
            description: item.description,
          })),
        },
        { withCredentials: true },
      );

      onProfileChange(response.data);
      setForm(null);

      toast.success("Profile updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't update your profile."));
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------------------------
     VIEW MODE
  ---------------------------------------------------------- */

  const location = formatLocation(profile.address);
  const street = [profile.address?.line1, profile.address?.line2]
    .filter(Boolean)
    .join(", ");
  const socials = profile.contact?.socials ?? [];

  const header = (
    <Flex align="center" gap="3">
      <Avatar
        size="5"
        radius="full"
        color="sky"
        variant="soft"
        fallback={initialsOf(profile.fullName)}
      />

      <Box className="min-w-0 flex-1">
        <Flex align="center" gap="1">
          <Text size="4" weight="bold" className="truncate">
            {profile.fullName}
          </Text>
          {profile.isEmailVerified && (
            <BadgeCheck size={16} className="shrink-0 text-emerald-500" />
          )}
        </Flex>

        <Text size="2" color="gray" as="div">
          @{profile.publicId}
        </Text>
      </Box>
    </Flex>
  );

  const actions = editing ? (
    <Flex gap="2">
      <Button
        variant="soft"
        color="gray"
        onClick={() => setForm(null)}
        disabled={saving}
      >
        Cancel
      </Button>
      <Button onClick={save} loading={saving}>
        Save changes
      </Button>
    </Flex>
  ) : (
    <Flex gap="2">
      <Button variant="soft" color="gray" asChild>
        <Link href={`/${encodeURIComponent(profile.publicId)}`}>
          <ExternalLink size={15} />
          Public profile
        </Link>
      </Button>
      <Button onClick={() => setForm(toForm(profile))}>
        <Pencil size={15} />
        Edit
      </Button>
    </Flex>
  );

  return (
    <Flex direction="column" gap="4">
      <SettingsCard
        title="Profile"
        description="Your name, contact details, address and education. Changes ask you to verify it's you."
      >
        <Flex
          direction={{ initial: "column", sm: "row" }}
          align={{ initial: "start", sm: "center" }}
          justify="between"
          gap="3"
        >
          {header}
          {actions}
        </Flex>
      </SettingsCard>

      {!editing ? (
        <>
          <SettingsCard title="Contact details">
            <Flex direction="column" gap="2">
              <InfoRow label="Email">
                {profile.email}
              </InfoRow>
              <InfoRow label="Phone">
                {profile.phone || <Muted>Not added</Muted>}
              </InfoRow>
              <InfoRow label="Website">
                {profile.contact?.website ? (
                  <ExternalAnchor href={profile.contact.website}>
                    {prettyUrl(profile.contact.website)}
                  </ExternalAnchor>
                ) : (
                  <Muted>Not added</Muted>
                )}
              </InfoRow>
              <InfoRow label="Social">
                {socials.length === 0 ? (
                  <Muted>Not added</Muted>
                ) : (
                  <Flex direction="column" gap="1">
                    {socials.map((social) => (
                      <ExternalAnchor
                        key={`${social.platform}-${social.url}`}
                        href={social.url}
                      >
                        {social.platform}: {prettyUrl(social.url)}
                      </ExternalAnchor>
                    ))}
                  </Flex>
                )}
              </InfoRow>
            </Flex>
          </SettingsCard>

          <SettingsCard
            title="Address"
            description="Street and postal code are always private."
          >
            <Flex direction="column" gap="2">
              <InfoRow label="Street">{street || <Muted>Not added</Muted>}</InfoRow>
              <InfoRow label="Location">
                {location || <Muted>Not added</Muted>}
              </InfoRow>
              <InfoRow label="Postal code">
                {profile.address?.postalCode || <Muted>Not added</Muted>}
              </InfoRow>
            </Flex>
          </SettingsCard>

          <SettingsCard title="Education">
            {profile.education.length === 0 ? (
              <Muted>No education added.</Muted>
            ) : (
              <Flex direction="column" gap="3">
                {profile.education.map((item, index) => {
                  const years = formatYears(
                    item.startYear,
                    item.endYear,
                    item.current,
                  );

                  return (
                    <Box key={`${item.institution}-${index}`}>
                      {index > 0 && <Separator size="4" mb="3" />}
                      <Flex justify="between" gap="3">
                        <Text size="2" weight="medium">
                          {item.institution}
                        </Text>
                        {years && (
                          <Text size="1" color="gray" className="shrink-0">
                            {years}
                          </Text>
                        )}
                      </Flex>
                      <Text size="1" color="gray" as="div">
                        {[item.degree, item.fieldOfStudy]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </Box>
                  );
                })}
              </Flex>
            )}
          </SettingsCard>
        </>
      ) : (
        form && (
          <>
            {/* PERSONAL + CONTACT */}

            <SettingsCard title="Personal & contact">
              <Flex direction="column" gap="3">
                <Flex gap="3" wrap="wrap">
                  <Field label="Full name">
                    <TextField.Root
                      value={form.fullName}
                      maxLength={100}
                      onChange={(event) =>
                        patch({ fullName: event.target.value })
                      }
                    />
                  </Field>

                  <Field label="Email (can't be changed)">
                    <TextField.Root value={profile.email} disabled />
                  </Field>
                </Flex>

                <Flex gap="3" wrap="wrap">
                  <Field label="Phone">
                    <TextField.Root
                      type="tel"
                      value={form.phone}
                      maxLength={25}
                      placeholder="+880 1XXX-XXXXXX"
                      onChange={(event) => patch({ phone: event.target.value })}
                    />
                  </Field>

                  <Field label="Website">
                    <TextField.Root
                      value={form.website}
                      maxLength={300}
                      placeholder="example.com"
                      onChange={(event) =>
                        patch({ website: event.target.value })
                      }
                    />
                  </Field>
                </Flex>

                <Flex align="center" justify="between">
                  <Text size="1" weight="medium" color="gray">
                    Social links
                  </Text>
                  <Button
                    size="1"
                    variant="ghost"
                    disabled={form.socials.length >= MAX_SOCIALS}
                    onClick={() =>
                      patch({
                        socials: [
                          ...form.socials,
                          { key: newKey(), platform: "", url: "" },
                        ],
                      })
                    }
                  >
                    <Plus size={13} />
                    Add link
                  </Button>
                </Flex>

                {form.socials.map((social) => (
                  <Flex key={social.key} gap="2" align="center">
                    <Box className="w-36 shrink-0">
                      <TextField.Root
                        value={social.platform}
                        maxLength={40}
                        placeholder="LinkedIn"
                        onChange={(event) =>
                          patchSocial(social.key, {
                            platform: event.target.value,
                          })
                        }
                      />
                    </Box>
                    <Box className="min-w-0 flex-1">
                      <TextField.Root
                        value={social.url}
                        maxLength={300}
                        placeholder="linkedin.com/in/you"
                        onChange={(event) =>
                          patchSocial(social.key, { url: event.target.value })
                        }
                      />
                    </Box>
                    <IconButton
                      variant="ghost"
                      color="red"
                      aria-label="Remove link"
                      onClick={() =>
                        patch({
                          socials: form.socials.filter(
                            (item) => item.key !== social.key,
                          ),
                        })
                      }
                    >
                      <X size={15} />
                    </IconButton>
                  </Flex>
                ))}
              </Flex>
            </SettingsCard>

            {/* ADDRESS */}

            <SettingsCard
              title="Address"
              description="Street and postal code are always private."
            >
              <Flex direction="column" gap="3">
                <Field label="Street address">
                  <TextField.Root
                    value={form.address.line1}
                    maxLength={200}
                    onChange={(event) =>
                      patchAddress({ line1: event.target.value })
                    }
                  />
                </Field>
                <Field label="Apartment, suite, etc.">
                  <TextField.Root
                    value={form.address.line2}
                    maxLength={200}
                    onChange={(event) =>
                      patchAddress({ line2: event.target.value })
                    }
                  />
                </Field>
                <Flex gap="3" wrap="wrap">
                  <Field label="City">
                    <TextField.Root
                      value={form.address.city}
                      maxLength={100}
                      onChange={(event) =>
                        patchAddress({ city: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="State / region">
                    <TextField.Root
                      value={form.address.state}
                      maxLength={100}
                      onChange={(event) =>
                        patchAddress({ state: event.target.value })
                      }
                    />
                  </Field>
                </Flex>
                <Flex gap="3" wrap="wrap">
                  <Field label="Postal code">
                    <TextField.Root
                      value={form.address.postalCode}
                      maxLength={20}
                      onChange={(event) =>
                        patchAddress({ postalCode: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Country">
                    <TextField.Root
                      value={form.address.country}
                      maxLength={100}
                      onChange={(event) =>
                        patchAddress({ country: event.target.value })
                      }
                    />
                  </Field>
                </Flex>
              </Flex>
            </SettingsCard>

            {/* EDUCATION */}

            <SettingsCard
              title="Education"
              action={
                <Button
                  size="1"
                  variant="soft"
                  disabled={form.education.length >= MAX_EDUCATION}
                  onClick={() =>
                    patch({
                      education: [
                        ...form.education,
                        {
                          key: newKey(),
                          institution: "",
                          degree: "",
                          fieldOfStudy: "",
                          startYear: "",
                          endYear: "",
                          current: false,
                          description: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={13} />
                  Add
                </Button>
              }
            >
              <Flex direction="column" gap="3">
                {form.education.length === 0 && (
                  <Muted>No education added.</Muted>
                )}

                {form.education.map((item) => (
                  <Box
                    key={item.key}
                    className="rounded-lg border border-[var(--gray-a4)] p-3"
                  >
                    <Flex direction="column" gap="3">
                      <Flex gap="2" align="end">
                        <Field label="School / institution">
                          <TextField.Root
                            value={item.institution}
                            maxLength={200}
                            onChange={(event) =>
                              patchEducation(item.key, {
                                institution: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <IconButton
                          variant="ghost"
                          color="red"
                          aria-label="Remove education"
                          onClick={() =>
                            patch({
                              education: form.education.filter(
                                (entry) => entry.key !== item.key,
                              ),
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </Flex>

                      <Flex gap="3" wrap="wrap">
                        <Field label="Degree">
                          <TextField.Root
                            value={item.degree}
                            maxLength={150}
                            placeholder="BSc"
                            onChange={(event) =>
                              patchEducation(item.key, {
                                degree: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Field of study">
                          <TextField.Root
                            value={item.fieldOfStudy}
                            maxLength={150}
                            placeholder="Computer Science"
                            onChange={(event) =>
                              patchEducation(item.key, {
                                fieldOfStudy: event.target.value,
                              })
                            }
                          />
                        </Field>
                      </Flex>

                      <Flex gap="3" align="end" wrap="wrap">
                        <Field label="Start year">
                          <TextField.Root
                            type="number"
                            min={1900}
                            max={2100}
                            value={item.startYear}
                            onChange={(event) =>
                              patchEducation(item.key, {
                                startYear: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="End year">
                          <TextField.Root
                            type="number"
                            min={1900}
                            max={2100}
                            disabled={item.current}
                            value={item.current ? "" : item.endYear}
                            onChange={(event) =>
                              patchEducation(item.key, {
                                endYear: event.target.value,
                              })
                            }
                          />
                        </Field>
                      </Flex>

                      <Text as="label" size="2">
                        <Flex gap="2" align="center">
                          <Checkbox
                            checked={item.current}
                            onCheckedChange={(checked) =>
                              patchEducation(item.key, {
                                current: checked === true,
                              })
                            }
                          />
                          I currently study here
                        </Flex>
                      </Text>

                      <Field label="Description">
                        <TextArea
                          value={item.description}
                          maxLength={500}
                          rows={2}
                          onChange={(event) =>
                            patchEducation(item.key, {
                              description: event.target.value,
                            })
                          }
                        />
                      </Field>
                    </Flex>
                  </Box>
                ))}
              </Flex>
            </SettingsCard>

            <Flex justify="end" gap="2">
              <Button
                variant="soft"
                color="gray"
                onClick={() => setForm(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={save} loading={saving}>
                Save changes
              </Button>
            </Flex>
          </>
        )
      )}
    </Flex>
  );
};

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Flex gap="3" align="start">
    <Text size="2" color="gray" className="w-28 shrink-0">
      {label}
    </Text>
    <Box className="min-w-0 flex-1 text-sm">{children}</Box>
  </Flex>
);

const ExternalAnchor = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer nofollow"
    className="block truncate text-[var(--accent-11)] hover:underline"
  >
    {children}
  </a>
);

export default ProfileSection;
