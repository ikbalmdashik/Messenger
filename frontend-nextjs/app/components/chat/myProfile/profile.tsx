"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import API_ENDPOINTS from "@/app/routes/api";
import useCurrentUser, {
  initialUser,
} from "@/app/hooks/user/useCurrentUser";

import {
  Dialog,
  Button,
  TextField,
  Flex,
  Text,
  Avatar,
  Badge,
  Box,
  Separator,
  IconButton,
} from "@radix-ui/themes";

import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Pencil,
  Trash2,
  X,
  Check,
  UserCheck,
  AlertTriangle,
  LogOut,
  AtSign,
} from "lucide-react";
import Routes from "@/app/routes/routes";

interface FormFields {
  fullName: string;
  publicId: string;
  email: string;
  phone: string;
  role: string;
}

const ProfileDialog: React.FC = () => {
  const router = useRouter();

  const [userId, setUserId] = useState<number | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editable, setEditable] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false);

  const [formInitialValues, setFormInitialValues] = useState({
    fullName: "",
    publicId: "",
    email: "",
    phone: "",
  });

  /*
   * ============================================================
   * Cross-tab logout synchronization
   * ============================================================
   */
  useEffect(() => {
    const channel = new BroadcastChannel("auth_channel");

    const handleLogoutMessage = (
      event: MessageEvent
    ) => {
      if (event.data?.type === "LOGOUT") {
        setOpen(false);
        setConfirmDelete(false);
        setConfirmLogout(false);

        toast.info(
          "You have been logged out."
        );

        router.push(Routes.Login);
        router.refresh();
      }
    };

    channel.addEventListener(
      "message",
      handleLogoutMessage
    );

    return () => {
      channel.removeEventListener(
        "message",
        handleLogoutMessage
      );

      channel.close();
    };
  }, [router]);

  /*
   * ============================================================
   * Get currently authenticated user
   * ============================================================
   */
  useEffect(() => {
    const getAuthenticatedUser = async () => {
      try {
        setAuthLoading(true);

        const response = await axios.post(
          API_ENDPOINTS.GetUserByToken,
          {},
          {
            withCredentials: true,
          }
        );

        const user = response.data;

        if (
          user?.userId !== undefined &&
          user?.userId !== null
        ) {
          setUserId(Number(user.userId));
        } else {
          setUserId(null);
        }
      } catch (error) {
        console.log(
          "Failed to get authenticated user:",
          error
        );

        setUserId(null);
      } finally {
        setAuthLoading(false);
      }
    };

    getAuthenticatedUser();
  }, []);

  /*
   * ============================================================
   * Fetch current user's complete information
   * ============================================================
   */
  const user = useCurrentUser(userId);

  const isLoading =
    authLoading ||
    userId === null ||
    user === initialUser;

  const {
    register,
    reset,
    watch,
  } = useForm<FormFields>({
    defaultValues: {
      fullName: "",
      publicId: "",
      email: "",
      phone: "",
      role: "",
    },
  });

  const watchFields = watch();

  /*
   * ============================================================
   * Populate form when user data is loaded
   * ============================================================
   */
  useEffect(() => {
    if (user && user !== initialUser) {
      const userData = {
        fullName: user.fullName || "",
        publicId: user.publicId || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "",
      };

      reset(userData);

      setFormInitialValues({
        fullName: userData.fullName,
        publicId: userData.publicId,
        email: userData.email,
        phone: userData.phone,
      });
    }
  }, [user, reset]);

  /*
   * ============================================================
   * Check whether editable fields changed
   * ============================================================
   *
   * Email and Public ID are intentionally excluded from edits.
   */
  const hasChanged = useMemo(
    () =>
      watchFields.fullName !==
        formInitialValues.fullName ||
      watchFields.phone !==
        formInitialValues.phone,
    [
      watchFields.fullName,
      watchFields.phone,
      formInitialValues,
    ]
  );

  /*
   * ============================================================
   * Generate avatar initials
   * ============================================================
   */
  const initials = useMemo(() => {
    if (!watchFields.fullName) {
      return "U";
    }

    return watchFields.fullName
      .split(" ")
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [watchFields.fullName]);

  /*
   * ============================================================
   * Logout
   * ============================================================
   */
  const handleLogout = useCallback(async () => {
    if (logoutLoading) {
      return;
    }

    try {
      setLogoutLoading(true);

      await axios.post(
        API_ENDPOINTS.Logout,
        {},
        {
          withCredentials: true,
        }
      );

      const channel = new BroadcastChannel(
        "auth_channel"
      );

      channel.postMessage({
        type: "LOGOUT",
      });

      channel.close();

      setConfirmLogout(false);
      setOpen(false);

      toast.success(
        "Logged out successfully."
      );

      router.push(Routes.Login);
      router.refresh();
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );

      toast.error(
        "Logout failed. Please try again."
      );
    } finally {
      setLogoutLoading(false);
    }
  }, [logoutLoading, router]);

  /*
   * ============================================================
   * Update profile
   * ============================================================
   */
  const handleUpdate = useCallback(async () => {
    if (userId === null) {
      toast.error(
        "User authentication required."
      );

      return;
    }

    try {
      const updatedData = {
        userId: Number(userId),
        fullName: watchFields.fullName,
        publicId: watchFields.publicId,
        email: watchFields.email,
        phone: watchFields.phone,
        role: watchFields.role,
      };

      await axios.post(
        API_ENDPOINTS.UpdateUser,
        updatedData,
        {
          withCredentials: true,
        }
      );

      toast.success(
        "Profile updated successfully."
      );

      setFormInitialValues({
        fullName: updatedData.fullName,
        publicId: updatedData.publicId,
        email: updatedData.email,
        phone: updatedData.phone,
      });

      setEditable(false);
    } catch (error) {
      console.error(
        "Failed to update profile:",
        error
      );

      toast.error(
        "Failed to update profile."
      );
    }
  }, [userId, watchFields]);

  /*
   * ============================================================
   * Delete account
   * ============================================================
   */
  const handleConfirmDelete =
    useCallback(async () => {
      if (userId === null) {
        toast.error(
          "User authentication required."
        );

        return;
      }

      try {
        await axios.post(
          API_ENDPOINTS.DeleteUser,
          {
            id: Number(userId),
          },
          {
            withCredentials: true,
          }
        );

        const channel = new BroadcastChannel(
          "auth_channel"
        );

        channel.postMessage({
          type: "LOGOUT",
        });

        channel.close();

        toast.success(
          "User account deleted successfully."
        );

        setConfirmDelete(false);
        setOpen(false);

        router.push(Routes.Login);
        router.refresh();
      } catch (error) {
        console.error(
          "Failed to delete user:",
          error
        );

        toast.error(
          "Delete failed. Please try again."
        );
      }
    }, [userId, router]);

  /*
   * ============================================================
   * Open profile
   * ============================================================
   */
  const handleMyProfileClick =
    useCallback(() => {
      if (authLoading) {
        toast.info("Loading profile...");
        return;
      }

      if (userId === null) {
        toast.error(
          "Authentication required."
        );

        return;
      }

      if (user === initialUser) {
        toast.info(
          "Profile information is still loading."
        );

        return;
      }

      setFormInitialValues({
        fullName: user.fullName || "",
        publicId: user.publicId || "",
        email: user.email || "",
        phone: user.phone || "",
      });

      reset({
        fullName: user.fullName || "",
        publicId: user.publicId || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "",
      });

      setEditable(false);
      setOpen(true);
    }, [
      authLoading,
      userId,
      user,
      reset,
    ]);

  return (
    <>
      {/* ========================================================
          PROFILE DIALOG
      ========================================================= */}

      <Dialog.Root
        open={open}
        onOpenChange={setOpen}
      >
        <Dialog.Trigger>
          <IconButton
            variant="soft"
            color="gray"
            size="2"
            onClick={
              handleMyProfileClick
            }
            className="cursor-pointer rounded-full"
          >
            <UserIcon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </IconButton>
        </Dialog.Trigger>

        <Dialog.Content className="max-w-md p-6 rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xl border border-[var(--gray-a4)] shadow-2xl">
          <Flex
            align="center"
            justify="between"
            mb="3"
          >
            <Box>
              <Dialog.Title className="text-lg font-bold text-slate-900 dark:text-slate-100">
                User Profile
              </Dialog.Title>

              <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400">
                Manage your account credentials
                and personal information.
              </Dialog.Description>
            </Box>

            <Dialog.Close>
              <IconButton
                variant="ghost"
                color="gray"
                size="3"
                mb={"9"}
                className="cursor-pointer"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </Dialog.Close>
          </Flex>

          {isLoading ? (
            <Flex
              align="center"
              justify="center"
              className="py-8"
            >
              <Text
                size="2"
                color="gray"
              >
                Loading profile information...
              </Text>
            </Flex>
          ) : (
            <Flex
              direction="column"
              gap="4"
            >
              {/* Profile Header */}

              <Flex
                align="center"
                gap="3"
                className="p-3 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 border border-[var(--gray-a3)]"
              >
                <Avatar
                  size="4"
                  radius="full"
                  fallback={initials}
                  color="sky"
                  variant="soft"
                />

                <Box className="min-w-0 flex-1">
                  <Text
                    size="3"
                    weight="bold"
                    className="text-slate-900 dark:text-slate-100 truncate block"
                  >
                    {watchFields.fullName ||
                      "User Account"}
                  </Text>

                  <Text
                    size="1"
                    color="gray"
                    className="truncate block"
                  >
                    @{watchFields.publicId || watchFields.email}
                  </Text>
                </Box>

                {watchFields.role && (
                  <Badge
                    color="sky"
                    variant="soft"
                    size="1"
                    className="capitalize"
                  >
                    {watchFields.role}
                  </Badge>
                )}
              </Flex>

              {/* Form Fields */}

              <Flex
                direction="column"
                gap="3"
              >
                {/* Full Name */}

                <Box>
                  <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="mb-1 block"
                  >
                    Full Name
                  </Text>

                  <TextField.Root
                    {...register(
                      "fullName"
                    )}
                    disabled={!editable}
                    placeholder="Full Name"
                    size="2"
                    variant="surface"
                    className="rounded-lg"
                  >
                    <TextField.Slot>
                      <UserCheck className="w-4 h-4 text-slate-400" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                {/* Public ID */}

                <Box>
                  <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="mb-1 block"
                  >
                    Public ID
                  </Text>

                  <TextField.Root
                    {...register("publicId")}
                    disabled
                    placeholder="Public ID"
                    size="2"
                    variant="surface"
                    className="rounded-lg opacity-80"
                  >
                    <TextField.Slot>
                      <AtSign className="w-4 h-4 text-slate-400" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                {/* Email */}

                <Box>
                  <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="mb-1 block"
                  >
                    Email Address
                  </Text>

                  <div
                    title="Email update feature is coming soon."
                    className="cursor-not-allowed"
                  >
                    <TextField.Root
                      {...register("email")}
                      disabled
                      placeholder="Email Address"
                      size="2"
                      variant="surface"
                      className="rounded-lg opacity-70"
                    >
                      <TextField.Slot>
                        <Mail className="w-4 h-4 text-slate-400" />
                      </TextField.Slot>
                    </TextField.Root>
                  </div>
                </Box>

                {/* Phone */}

                <Box>
                  <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="mb-1 block"
                  >
                    Phone Number
                  </Text>

                  <TextField.Root
                    {...register("phone")}
                    disabled={!editable}
                    placeholder="Phone Number"
                    size="2"
                    variant="surface"
                    className="rounded-lg"
                  >
                    <TextField.Slot>
                      <Phone className="w-4 h-4 text-slate-400" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                {/* Role */}

                <Box>
                  <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="mb-1 block"
                  >
                    Account Role
                  </Text>

                  <TextField.Root
                    {...register("role")}
                    disabled
                    placeholder="Role"
                    size="2"
                    variant="surface"
                    className="rounded-lg opacity-80"
                  >
                    <TextField.Slot>
                      <Shield className="w-4 h-4 text-slate-400" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>
              </Flex>

              <Separator
                size="4"
                className="my-1 opacity-50"
              />

              {/* Action Buttons */}

              <Flex
                align="center"
                justify="between"
                gap="2"
              >
                <Flex
                  align="center"
                  gap="2"
                >
                  {/* Delete */}

                  <Button
                    color="red"
                    variant="soft"
                    size="2"
                    onClick={() =>
                      setConfirmDelete(
                        true
                      )
                    }
                    className="cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>

                  {/* Logout */}

                  <Button
                    color="gray"
                    variant="soft"
                    size="2"
                    onClick={() =>
                      setConfirmLogout(
                        true
                      )
                    }
                    disabled={
                      logoutLoading
                    }
                    className="cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-1" />

                    Logout
                  </Button>
                </Flex>

                {/* Edit / Save / Cancel */}

                <Button
                  color={
                    editable &&
                    hasChanged
                      ? "sky"
                      : "gray"
                  }
                  variant={
                    editable
                      ? "solid"
                      : "soft"
                  }
                  size="2"
                  className="cursor-pointer"
                  onClick={() => {
                    if (!editable) {
                      setEditable(true);
                    } else if (
                      editable &&
                      hasChanged
                    ) {
                      handleUpdate();
                    } else if (
                      editable &&
                      !hasChanged
                    ) {
                      reset({
                        ...watchFields,
                        fullName:
                          formInitialValues.fullName,
                        publicId:
                          formInitialValues.publicId,
                        email:
                          formInitialValues.email,
                        phone:
                          formInitialValues.phone,
                      });

                      setEditable(false);

                      toast.info(
                        "Changes discarded."
                      );
                    }
                  }}
                >
                  {!editable && (
                    <>
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit Profile
                    </>
                  )}

                  {editable &&
                    hasChanged && (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Save Changes
                      </>
                    )}

                  {editable &&
                    !hasChanged && (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </>
                    )}
                </Button>
              </Flex>
            </Flex>
          )}
        </Dialog.Content>
      </Dialog.Root>

      {/* Logout Confirmation */}

      <Dialog.Root
        open={confirmLogout}
        onOpenChange={
          setConfirmLogout
        }
      >
        <Dialog.Content maxWidth={"350px"} className="max-w-sm p-5 rounded bg-slate-50 dark:bg-slate-900 border border-[var(--gray-a4)] shadow-2xl">
          <Flex
            align="center"
            gap="2"
            mb={"2"}
          >
            <LogOut className="w-5 h-5 mb-4 text-slate-500" />

            <Dialog.Title className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Logout
            </Dialog.Title>
          </Flex>

          <Dialog.Description mb={"5"} className="text-xs text-slate-500 dark:text-slate-400">
            Are you sure you want to log out
            of your account?
          </Dialog.Description>

          <Flex
            justify="end"
            gap="2"
          >
            <Button
              variant="soft"
              color="gray"
              size="2"
              onClick={() =>
                setConfirmLogout(
                  false
                )
              }
              disabled={
                logoutLoading
              }
              className="cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              color="red"
              variant="solid"
              size="2"
              onClick={
                handleLogout
              }
              disabled={
                logoutLoading
              }
              className="cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-1" />

              {logoutLoading
                ? "Logging out..."
                : "Logout"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Delete Confirmation */}

      <Dialog.Root
        open={confirmDelete}
        onOpenChange={
          setConfirmDelete
        }
      >
        <Dialog.Content maxWidth={"450px"} className="max-w-sm p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-[var(--gray-a4)] shadow-2xl">
          <Flex
            align="center"
            gap="2"
            className="mb-2 text-rose-500"
          >
            <AlertTriangle className="w-5 h-5 mb-4" />

            <Dialog.Title className="text-base font-bold">
              Confirm Account Deletion
            </Dialog.Title>
          </Flex>

          <Dialog.Description mb={"4"} className="text-xs text-slate-500 dark:text-slate-400">
            Are you sure you want to permanently
            delete this user account? This action
            cannot be undone.
          </Dialog.Description>

          <Box className="p-3 mb-4 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 border border-[var(--gray-a3)] space-y-1">
            <Text
              size="1"
              color="gray"
              className="block"
            >
              <strong>Name:</strong>{" "}
              {watchFields.fullName ||
                "N/A"}
            </Text>

            <Text
              size="1"
              color="gray"
              className="block"
            >
              <strong>Public ID:</strong>{" "}
              {watchFields.publicId ||
                "N/A"}
            </Text>

            <Text
              size="1"
              color="gray"
              className="block"
            >
              <strong>Email:</strong>{" "}
              {watchFields.email ||
                "N/A"}
            </Text>

            <Text
              size="1"
              color="gray"
              className="block"
            >
              <strong>Phone:</strong>{" "}
              {watchFields.phone ||
                "N/A"}
            </Text>
          </Box>

          <Flex
            justify="end"
            gap="2"
          >
            <Button
              variant="soft"
              color="gray"
              size="2"
              onClick={() =>
                setConfirmDelete(
                  false
                )
              }
              className="cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              color="red"
              variant="solid"
              size="2"
              onClick={
                handleConfirmDelete
              }
              className="cursor-pointer"
            >
              Confirm Delete
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

export default React.memo(
  ProfileDialog
);