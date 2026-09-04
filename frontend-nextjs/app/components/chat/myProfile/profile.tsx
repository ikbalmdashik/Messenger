"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "sonner";

import API_ENDPOINTS from "@/app/routes/api";
import useCurrentUser, { initialUser } from "@/app/hooks/user/useCurrentUser";

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
} from "lucide-react";

interface FormFields {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

const ProfileDialog: React.FC = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editable, setEditable] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [formInitialValues, setFormInitialValues] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const user = useCurrentUser(userId);
  const isLoading = userId === null || user === initialUser;

  const { register, reset, watch } = useForm<FormFields>({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "",
    },
  });

  const watchFields = watch();

  useEffect(() => {
    const id = Number(sessionStorage.getItem("loginId"));
    if (!isNaN(id) && id > 0) setUserId(id);
  }, []);

  useEffect(() => {
    if (user && user !== initialUser) {
      const userData = {
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "",
      };
      reset(userData);
      setFormInitialValues({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
      });
    }
  }, [user, reset]);

  const hasChanged = useMemo(
    () =>
      watchFields.fullName !== formInitialValues.fullName ||
      watchFields.email !== formInitialValues.email ||
      watchFields.phone !== formInitialValues.phone,
    [watchFields, formInitialValues]
  );

  const initials = useMemo(() => {
    if (!watchFields.fullName) return "U";
    return watchFields.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [watchFields.fullName]);

  const handleUpdate = useCallback(async () => {
    try {
      const updatedData = {
        userId,
        fullName: watchFields.fullName,
        email: watchFields.email,
        phone: watchFields.phone,
        role: watchFields.role,
      };

      await axios.post(API_ENDPOINTS.UpdateUser, updatedData);

      toast.success("Profile updated successfully.");

      setFormInitialValues({
        fullName: updatedData.fullName,
        email: updatedData.email,
        phone: updatedData.phone,
      });

      setEditable(false);
    } catch (error) {
      toast.error("Failed to update profile.");
      console.error(error);
    }
  }, [userId, watchFields]);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await axios.post(API_ENDPOINTS.DeleteUser, { id: userId });

      toast.success("User account deleted successfully.");
      setConfirmDelete(false);
      setOpen(false);
    } catch (error) {
      toast.error("Delete failed. Please try again.");
      console.error(error);
    }
  }, [userId]);

  const handleMyProfileClick = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await axios.get(API_ENDPOINTS.GetUserById + userId);
      const profile = response.data;

      setFormInitialValues({
        fullName: profile.fullName || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });

      reset(profile);
      setEditable(false);
      setOpen(true);
    } catch (err) {
      toast.error("Failed to fetch profile details.");
    }
  }, [userId, reset]);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <IconButton
            variant="soft"
            color="gray"
            size="2"
            onClick={handleMyProfileClick}
            className="cursor-pointer rounded-full"
          >
            <UserIcon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </IconButton>
        </Dialog.Trigger>

        <Dialog.Content className="max-w-md p-6 rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xl border border-[var(--gray-a4)] shadow-2xl">
          <Flex align="center" justify="between" mb="3">
            <Box>
              <Dialog.Title className="text-lg font-bold text-slate-900 dark:text-slate-100">
                User Profile
              </Dialog.Title>
              <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400">
                Manage your account credentials and personal information.
              </Dialog.Description>
            </Box>

            <Dialog.Close>
              <IconButton variant="ghost" color="gray" size="1" className="cursor-pointer">
                <X className="w-4 h-4" />
              </IconButton>
            </Dialog.Close>
          </Flex>

          {isLoading ? (
            <Flex align="center" justify="center" className="py-8">
              <Text size="2" color="gray">
                Loading profile information...
              </Text>
            </Flex>
          ) : (
            <Flex direction="column" gap="4">
              {/* Profile Card Header */}
              <Flex align="center" gap="3" className="p-3 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 border border-[var(--gray-a3)]">
                <Avatar
                  size="4"
                  radius="full"
                  fallback={initials}
                  color="sky"
                  variant="soft"
                />
                <Box className="min-w-0 flex-1">
                  <Text size="3" weight="bold" className="text-slate-900 dark:text-slate-100 truncate block">
                    {watchFields.fullName || "User Account"}
                  </Text>
                  <Text size="1" color="gray" className="truncate block">
                    {watchFields.email}
                  </Text>
                </Box>
                {watchFields.role && (
                  <Badge color="sky" variant="soft" size="1" className="capitalize">
                    {watchFields.role}
                  </Badge>
                )}
              </Flex>

              {/* Form Input Fields */}
              <Flex direction="column" gap="3">
                <Box>
                  <Text size="1" weight="medium" color="gray" className="mb-1 block">
                    Full Name
                  </Text>
                  <TextField.Root
                    {...register("fullName")}
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

                <Box>
                  <Text size="1" weight="medium" color="gray" className="mb-1 block">
                    Email Address
                  </Text>
                  <TextField.Root
                    {...register("email")}
                    disabled={!editable}
                    placeholder="Email Address"
                    size="2"
                    variant="surface"
                    className="rounded-lg"
                  >
                    <TextField.Slot>
                      <Mail className="w-4 h-4 text-slate-400" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                <Box>
                  <Text size="1" weight="medium" color="gray" className="mb-1 block">
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

                <Box>
                  <Text size="1" weight="medium" color="gray" className="mb-1 block">
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

              <Separator size="4" className="my-1 opacity-50" />

              {/* Action Buttons Footer */}
              <Flex align="center" justify="between">
                <Button
                  color="red"
                  variant="soft"
                  size="2"
                  onClick={() => setConfirmDelete(true)}
                  className="cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>

                <Button
                  color={editable && hasChanged ? "sky" : "gray"}
                  variant={editable ? "solid" : "soft"}
                  size="2"
                  className="cursor-pointer"
                  onClick={() => {
                    if (!editable) {
                      setEditable(true);
                    } else if (editable && hasChanged) {
                      handleUpdate();
                    } else if (editable && !hasChanged) {
                      reset({
                        ...watchFields,
                        fullName: formInitialValues.fullName,
                        email: formInitialValues.email,
                        phone: formInitialValues.phone,
                      });
                      setEditable(false);
                      toast.info("Changes discarded.");
                    }
                  }}
                >
                  {!editable && (
                    <>
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit Profile
                    </>
                  )}
                  {editable && hasChanged && (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Save Changes
                    </>
                  )}
                  {editable && !hasChanged && (
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

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
        <Dialog.Content className="max-w-sm p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-[var(--gray-a4)] shadow-2xl">
          <Flex align="center" gap="2" className="mb-2 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
            <Dialog.Title className="text-base font-bold">Confirm Account Deletion</Dialog.Title>
          </Flex>

          <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Are you sure you want to permanently delete this user account? This action cannot be undone.
          </Dialog.Description>

          <Box className="p-3 mb-4 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 border border-[var(--gray-a3)] space-y-1">
            <Text size="1" color="gray" className="block">
              <strong>Name:</strong> {watchFields.fullName || "N/A"}
            </Text>
            <Text size="1" color="gray" className="block">
              <strong>Email:</strong> {watchFields.email || "N/A"}
            </Text>
            <Text size="1" color="gray" className="block">
              <strong>Phone:</strong> {watchFields.phone || "N/A"}
            </Text>
          </Box>

          <Flex justify="end" gap="2">
            <Button
              variant="soft"
              color="gray"
              size="2"
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              color="red"
              variant="solid"
              size="2"
              onClick={handleConfirmDelete}
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

export default React.memo(ProfileDialog);