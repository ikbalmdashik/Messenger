"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
    Lock,
    AlertCircle,
    Eye,
    EyeOff,
    ShieldCheck,
    Send,
    CheckCircle2,
    ArrowLeft,
} from "lucide-react";
import { MdClose } from "react-icons/md";
import axios from "axios";

import {
    Flex,
    Text,
    Box,
    TextField,
    AlertDialog,
    IconButton,
    Button,
    Select,
} from "@radix-ui/themes";

import API_ENDPOINTS from "@/app/routes/api";

/* =========================================================
   TYPES
========================================================= */

export type ContactOption = {
    id: string;
    label: string;
    type: "email" | "phone" | "otp";
    value: string;
};

export type VerificationPurpose =
    | "VERIFY_LOGIN"
    | "FORGOT_PASSWORD"
    | "CHANGE_PASSWORD"
    | "VERIFY_EMAIL";

export type PasswordModalProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;

    title?: string;
    subtitleAccount?: string;
    passwordError?: string | null;
    loadingState?: string | null;

    contactOptions?: ContactOption[];
    purpose?: VerificationPurpose;

    onVerifySuccess?: (method: "PASSWORD" | "OTP") => void | Promise<void>;
    onSwitchAccount?: () => void;
};

type ViewMode =
    | "PASSWORD"
    | "SELECT_CONTACT"
    | "ENTER_OTP"
    | "OTP_SUCCESS"
    | "SET_PASSWORD"
    | "PASSWORD_UPDATED";

const VIEW_TITLES: Record<ViewMode, string> = {
    PASSWORD: "Enter Password",
    SELECT_CONTACT: "Try Another Way",
    ENTER_OTP: "Enter Verification Code",
    OTP_SUCCESS: "Verification Successful",
    SET_PASSWORD: "Create New Password",
    PASSWORD_UPDATED: "Password Updated",
};

/* =========================================================
   COMPONENT
========================================================= */

