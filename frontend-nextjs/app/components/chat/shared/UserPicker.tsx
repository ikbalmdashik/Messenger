"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";

import {
  Avatar,
  Badge,
  Box,
  Flex,
  ScrollArea,
  Text,
  TextField,
} from "@radix-ui/themes";

import {
  Check,
  Loader2,
  Search,
  X,
} from "lucide-react";

import API_ENDPOINTS, {
  SearchUserByPublicIdResponse,
} from "@/app/routes/api";

export type PickedUser = Pick<
  SearchUserByPublicIdResponse,
  "userId" | "fullName" | "publicId" | "isEmailVerified"
>;

interface UserPickerProps {
  selected: PickedUser[];
  onChange: (users: PickedUser[]) => void;

  /**
   * Users who can't be picked (yourself,
   * existing group members).
   */
  excludeUserIds?: number[];
}

/**
 * Search people by @publicId and pick several.
 */
const UserPicker: React.FC<UserPickerProps> = ({
  selected,
  onChange,
  excludeUserIds = [],
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const requestIdRef = useRef(0);

  const search = query.trim().replace(/^@/, "");

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await axios.post<
          SearchUserByPublicIdResponse[]
        >(
          API_ENDPOINTS.SearchUserByPublicId,
          { publicId: search },
          { withCredentials: true },
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        setResults(
          Array.isArray(response.data)
            ? response.data
            : [],
        );
      } catch (error) {
        if (requestId === requestIdRef.current) {
          console.log("User search failed:", error);
          setResults([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const selectedIds = new Set(
    selected.map((user) => user.userId),
  );

  const excluded = new Set(excludeUserIds);

  const visibleResults = results.filter(
    (user) => !excluded.has(Number(user.userId)),
  );

  const toggle = (user: PickedUser) => {
    if (selectedIds.has(user.userId)) {
      onChange(
        selected.filter(
          (item) => item.userId !== user.userId,
        ),
      );
    } else {
      onChange([...selected, user]);
    }
  };

  return (
    <Flex direction="column" gap="2">
      {selected.length > 0 && (
        <Flex wrap="wrap" gap="1">
          {selected.map((user) => (
            <Badge
              key={user.userId}
              size="2"
              variant="soft"
              color="blue"
              radius="full"
            >
              {user.fullName}
              <button
                type="button"
                aria-label={`Remove ${user.fullName}`}
                onClick={() => toggle(user)}
                className="ml-1 cursor-pointer opacity-70 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </Flex>
      )}

      <TextField.Root
        placeholder="Search by @publicId"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      >
        <TextField.Slot>
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Search size={15} />
          )}
        </TextField.Slot>
      </TextField.Root>

      <ScrollArea
        type="auto"
        scrollbars="vertical"
        style={{ maxHeight: 220 }}
      >
        {search.length < 2 ? (
          <Text size="1" color="gray" className="block px-1 py-2">
            Type at least 2 characters of a public ID.
          </Text>
        ) : !loading && visibleResults.length === 0 ? (
          <Text size="1" color="gray" className="block px-1 py-2">
            No people found.
          </Text>
        ) : (
          visibleResults.map((user) => {
            const isPicked = selectedIds.has(user.userId);

            return (
              <button
                key={user.userId}
                type="button"
                onClick={() => toggle(user)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded px-2 py-2 text-left transition ${
                  isPicked
                    ? "bg-blue-500/10"
                    : "hover:bg-[var(--gray-a3)]"
                }`}
              >
                <Avatar
                  size="2"
                  radius="full"
                  fallback={
                    user.fullName?.charAt(0)?.toUpperCase() ||
                    "U"
                  }
                />

                <Box className="min-w-0 flex-1">
                  <Text
                    size="2"
                    weight="medium"
                    className="block truncate"
                  >
                    {user.fullName}
                  </Text>

                  <Text
                    size="1"
                    color="gray"
                    className="block truncate"
                  >
                    @{user.publicId}
                  </Text>
                </Box>

                {isPicked && (
                  <Check size={16} className="text-blue-500" />
                )}
              </button>
            );
          })
        )}
      </ScrollArea>
    </Flex>
  );
};

export default UserPicker;
