import {
  ProfileVisibility,
  UserAddress,
  UserPrivacy,
} from "@/app/routes/api";

export const VISIBILITY_OPTIONS: {
  value: ProfileVisibility;
  label: string;
}[] = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "CONTACTS", label: "My contacts" },
  { value: "ONLY_ME", label: "Only me" },
];

export const visibilityLabel = (value: ProfileVisibility) =>
  VISIBILITY_OPTIONS.find((option) => option.value === value)
    ?.label ?? value;

export const PRIVACY_SECTIONS: {
  key: keyof UserPrivacy;
  label: string;
  hint: string;
}[] = [
  {
    key: "contact",
    label: "Contact details",
    hint: "Email, phone, website and social links",
  },
  {
    key: "education",
    label: "Education",
    hint: "Schools and degrees",
  },
  {
    key: "location",
    label: "Location",
    hint: "City, state and country",
  },
];

type LocationParts = {
  [K in "city" | "state" | "country"]?: UserAddress[K] | null;
};

export const formatLocation = (
  address: LocationParts | null | undefined,
) =>
  [address?.city, address?.state, address?.country]
    .filter(Boolean)
    .join(", ");

export const formatYears = (
  startYear?: number | null,
  endYear?: number | null,
  current?: boolean,
) => {
  if (!startYear && !endYear && !current) {
    return null;
  }

  return `${startYear ?? "?"} – ${current ? "Present" : endYear ?? "?"}`;
};

export const initialsOf = (name: string | null | undefined) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

/**
 * Show "github.com/alice" instead of the full URL.
 */
export const prettyUrl = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