export const PasswordModal: React.FC<PasswordModalProps> = ({
    isOpen,
    onOpenChange,
    title = "Enter Password",
    subtitleAccount,
    passwordError,
    loadingState,
    contactOptions = [],
    purpose = "VERIFY_LOGIN",
    onVerifySuccess,
}) => {
    /* =====================================================
       STATE
    ===================================================== */

    const [showPassword, setShowPassword] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("PASSWORD");

    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    const [selectedContactId, setSelectedContactId] = useState<string>("");
    const [sentContactValue, setSentContactValue] = useState<string>("");

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    /* =====================================================
       REACT HOOK FORM
    ===================================================== */

    const {
        register,
        trigger,
        watch,
        formState: { errors },
        resetField,
    } = useFormContext();

    /* =====================================================
       COMPUTED VALUES
    ===================================================== */

    const availableContacts = useMemo<ContactOption[]>(() => {
        if (contactOptions.length > 0) return contactOptions;
        return [
            {
                id: "1",
                label: subtitleAccount
                    ? `Email (${subtitleAccount})`
                    : "Primary Email",
                type: "email",
                value: subtitleAccount || "",
            },
        ];
    }, [contactOptions, subtitleAccount]);

    /* =====================================================
       HELPERS & HANDLERS
    ===================================================== */

    const getAxiosErrorMessage = (error: unknown) => {
        if (axios.isAxiosError(error)) {
            return (
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Something went wrong."
            );
        }
        return "Something went wrong.";
    };

    const handleVerifySuccess = useCallback(
        async (method: "PASSWORD" | "OTP") => {
            if (onVerifySuccess) {
                await onVerifySuccess(method);
                return;
            }
            onOpenChange(false);
        },
        [onVerifySuccess, onOpenChange]
    );

    /* =====================================================
       EFFECTS
    ===================================================== */

    // Clear success message timer
    useEffect(() => {
        if (!successMessage || viewMode === "PASSWORD_UPDATED") return;

        const timer = setTimeout(() => {
            setSuccessMessage(null);
        }, 5000);

        return () => clearTimeout(timer);
    }, [successMessage, viewMode]);

    // Reset component when closed
    useEffect(() => {
        if (!isOpen) {
            setViewMode("PASSWORD");
            setSelectedContactId("");
            setSentContactValue("");
            setSuccessMessage(null);
            setApiError(null);
            setShowPassword(false);
            setIsSendingOtp(false);
            setIsVerifyingOtp(false);
            setIsResettingPassword(false);
            setIsSubmittingPassword(false);
        }
    }, [isOpen]);

    // Auto-select first contact option
    useEffect(() => {
        if (viewMode === "SELECT_CONTACT" && !selectedContactId && availableContacts.length > 0) {
            setSelectedContactId(availableContacts[0].id);
        }
    }, [viewMode, selectedContactId, availableContacts]);

    /* =====================================================
       API CALLS
    ===================================================== */

    const handlePasswordSubmit = async () => {
        if (isSubmittingPassword) return;

        const isValid = await trigger("password");
        if (!isValid) return;

        const password = watch("password");
        if (!password || !subtitleAccount) {
            setApiError("Account email or password missing.");
            return;
        }

        setApiError(null);
        setSuccessMessage(null);
        setIsSubmittingPassword(true);

        try {
            const response = await axios.post(
                API_ENDPOINTS.LoginAuth,
                { email: subtitleAccount, password, type: purpose },
                { withCredentials: true }
            );

            if (response.data?.success === false) {
                setApiError(response.data?.message || "Invalid password.");
                return;
            }

            await handleVerifySuccess("PASSWORD");
        } catch (error) {
            console.error("Password verification failed:", error);
            setApiError(getAxiosErrorMessage(error));
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    const handleSendOtpClick = async () => {
        if (isSendingOtp) return;

        const contact =
            availableContacts.find((c) => c.id === selectedContactId) || availableContacts[0];

        if (!contact?.value) {
            setApiError("The selected contact method is invalid.");
            return;
        }

        setApiError(null);
        setSuccessMessage(null);
        setIsSendingOtp(true);

        try {
            await axios.post(
                API_ENDPOINTS.SendLink,
                { email: contact.value, type: purpose },
                { withCredentials: true }
            );

            setSentContactValue(contact.value);
            resetField("otpCode");
            setSuccessMessage(`OTP sent successfully to ${contact.value}.`);
            setViewMode("ENTER_OTP");
        } catch (error) {
            console.error("Failed to send OTP:", error);
            setApiError(getAxiosErrorMessage(error));
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleOtpVerifySubmit = async () => {
        if (isVerifyingOtp) return;

        const isValid = await trigger("otpCode");
        if (!isValid) return;

        const otp = watch("otpCode");
        if (!otp || !sentContactValue) {
            setApiError("Verification contact or OTP is missing.");
            return;
        }

        setApiError(null);
        setSuccessMessage(null);
        setIsVerifyingOtp(true);

        try {
            const response = await axios.post(
                API_ENDPOINTS.LoginAuth,
                { email: sentContactValue, otp, type: purpose },
                { withCredentials: true }
            );

            if (response.data?.success === false) {
                setApiError(response.data?.message || "OTP verification failed.");
                return;
            }

            setViewMode("OTP_SUCCESS");
            setSuccessMessage("Verification successful!");
        } catch (error) {
            console.error("OTP verification failed:", error);
            setApiError(getAxiosErrorMessage(error));
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleResetPassword = async () => {
        if (isResettingPassword) return;

        const isValid = await trigger(["newPassword", "confirmPassword"]);
        if (!isValid) return;

        const newPassword = watch("newPassword");
        if (!newPassword || !sentContactValue) {
            setApiError("Verification contact or new password missing.");
            return;
        }

        setApiError(null);
        setSuccessMessage(null);
        setIsResettingPassword(true);

        try {
            const response = await axios.post(
                API_ENDPOINTS.UpdatePassword,
                { token: watch("otpCode"), newPassword },
                { withCredentials: true }
            );

            if (response.data?.success === false) {
                setApiError(response.data?.message || "Password update failed.");
                return;
            }

            setSuccessMessage("Password updated successfully!");
            setViewMode("PASSWORD_UPDATED");
        } catch (error) {
            console.error("Password update failed:", error);
            setApiError(getAxiosErrorMessage(error));
        } finally {
            setIsResettingPassword(false);
        }
    };

    /* =====================================================
       RENDER HELPERS
    ===================================================== */

    const renderPasswordView = () => (
        <div className="space-y-4">
            <Box>
                <Flex justify="between" align="center" mb="2">
                    <Text as="label" size="2" weight="medium" htmlFor="dialogPassword">
                        Password
                    </Text>
                    <Button
                        type="button"
                        variant="ghost"
                        color="indigo"
                        size="1"
                        onClick={() => {
                            setApiError(null);
                            setSuccessMessage(null);
                            resetField("password");
                            setViewMode("SELECT_CONTACT");
                        }}
                        className="cursor-pointer hover:underline p-0 h-auto"
                    >
                        Try another way?
                    </Button>
                </Flex>

                <TextField.Root
                    id="dialogPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder={showPassword ? "Enter password" : "●●●●●●●●"}
                    className={!showPassword ? "tracking-[3px]" : ""}
                    {...register("password", {
                        required: viewMode === "PASSWORD" ? "Password is required" : false,
                    })}
                >
                    <TextField.Slot>
                        <Lock className="w-5 h-5 text-gray-400" />
                    </TextField.Slot>
                    <TextField.Slot pr="2">
                        <IconButton
                            size="1"
                            variant="ghost"
                            color="gray"
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            {showPassword ? (
                                <EyeOff className="w-4 h-4 text-gray-500" />
                            ) : (
                                <Eye className="w-4 h-4 text-gray-500" />
                            )}
                        </IconButton>
                    </TextField.Slot>
                </TextField.Root>

                {(errors.password || passwordError) && (
                    <Flex align="center" gap="1" mt="1.5" className="text-red-500">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <Text size="2" color="red">
                            {(errors.password?.message as string) || passwordError}
                        </Text>
                    </Flex>
                )}
            </Box>

            <Button
                type="button"
                onClick={handlePasswordSubmit}
                loading={isSubmittingPassword || loadingState === "login"}
                disabled={isSubmittingPassword || loadingState === "login"}
                style={{ width: "100%" }}
            >
                Verify Password
            </Button>
        </div>
    );

    const renderSelectContactView = () => (
        <div className="space-y-4">
            <Button
                type="button"
                variant="ghost"
                color="indigo"
                size="2"
                disabled={isSendingOtp}
                onClick={() => {
                    setApiError(null);
                    setSuccessMessage(null);
                    resetField("otpCode");
                    setViewMode("PASSWORD");
                }}
                className="w-full justify-center"
            >
                <Flex align="center" gap="2" justify="center">
                    <ArrowLeft className="w-4 h-4" />
                    <Text size="2">Use Password Instead</Text>
                </Flex>
            </Button>

            <Box>
                <Box mb="2">
                    <Text as="label" size="2" weight="medium">
                        Select Contact Option
                    </Text>
                </Box>
                <Select.Root
                    value={selectedContactId || availableContacts[0]?.id}
                    onValueChange={setSelectedContactId}
                >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content position="popper">
                        {availableContacts.map((contact) => (
                            <Select.Item key={contact.id} value={contact.id}>
                                {contact.label}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
            </Box>

            <Button
                type="button"
                variant="solid"
                onClick={handleSendOtpClick}
                loading={isSendingOtp}
                disabled={isSendingOtp}
                style={{ width: "100%" }}
            >
                <Flex align="center" gap="2" justify="center">
                    <Send className="w-4 h-4" />
                    <Text>Send OTP</Text>
                </Flex>
            </Button>
        </div>
    );

    const renderEnterOtpView = () => (
        <div className="space-y-4">
            <Box>
                <Box mb="2">
                    <Text as="label" size="2" weight="medium" htmlFor="otpCode">
                        Enter OTP
                    </Text>
                </Box>
                <TextField.Root
                    id="otpCode"
                    type="text"
                    placeholder="Enter verification code"
                    {...register("otpCode", {
                        required: viewMode === "ENTER_OTP" ? "Verification code is required" : false,
                    })}
                >
                    <TextField.Slot>
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    </TextField.Slot>
                </TextField.Root>

                {errors.otpCode && (
                    <Flex align="center" gap="1" mt="1.5" className="text-red-500">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <Text size="2" color="red">
                            {errors.otpCode?.message as string}
                        </Text>
                    </Flex>
                )}
            </Box>

            <Flex justify="between" align="center">
                <Button
                    type="button"
                    variant="ghost"
                    color="gray"
                    size="1"
                    onClick={() => {
                        setViewMode("SELECT_CONTACT");
                        setApiError(null);
                        setSuccessMessage(null);
                    }}
                    disabled={isVerifyingOtp || isSendingOtp}
                >
                    Change Contact Method
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    color="sky"
                    size="1"
                    onClick={handleSendOtpClick}
                    loading={isSendingOtp}
                    disabled={isSendingOtp || isVerifyingOtp}
                >
                    Resend OTP
                </Button>
            </Flex>

            <Button
                type="button"
                onClick={handleOtpVerifySubmit}
                loading={isVerifyingOtp || loadingState === "verifyOtp"}
                disabled={isVerifyingOtp || isSendingOtp || loadingState === "verifyOtp"}
                style={{ width: "100%" }}
            >
                Verify
            </Button>
        </div>
    );

    const renderOtpSuccessView = () => (
        <div className="space-y-4">
            <Box className="p-2.5 text-center">
                <Text size="2">Your identity has been successfully verified.</Text>
            </Box>
            <Button
                type="button"
                onClick={() => {
                    setApiError(null);
                    setSuccessMessage(null);
                    resetField("newPassword");
                    resetField("confirmPassword");
                    setViewMode("SET_PASSWORD");
                }}
                style={{ width: "100%" }}
            >
                Update Password
            </Button>
            <Button
                type="button"
                variant="soft"
                color="gray"
                mt={"2"}
                onClick={() => handleVerifySuccess("OTP")}
                style={{ width: "100%" }}
            >
                Skip for now
            </Button>
        </div>
    );

    const renderSetPasswordView = () => (
        <div className="space-y-4">
            {/* Back Button */}
            <Button
                type="button"
                variant="ghost"
                color="gray"
                size="1"
                disabled={isResettingPassword}
                onClick={() => {
                    setApiError(null);
                    setSuccessMessage(null);
                    setViewMode("OTP_SUCCESS");
                }}
                className="cursor-pointer"
            >
                <Flex align="center" gap="1">
                    <ArrowLeft className="w-4 h-4" />
                    <Text size="2">Back</Text>
                </Flex>
            </Button>

            <Box>
                <Text as="label" size="2" weight="medium" htmlFor="newPassword">
                    New Password
                </Text>
                <TextField.Root
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    {...register("newPassword", {
                        required: "New password is required",
                        minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters",
                        },
                    })}
                >
                    <TextField.Slot>
                        <Lock className="w-5 h-5 text-gray-400" />
                    </TextField.Slot>
                </TextField.Root>
                {errors.newPassword && (
                    <Flex align="center" gap="1" mt="1.5" className="text-red-500">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <Text size="2" color="red">
                            {errors.newPassword?.message as string}
                        </Text>
                    </Flex>
                )}
            </Box>

            <Box>
                <Text as="label" size="2" weight="medium" htmlFor="confirmPassword">
                    Confirm Password
                </Text>
                <TextField.Root
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    {...register("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (value) =>
                            value === watch("newPassword") || "Passwords do not match",
                    })}
                >
                    <TextField.Slot>
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    </TextField.Slot>
                </TextField.Root>
                {errors.confirmPassword && (
                    <Flex align="center" gap="1" mt="1.5" className="text-red-500">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <Text size="2" color="red">
                            {errors.confirmPassword?.message as string}
                        </Text>
                    </Flex>
                )}
            </Box>

            <Button
                type="button"
                onClick={handleResetPassword}
                loading={isResettingPassword || loadingState === "resetPassword"}
                disabled={isResettingPassword || loadingState === "resetPassword"}
                style={{ width: "100%" }}
            >
                Update Password
            </Button>
        </div>
    );

    const renderPasswordUpdatedView = () => (
        <div className="space-y-4">
            <Box className="p-2.5 text-center">
                <Text size="2">Your password has been updated successfully.</Text>
            </Box>
            <Button
                type="button"
                onClick={() => handleVerifySuccess("OTP")}
                style={{ width: "100%" }}
            >
                Continue
            </Button>
        </div>
    );

    /* =====================================================
       MAIN RENDER
    ===================================================== */

    return (
        <AlertDialog.Root open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialog.Content maxWidth="400px" className="relative p-6 overflow-hidden">
                {/* CLOSE */}
                <Box className="absolute top-3 right-3">
                    <AlertDialog.Cancel>
                        <IconButton variant="ghost" color="gray" type="button" size="2">
                            <MdClose className="w-5 h-5" />
                        </IconButton>
                    </AlertDialog.Cancel>
                </Box>

                {/* HEADER */}
                <Flex direction="column" align="center" className="text-center pt-2">
                    <AlertDialog.Title className="text-center">
                        {VIEW_TITLES[viewMode] || title}
                    </AlertDialog.Title>

                    {subtitleAccount && (
                        <AlertDialog.Description size="2" my="2" className="text-center">
                            Account: <strong>{subtitleAccount}</strong>
                        </AlertDialog.Description>
                    )}

                    {/* SUCCESS NOTIFICATION */}
                    <AnimatePresence>
                        {successMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="w-full my-2"
                            >
                                <Box className="bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded p-3 text-left">
                                    <Flex align="center" gap="2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                        <Text size="2" weight="medium" className="text-emerald-900 dark:text-emerald-100">
                                            {successMessage}
                                        </Text>
                                    </Flex>
                                </Box>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ERROR NOTIFICATION */}
                    <AnimatePresence>
                        {apiError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="w-full my-2"
                            >
                                <Box className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded p-3 text-left">
                                    <Flex align="center" gap="2">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <Text size="2" color="red">
                                            {apiError}
                                        </Text>
                                    </Flex>
                                </Box>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* DYNAMIC VIEW CONTAINER */}
                    <Box width="100%" my="3" className="text-left">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={viewMode}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {viewMode === "PASSWORD" && renderPasswordView()}
                                {viewMode === "SELECT_CONTACT" && renderSelectContactView()}
                                {viewMode === "ENTER_OTP" && renderEnterOtpView()}
                                {viewMode === "OTP_SUCCESS" && renderOtpSuccessView()}
                                {viewMode === "SET_PASSWORD" && renderSetPasswordView()}
                                {viewMode === "PASSWORD_UPDATED" && renderPasswordUpdatedView()}
                            </motion.div>
                        </AnimatePresence>
                    </Box>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
};

export default PasswordModal;