"use client";

import React, { useEffect, useState } from "react";
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

    onSubmitPassword: () => void | Promise<boolean | void>;

    onPasswordReset?: (
        newPassword: string
    ) => Promise<boolean | void> | boolean | void;

    onSuccessNext?: () => void | Promise<void>;

    onOtpVerified?: () => void | Promise<void>;

    onSwitchAccount?: () => void;
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

    onSubmitPassword,
    onPasswordReset,
    onSuccessNext,
    onOtpVerified,
    onSwitchAccount,
}) => {
    /* =====================================================
       STATE
    ===================================================== */

    const [showPassword, setShowPassword] = useState(false);

    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] =
        useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] =
        useState(false);

    const [viewMode, setViewMode] = useState<
        "PASSWORD" |
        "SELECT_CONTACT" |
        "ENTER_OTP" |
        "SET_PASSWORD"
    >("PASSWORD");

    const [selectedContactId, setSelectedContactId] =
        useState<string>("");

    const [sentContactLabel, setSentContactLabel] =
        useState<string>("");

    const [sentContactValue, setSentContactValue] =
        useState<string>("");

    const [successMessage, setSuccessMessage] =
        useState<string | null>(null);

    const [apiError, setApiError] =
        useState<string | null>(null);

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
       AVAILABLE CONTACTS
    ===================================================== */

    const availableContacts: ContactOption[] =
        contactOptions.length > 0
            ? contactOptions
            : [
                {
                    id: "1",
                    label: subtitleAccount
                        ? `Email (${subtitleAccount})`
                        : "Primary Email",
                    type: "email",
                    value: subtitleAccount || "",
                },
            ];

    /* =====================================================
       SUCCESS MESSAGE TIMER
    ===================================================== */

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timer = setTimeout(() => {
            setSuccessMessage(null);
        }, 5000);

        return () => clearTimeout(timer);
    }, [successMessage]);

    /* =====================================================
       RESET WHEN MODAL CLOSES
    ===================================================== */

    useEffect(() => {
        if (!isOpen) {
            setViewMode("PASSWORD");

            setSelectedContactId("");

            setSentContactLabel("");
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

    /* =====================================================
       AUTO SELECT FIRST CONTACT
    ===================================================== */

    useEffect(() => {
        if (
            viewMode === "SELECT_CONTACT" &&
            !selectedContactId &&
            availableContacts.length > 0
        ) {
            setSelectedContactId(
                availableContacts[0].id
            );
        }
    }, [
        viewMode,
        selectedContactId,
        availableContacts,
    ]);

    /* =====================================================
       ERROR HANDLER
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

    /* =====================================================
       SWITCH TO TRY ANOTHER WAY
    ===================================================== */

    const handleSwitchToTryAnotherWay = () => {
        setApiError(null);

        resetField("password");

        if (availableContacts.length > 0) {
            setSelectedContactId(
                availableContacts[0].id
            );
        }

        setViewMode("SELECT_CONTACT");
    };

    /* =====================================================
       SWITCH BACK TO PASSWORD
    ===================================================== */

    const handleSwitchToPassword = () => {
        setApiError(null);

        resetField("otpCode");

        setViewMode("PASSWORD");
    };

    /* =====================================================
       SEND OTP
    ===================================================== */

    const handleSendOtpClick = async () => {
        if (isSendingOtp) {
            return;
        }

        const contact =
            availableContacts.find(
                (c) =>
                    c.id === selectedContactId
            ) ||
            availableContacts[0];

        if (!contact) {
            setApiError(
                "No contact method is available."
            );

            return;
        }

        if (!contact.value) {
            setApiError(
                "The selected contact does not have a valid value."
            );

            return;
        }

        setApiError(null);
        setIsSendingOtp(true);

        try {
            const response = await axios.post(
                API_ENDPOINTS.SendLink,
                {
                    email: contact.value,
                    type: purpose,
                },
                {
                    withCredentials: true,
                }
            );

            console.log(
                "OTP sent successfully:",
                response.data
            );

            setSentContactLabel(
                contact.type === "email"
                    ? contact.value
                    : contact.label
            );

            setSentContactValue(
                contact.value
            );

            resetField("otpCode");

            setViewMode("ENTER_OTP");
        } catch (error) {
            console.error(
                "Failed to send OTP:",
                error
            );

            setApiError(
                getAxiosErrorMessage(error)
            );
        } finally {
            setIsSendingOtp(false);
        }
    };

    /* =====================================================
       VERIFY OTP
    ===================================================== */

    const handleOtpVerifySubmit = async () => {
        if (isVerifyingOtp) {
            return;
        }

        const isValid =
            await trigger("otpCode");

        if (!isValid) {
            return;
        }

        const otp = watch("otpCode");

        if (!otp) {
            return;
        }

        if (!sentContactValue) {
            setApiError(
                "Verification contact is missing."
            );

            return;
        }

        setApiError(null);
        setIsVerifyingOtp(true);

        try {
            const response = await axios.post(
                API_ENDPOINTS.VerifyOtp,
                {
                    email: sentContactValue,
                    otp,
                    type: purpose,
                },
                {
                    withCredentials: true,
                }
            );

            /* =============================================
               VERIFY_LOGIN
            ============================================= */

            if (purpose === "VERIFY_LOGIN") {
                await onOtpVerified?.();

                return;
            }

            /* =============================================
               FORGOT PASSWORD
            ============================================= */

            if (
                purpose ===
                "FORGOT_PASSWORD"
            ) {
                resetField("newPassword");
                resetField("confirmPassword");

                setViewMode(
                    "SET_PASSWORD"
                );

                return;
            }

            /* =============================================
               CHANGE PASSWORD / VERIFY EMAIL
            ============================================= */

            setSuccessMessage(
                "Verification successful!"
            );

            if (onSuccessNext) {
                await onSuccessNext();
            } else {
                onOpenChange(false);
            }
        } catch (error) {
            console.error(
                "OTP verification failed:",
                error
            );

            setApiError(
                getAxiosErrorMessage(error)
            );
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    /* =====================================================
       RESET PASSWORD
    ===================================================== */

    const handleResetPassword = async () => {
        if (isResettingPassword) {
            return;
        }

        const isValid = await trigger([
            "newPassword",
            "confirmPassword",
        ]);

        if (!isValid) {
            return;
        }

        const newPassword =
            watch("newPassword");

        if (!newPassword) {
            return;
        }

        setApiError(null);
        setIsResettingPassword(true);

        try {
            /* =============================================
               PARENT PASSWORD RESET HANDLER
            ============================================= */

            if (onPasswordReset) {
                const result =
                    await onPasswordReset(
                        newPassword
                    );

                if (result === false) {
                    return;
                }

                setSuccessMessage(
                    "Password updated successfully!"
                );

                if (onSuccessNext) {
                    await onSuccessNext();
                } else {
                    onOpenChange(false);
                }

                return;
            }

            /* =============================================
               INTERNAL PASSWORD RESET API
            ============================================= */

            const response =
                await axios.post(
                    API_ENDPOINTS.ResetPassword,
                    {
                        email:
                            sentContactValue,
                        newPassword,
                        type:
                            "FORGOT_PASSWORD",
                    },
                    {
                        withCredentials: true,
                    }
                );

            console.log(
                "Password reset successfully:",
                response.data
            );

            setSuccessMessage(
                "Password updated successfully!"
            );

            if (onSuccessNext) {
                await onSuccessNext();
            } else {
                onOpenChange(false);
            }
        } catch (error) {
            console.error(
                "Password reset failed:",
                error
            );

            setApiError(
                getAxiosErrorMessage(error)
            );
        } finally {
            setIsResettingPassword(false);
        }
    };

    /* =====================================================
       PASSWORD SUBMIT
    ===================================================== */

    const handlePasswordSubmit = async () => {
        if (isSubmittingPassword) {
            return;
        }

        const isValid =
            await trigger("password");

        if (!isValid) {
            return;
        }

        setApiError(null);
        setIsSubmittingPassword(true);

        try {
            const success =
                await onSubmitPassword();

            if (success !== false) {
                if (onSuccessNext) {
                    await onSuccessNext();
                } else {
                    onOpenChange(false);
                }
            }
        } catch (error) {
            console.error(
                "Password verification failed:",
                error
            );

            setApiError(
                getAxiosErrorMessage(error)
            );
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    /* =====================================================
       TITLE
    ===================================================== */

    const getTitle = () => {
        switch (viewMode) {
            case "PASSWORD":
                return title;

            case "SELECT_CONTACT":
                return "Try Another Way";

            case "ENTER_OTP":
                return "Enter Verification Code";

            case "SET_PASSWORD":
                return "Create New Password";

            default:
                return title;
        }
    };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <AlertDialog.Root
            open={isOpen}
            onOpenChange={onOpenChange}
        >
            <AlertDialog.Content
                maxWidth="400px"
                className="relative p-6 overflow-hidden"
            >
                {/* CLOSE */}

                <Box className="absolute top-3 right-3">
                    <AlertDialog.Cancel>
                        <IconButton
                            variant="ghost"
                            color="gray"
                            type="button"
                            size="2"
                        >
                            <MdClose className="w-5 h-5" />
                        </IconButton>
                    </AlertDialog.Cancel>
                </Box>

                {/* HEADER */}

                <Flex
                    direction="column"
                    align="center"
                    className="text-center pt-2"
                >
                    <AlertDialog.Title className="text-center">
                        {getTitle()}
                    </AlertDialog.Title>

                    {subtitleAccount && (
                        <AlertDialog.Description
                            size="2"
                            my="2"
                            className="text-center"
                        >
                            Account:{" "}
                            <strong>
                                {subtitleAccount}
                            </strong>
                        </AlertDialog.Description>
                    )}

                    {/* SUCCESS */}

                    <AnimatePresence>
                        {successMessage && (
                            <motion.div
                                initial={{
                                    opacity: 0,
                                    y: -10,
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    y: -10,
                                }}
                                transition={{
                                    duration: 0.2,
                                }}
                                className="w-full my-2"
                            >
                                <Box
                                    className="
                                        bg-emerald-100
                                        dark:bg-emerald-950/80
                                        border
                                        border-emerald-300
                                        dark:border-emerald-700
                                        rounded-lg
                                        p-3
                                        text-left
                                    "
                                >
                                    <Flex
                                        align="center"
                                        gap="2"
                                    >
                                        <CheckCircle2
                                            className="
                                                w-5 h-5
                                                text-emerald-600
                                                flex-shrink-0
                                            "
                                        />

                                        <Text
                                            size="2"
                                            weight="medium"
                                            className="
                                                text-emerald-900
                                                dark:text-emerald-100
                                            "
                                        >
                                            {successMessage}
                                        </Text>
                                    </Flex>
                                </Box>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* API ERROR */}

                    <AnimatePresence>
                        {apiError && (
                            <motion.div
                                initial={{
                                    opacity: 0,
                                    y: -10,
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    y: -10,
                                }}
                                className="w-full my-2"
                            >
                                <Box
                                    className="
                                        bg-red-50
                                        dark:bg-red-950/40
                                        border
                                        border-red-200
                                        dark:border-red-800
                                        rounded-lg
                                        p-3
                                        text-left
                                    "
                                >
                                    <Flex
                                        align="center"
                                        gap="2"
                                    >
                                        <AlertCircle
                                            className="
                                                w-5 h-5
                                                text-red-500
                                                flex-shrink-0
                                            "
                                        />

                                        <Text
                                            size="2"
                                            color="red"
                                        >
                                            {apiError}
                                        </Text>
                                    </Flex>
                                </Box>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CONTENT */}

                    <Box
                        width="100%"
                        my="3"
                        className="text-left"
                    >
                        <AnimatePresence mode="wait">

                            {/* PASSWORD */}

                            {viewMode ===
                                "PASSWORD" && (
                                    <motion.div
                                        key="password-view"
                                        initial={{
                                            opacity: 0,
                                            x: -20,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            x: 20,
                                        }}
                                        transition={{
                                            duration: 0.2,
                                        }}
                                        className="space-y-4"
                                    >
                                        <Box>
                                            <Flex
                                                justify="between"
                                                align="center"
                                                mb="2"
                                            >
                                                <Text
                                                    as="label"
                                                    size="2"
                                                    weight="medium"
                                                    htmlFor="dialogPassword"
                                                >
                                                    Password
                                                </Text>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    color="indigo"
                                                    size="1"
                                                    mr="2"
                                                    onClick={
                                                        handleSwitchToTryAnotherWay
                                                    }
                                                    className="
                                                    cursor-pointer
                                                    hover:underline
                                                    p-0
                                                    h-auto
                                                "
                                                >
                                                    Try another way?
                                                </Button>
                                            </Flex>

                                            <TextField.Root
                                                id="dialogPassword"
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder={
                                                    showPassword
                                                        ? "Enter password"
                                                        : "●●●●●●●●"
                                                }
                                                className={
                                                    !showPassword
                                                        ? "tracking-[3px]"
                                                        : ""
                                                }
                                                {...register(
                                                    "password",
                                                    {
                                                        required:
                                                            viewMode ===
                                                                "PASSWORD"
                                                                ? "Password is required"
                                                                : false,
                                                    }
                                                )}
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
                                                        onClick={() =>
                                                            setShowPassword(
                                                                (prev) =>
                                                                    !prev
                                                            )
                                                        }
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-4 h-4 text-gray-500" />
                                                        ) : (
                                                            <Eye className="w-4 h-4 text-gray-500" />
                                                        )}
                                                    </IconButton>
                                                </TextField.Slot>
                                            </TextField.Root>

                                            {(errors.password ||
                                                passwordError) && (
                                                    <Flex
                                                        align="center"
                                                        gap="1"
                                                        mt="1.5"
                                                        className="text-red-500"
                                                    >
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />

                                                        <Text
                                                            size="2"
                                                            color="red"
                                                        >
                                                            {(errors
                                                                .password
                                                                ?.message as string) ||
                                                                passwordError}
                                                        </Text>
                                                    </Flex>
                                                )}
                                        </Box>

                                        <Button
                                            type="button"
                                            onClick={
                                                handlePasswordSubmit
                                            }
                                            loading={
                                                isSubmittingPassword ||
                                                loadingState ===
                                                "login"
                                            }
                                            disabled={
                                                isSubmittingPassword ||
                                                loadingState ===
                                                "login"
                                            }
                                            style={{
                                                width: "100%",
                                            }}
                                        >
                                            Verify Password
                                        </Button>
                                    </motion.div>
                                )}

                            {/* SELECT CONTACT */}

                            {viewMode ===
                                "SELECT_CONTACT" && (
                                    <motion.div
                                        key="select-contact-view"
                                        initial={{
                                            opacity: 0,
                                            x: 20,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            x: -20,
                                        }}
                                        transition={{
                                            duration: 0.2,
                                        }}
                                        className="space-y-4"
                                    >
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            color="indigo"
                                            size="2"
                                            disabled={
                                                isSendingOtp
                                            }
                                            onClick={
                                                handleSwitchToPassword
                                            }
                                            className="w-full justify-center"
                                        >
                                            <Flex
                                                align="center"
                                                gap="2"
                                                justify="center"
                                            >
                                                <ArrowLeft className="w-4 h-4" />

                                                <Text size="2">
                                                    Use Password
                                                    Instead
                                                </Text>
                                            </Flex>
                                        </Button>

                                        <Box>
                                            <Box mb="2">
                                                <Text
                                                    as="label"
                                                    size="2"
                                                    weight="medium"
                                                >
                                                    Select Contact
                                                    Option
                                                </Text>
                                            </Box>

                                            <Select.Root
                                                value={
                                                    selectedContactId ||
                                                    availableContacts[0]
                                                        ?.id
                                                }
                                                onValueChange={
                                                    setSelectedContactId
                                                }
                                            >
                                                <Select.Trigger
                                                    style={{
                                                        width: "100%",
                                                    }}
                                                />

                                                <Select.Content
                                                    position="popper"
                                                >
                                                    {availableContacts.map(
                                                        (
                                                            contact
                                                        ) => (
                                                            <Select.Item
                                                                key={
                                                                    contact.id
                                                                }
                                                                value={
                                                                    contact.id
                                                                }
                                                            >
                                                                {
                                                                    contact.label
                                                                }
                                                            </Select.Item>
                                                        )
                                                    )}
                                                </Select.Content>
                                            </Select.Root>
                                        </Box>

                                        <Button
                                            type="button"
                                            variant="solid"
                                            onClick={
                                                handleSendOtpClick
                                            }
                                            loading={
                                                isSendingOtp
                                            }
                                            disabled={
                                                isSendingOtp
                                            }
                                            style={{
                                                width: "100%",
                                            }}
                                        >
                                            <Flex
                                                align="center"
                                                gap="2"
                                                justify="center"
                                            >
                                                <Send className="w-4 h-4" />

                                                <Text>
                                                    Send OTP
                                                </Text>
                                            </Flex>
                                        </Button>
                                    </motion.div>
                                )}

                            {/* OTP */}

                            {viewMode ===
                                "ENTER_OTP" && (
                                    <motion.div
                                        key="enter-otp-view"
                                        initial={{
                                            opacity: 0,
                                            x: 20,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            x: -20,
                                        }}
                                        transition={{
                                            duration: 0.2,
                                        }}
                                        className="space-y-4"
                                    >
                                        <Box className="p-2.5 text-center">
                                            <Text size="2">
                                                OTP sent successfully
                                                to{" "}
                                                <strong>
                                                    {sentContactLabel ||
                                                        "your contact"}
                                                </strong>
                                                .
                                            </Text>
                                        </Box>

                                        <Box>
                                            <Box mb="2">
                                                <Text
                                                    as="label"
                                                    size="2"
                                                    weight="medium"
                                                    htmlFor="otpCode"
                                                >
                                                    Enter OTP
                                                </Text>
                                            </Box>

                                            <TextField.Root
                                                id="otpCode"
                                                type="text"
                                                placeholder="Enter verification code"
                                                {...register("otpCode", {
                                                    required:
                                                        viewMode === "ENTER_OTP"
                                                            ? "Verification code is required"
                                                            : false,
                                                })}
                                            >
                                                <TextField.Slot>
                                                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                                </TextField.Slot>
                                            </TextField.Root>

                                            {errors.otpCode && (
                                                <Flex
                                                    align="center"
                                                    gap="1"
                                                    mt="1.5"
                                                    className="text-red-500"
                                                >
                                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />

                                                    <Text
                                                        size="2"
                                                        color="red"
                                                    >
                                                        {
                                                            errors
                                                                .otpCode
                                                                ?.message as string
                                                        }
                                                    </Text>
                                                </Flex>
                                            )}
                                        </Box>

                                        <Flex
                                            justify="between"
                                            align="center"
                                        >
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                color="gray"
                                                size="1"
                                                ml="2"
                                                onClick={() =>
                                                    setViewMode(
                                                        "SELECT_CONTACT"
                                                    )
                                                }
                                                disabled={
                                                    isVerifyingOtp ||
                                                    isSendingOtp
                                                }
                                            >
                                                Change Contact
                                                Method
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                color="sky"
                                                size="1"
                                                mr="2"
                                                onClick={
                                                    handleSendOtpClick
                                                }
                                                loading={
                                                    isSendingOtp
                                                }
                                                disabled={
                                                    isSendingOtp ||
                                                    isVerifyingOtp
                                                }
                                            >
                                                Resend OTP
                                            </Button>
                                        </Flex>

                                        <Button
                                            type="button"
                                            onClick={
                                                handleOtpVerifySubmit
                                            }
                                            loading={
                                                isVerifyingOtp ||
                                                loadingState ===
                                                "verifyOtp"
                                            }
                                            disabled={
                                                isVerifyingOtp ||
                                                loadingState ===
                                                "verifyOtp"
                                            }
                                            style={{
                                                width: "100%",
                                            }}
                                        >
                                            Verify
                                        </Button>
                                    </motion.div>
                                )}

                            {/* SET PASSWORD */}

                            {viewMode ===
                                "SET_PASSWORD" && (
                                    <motion.div
                                        key="set-password-view"
                                        initial={{
                                            opacity: 0,
                                            x: 20,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            x: -20,
                                        }}
                                        transition={{
                                            duration: 0.2,
                                        }}
                                        className="space-y-4"
                                    >
                                        <Box>
                                            <Text
                                                as="label"
                                                size="2"
                                                weight="medium"
                                                htmlFor="newPassword"
                                            >
                                                New Password
                                            </Text>

                                            <TextField.Root
                                                id="newPassword"
                                                type="password"
                                                placeholder="Enter new password"
                                                {...register(
                                                    "newPassword",
                                                    {
                                                        required:
                                                            "New password is required",

                                                        minLength: {
                                                            value: 8,
                                                            message:
                                                                "Password must be at least 8 characters",
                                                        },
                                                    }
                                                )}
                                            >
                                                <TextField.Slot>
                                                    <Lock className="w-5 h-5 text-gray-400" />
                                                </TextField.Slot>
                                            </TextField.Root>

                                            {errors.newPassword && (
                                                <Flex
                                                    align="center"
                                                    gap="1"
                                                    mt="1.5"
                                                    className="text-red-500"
                                                >
                                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />

                                                    <Text
                                                        size="2"
                                                        color="red"
                                                    >
                                                        {
                                                            errors
                                                                .newPassword
                                                                ?.message as string
                                                        }
                                                    </Text>
                                                </Flex>
                                            )}
                                        </Box>

                                        <Box>
                                            <Text
                                                as="label"
                                                size="2"
                                                weight="medium"
                                                htmlFor="confirmPassword"
                                            >
                                                Confirm Password
                                            </Text>

                                            <TextField.Root
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="Confirm new password"
                                                {...register(
                                                    "confirmPassword",
                                                    {
                                                        required:
                                                            "Please confirm your password",

                                                        validate:
                                                            (
                                                                value
                                                            ) =>
                                                                value ===
                                                                watch(
                                                                    "newPassword"
                                                                ) ||
                                                                "Passwords do not match",
                                                    }
                                                )}
                                            >
                                                <TextField.Slot>
                                                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                                </TextField.Slot>
                                            </TextField.Root>

                                            {errors.confirmPassword && (
                                                <Flex
                                                    align="center"
                                                    gap="1"
                                                    mt="1.5"
                                                    className="text-red-500"
                                                >
                                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />

                                                    <Text
                                                        size="2"
                                                        color="red"
                                                    >
                                                        {
                                                            errors
                                                                .confirmPassword
                                                                ?.message as string
                                                        }
                                                    </Text>
                                                </Flex>
                                            )}
                                        </Box>

                                        <Button
                                            type="button"
                                            onClick={
                                                handleResetPassword
                                            }
                                            loading={
                                                isResettingPassword ||
                                                loadingState ===
                                                "resetPassword"
                                            }
                                            disabled={
                                                isResettingPassword ||
                                                loadingState ===
                                                "resetPassword"
                                            }
                                            style={{
                                                width: "100%",
                                            }}
                                        >
                                            Update Password
                                        </Button>
                                    </motion.div>
                                )}
                        </AnimatePresence>
                    </Box>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
};

export default PasswordModal;