// "use client"

// import React, { useState, useEffect } from "react"
// import { useFormContext } from "react-hook-form"
// import { motion, AnimatePresence } from "framer-motion"
// import { Lock, AlertCircle, Eye, EyeOff, ShieldCheck, Send, CheckCircle2, ArrowLeft } from "lucide-react"
// import { MdClose } from "react-icons/md"
// import axios from "axios"
// import {
//     Flex,
//     Text,
//     Box,
//     TextField,
//     AlertDialog,
//     IconButton,
//     Button,
//     Select
// } from "@radix-ui/themes"
// import API_ENDPOINTS from "@/app/routes/api"

// export type ContactOption = {
//     id: string
//     label: string
//     type: "email" | "phone" | "otp"
//     value: string
// }

// export type PasswordModalProps = {
//     isOpen: boolean
//     onOpenChange: (open: boolean) => void
//     title?: string
//     subtitleAccount?: string
//     passwordError?: string | null
//     loadingState?: string | null
//     contactOptions?: ContactOption[]
//     onPasswordReset?: () => Promise<void> | void
//     onSwitchAccount?: () => void
//     demoOtp?: string
//     onSubmitPassword: () => void | Promise<boolean | void>
//     onSendOtp?: (selectedContact: ContactOption) => Promise<void> | void
//     onSubmitOtp?: () => Promise<boolean | void> | void
//     onSuccessNext?: () => void | Promise<void>
// }

// export const PasswordModal: React.FC<PasswordModalProps> = ({
//     isOpen,
//     onOpenChange,
//     title = "Enter Password",
//     subtitleAccount,
//     passwordError,
//     loadingState,
//     contactOptions = [],
//     demoOtp = "123456",
//     onSubmitPassword,
//     onSendOtp,
//     onSubmitOtp,
//     onPasswordReset,
//     onSwitchAccount,
//     onSuccessNext
// }) => {
//     const [showPassword, setShowPassword] = useState(false)
//     const [viewMode, setViewMode] = useState<"PASSWORD" | "SELECT_CONTACT" | "ENTER_OTP">("PASSWORD")
//     const [selectedContactId, setSelectedContactId] = useState<string>("")
//     const [sentContactLabel, setSentContactLabel] = useState<string>("")

//     // State for temporary verification success message
//     const [successMessage, setSuccessMessage] = useState<string | null>(null)

//     const { register, trigger, formState: { errors }, resetField } = useFormContext()

//     const availableContacts: ContactOption[] = contactOptions.length > 0 ? contactOptions : [
//         { id: "1", label: subtitleAccount ? `Email (${subtitleAccount})` : "Primary Email", type: "email", value: subtitleAccount || "" },
//         { id: "2", label: "SMS to registered phone number", type: "phone", value: "***-***-1234" },
//     ]

//     useEffect(() => {
//         if (successMessage) {
//             const timer = setTimeout(() => {
//                 setSuccessMessage(null)
//             }, 5000)
//             return () => clearTimeout(timer)
//         }
//     }, [successMessage])

//     // Reset view state when modal closes
//     useEffect(() => {
//         if (!isOpen) {
//             setViewMode("PASSWORD")
//             setSuccessMessage(null)
//         }
//     }, [isOpen])

//     const handleSwitchToTryAnotherWay = () => {
//         setViewMode("SELECT_CONTACT")
//         resetField("password")
//         if (availableContacts.length > 0 && !selectedContactId) {
//             setSelectedContactId(availableContacts[0].id)
//         }
//     }

//     const handleSwitchToPassword = () => {
//         setViewMode("PASSWORD")
//         resetField("otpCode")
//     }

//     // const handleSendOtpClick = async () => {
//     //     const contact = availableContacts.find((c) => c.id === selectedContactId) || availableContacts[0]
//     //     if (onSendOtp) {
//     //         await onSendOtp(contact)
//     //     }
//     //     setSentContactLabel(contact.value || contact.label)
//     //     setViewMode("ENTER_OTP")
//     // }


//     const handleSendOtpClick = async () => {
//         const contact =
//             availableContacts.find((c) => c.id === selectedContactId) ||
//             availableContacts[0];

//         if (!contact) {
//             return;
//         }

//         try {
//             // Call API to send OTP
//             await axios.post(
//                 API_ENDPOINTS.SendLink,
//                 {
//                     email: contact.value,
//                     type: "VERIFY_EMAIL"
//                 },
//                 {
//                     withCredentials: true,
//                 }
//             );

//             // Only move to OTP screen if API succeeds
//             setSentContactLabel(contact.value || contact.label);
//             setViewMode("ENTER_OTP");

//         } catch (error) {
//             console.error("Failed to send OTP:", error);

//             // You can show your Radix Alert/Dialog here
//             // setError("Failed to send OTP. Please try again.");
//         }
//     };

//     const handlePasswordSubmit = async () => {
//         // Trigger validation inside modal form context
//         const isValid = await trigger("password")
//         if (!isValid) return

//         // Execute submission directly and check returned boolean
//         const success = await onSubmitPassword()

//         if (success !== false) {
//             if (onSuccessNext) {
//                 await onSuccessNext()
//             } else {
//                 onOpenChange(false)
//             }
//         }
//     }

//     const handleOtpVerifySubmit = async () => {
//         const isValid = await trigger("otpCode")
//         if (!isValid) return

//         try {
//             const handler = onSubmitOtp || onSubmitPassword
//             const result = await handler()

//             if (result !== false) {
//                 setSuccessMessage("Verification successful! Access granted.")
//                 if (onSuccessNext) {
//                     await onSuccessNext()
//                 }
//             }
//         } catch (err) {
//             // Error handling
//         }
//     }

//     return (
//         <AlertDialog.Root open={isOpen} onOpenChange={onOpenChange}>
//             <AlertDialog.Content maxWidth="400px" className="relative p-6 overflow-hidden">
//                 {/* Top-Right Close Button */}
//                 <Box className="absolute top-3 right-3">
//                     <AlertDialog.Cancel>
//                         <IconButton variant="ghost" color="gray" type="button" size="2">
//                             <MdClose className="w-5 h-5" />
//                         </IconButton>
//                     </AlertDialog.Cancel>
//                 </Box>

//                 <Flex direction="column" align="center" className="text-center pt-2">
//                     <AlertDialog.Title className="text-center">
//                         {viewMode === "PASSWORD"
//                             ? title
//                             : viewMode === "SELECT_CONTACT"
//                                 ? "Try Another Way"
//                                 : "Enter Verification Code"}
//                     </AlertDialog.Title>

//                     {subtitleAccount && (
//                         <AlertDialog.Description size="2" my="2" className="text-center">
//                             Account: <strong>{subtitleAccount}</strong>
//                         </AlertDialog.Description>
//                     )}

//                     {/* Temporary 5-Second Success Notification Banner */}
//                     <AnimatePresence>
//                         {successMessage && (
//                             <motion.div
//                                 initial={{ opacity: 0, y: -10 }}
//                                 animate={{ opacity: 1, y: 0 }}
//                                 exit={{ opacity: 0, y: -10 }}
//                                 transition={{ duration: 0.2 }}
//                                 className="w-full my-2"
//                             >
//                                 <Box className="bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-lg p-3 text-left">
//                                     <Flex align="center" gap="2">
//                                         <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
//                                         <Text size="2" weight="medium" className="text-emerald-900 dark:text-emerald-100">
//                                             {successMessage}
//                                         </Text>
//                                     </Flex>
//                                 </Box>
//                             </motion.div>
//                         )}
//                     </AnimatePresence>

//                     <Box width="100%" my="3" className="text-left">
//                         <AnimatePresence mode="wait">
//                             {/* VIEW 1: Standard Password Prompt */}
//                             {viewMode === "PASSWORD" && (
//                                 <motion.div
//                                     key="password-view"
//                                     initial={{ opacity: 0, x: -20 }}
//                                     animate={{ opacity: 1, x: 0 }}
//                                     exit={{ opacity: 0, x: 20 }}
//                                     transition={{ duration: 0.2 }}
//                                     className="space-y-4"
//                                 >
//                                     <Box>
//                                         <Flex justify="between" align="center" mb="2">
//                                             <Text as="label" size="2" weight="medium" htmlFor="dialogPassword">
//                                                 Password
//                                             </Text>
//                                             <Button
//                                                 type="button"
//                                                 variant="ghost"
//                                                 color="indigo"
//                                                 size="1"
//                                                 mr="2"
//                                                 onClick={handleSwitchToTryAnotherWay}
//                                                 className="cursor-pointer hover:underline p-0 h-auto"
//                                             >
//                                                 Try another way?
//                                             </Button>
//                                         </Flex>

//                                         <TextField.Root
//                                             id="dialogPassword"
//                                             type={showPassword ? "text" : "password"}
//                                             placeholder={showPassword ? "Enter password" : "●●●●●●●●"}
//                                             className={!showPassword ? "tracking-[3px]" : ""}
//                                             {...register("password", {
//                                                 required: viewMode === "PASSWORD" ? "Password is required" : false
//                                             })}
//                                         >
//                                             <TextField.Slot>
//                                                 <Lock className="w-5 h-5 text-gray-400" />
//                                             </TextField.Slot>
//                                             <TextField.Slot pr="2">
//                                                 <IconButton
//                                                     size="1"
//                                                     variant="ghost"
//                                                     color="gray"
//                                                     type="button"
//                                                     onClick={() => setShowPassword((prev) => !prev)}
//                                                 >
//                                                     {showPassword ? (
//                                                         <EyeOff className="w-4 h-4 text-gray-500" />
//                                                     ) : (
//                                                         <Eye className="w-4 h-4 text-gray-500" />
//                                                     )}
//                                                 </IconButton>
//                                             </TextField.Slot>
//                                         </TextField.Root>

//                                         {(errors.password || passwordError) && (
//                                             <Flex align="center" gap="1" mt="1.5" className="text-red-500">
//                                                 <AlertCircle className="w-4 h-4 flex-shrink-0" />
//                                                 <Text size="2" color="red">
//                                                     {(errors.password?.message as string) || passwordError}
//                                                 </Text>
//                                             </Flex>
//                                         )}
//                                     </Box>

//                                     <Button
//                                         type="button"
//                                         onClick={handlePasswordSubmit}
//                                         loading={loadingState === "login"}
//                                         style={{ width: "100%" }}
//                                     >
//                                         Verify Password
//                                     </Button>
//                                 </motion.div>
//                             )}

//                             {/* VIEW 2: Select Contact & Send OTP */}
//                             {viewMode === "SELECT_CONTACT" && (
//                                 <motion.div
//                                     key="select-contact-view"
//                                     initial={{ opacity: 0, x: 20 }}
//                                     animate={{ opacity: 1, x: 0 }}
//                                     exit={{ opacity: 0, x: -20 }}
//                                     transition={{ duration: 0.2 }}
//                                     className="space-y-4"
//                                 >
//                                     <Button
//                                         type="button"
//                                         variant="ghost"
//                                         color="indigo"
//                                         size="2"
//                                         onClick={handleSwitchToPassword}
//                                         className="w-full justify-center"
//                                     >
//                                         <Flex align="center" gap="2" justify="center">
//                                             <ArrowLeft className="w-4 h-4" />
//                                             <Text size="2">Use Password Instead</Text>
//                                         </Flex>
//                                     </Button>

//                                     <Box>
//                                         <Box mb="2">
//                                             <Text as="label" size="2" weight="medium">
//                                                 Select Contact Option
//                                             </Text>
//                                         </Box>
//                                         <Select.Root
//                                             value={selectedContactId || availableContacts[0]?.id}
//                                             onValueChange={(val) => setSelectedContactId(val)}
//                                         >
//                                             <Select.Trigger style={{ width: "100%" }} />
//                                             <Select.Content position="popper">
//                                                 {availableContacts.map((contact) => (
//                                                     <Select.Item key={contact.id} value={contact.id}>
//                                                         {contact.label}
//                                                     </Select.Item>
//                                                 ))}
//                                             </Select.Content>
//                                         </Select.Root>
//                                     </Box>

//                                     <Button
//                                         type="button"
//                                         variant="solid"
//                                         onClick={handleSendOtpClick}
//                                         loading={loadingState === "sendOtp"}
//                                         style={{ width: "100%" }}
//                                     >
//                                         <Flex align="center" gap="2" justify="center">
//                                             <Send className="w-4 h-4" />
//                                             Send OTP
//                                         </Flex>
//                                     </Button>
//                                 </motion.div>
//                             )}

//                             {/* VIEW 3: OTP Sent + Input Field & Verify Button */}
//                             {viewMode === "ENTER_OTP" && (
//                                 <motion.div
//                                     key="enter-otp-view"
//                                     initial={{ opacity: 0, x: 20 }}
//                                     animate={{ opacity: 1, x: 0 }}
//                                     exit={{ opacity: 0, x: -20 }}
//                                     transition={{ duration: 0.2 }}
//                                     className="space-y-4"
//                                 >
//                                     <Box className="p-2.5 text-center">
//                                         <Flex align="center" gap="2">
//                                             {/* <CheckCircle2 className="w-4 h-4 text-cnter text-emerald-600 flex-shrink-0" /> */}
//                                             <Text size="2" className="">
//                                                 OTP sent successfully to <strong>{sentContactLabel || "your contact"}</strong>.
//                                             </Text>
//                                         </Flex>
//                                     </Box>

//                                     <Box>
//                                         <Box mb="2">
//                                             <Text as="label" size="2" weight="medium" htmlFor="otpCode">
//                                                 Enter OTP
//                                             </Text>
//                                         </Box>
//                                         <TextField.Root
//                                             id="otpCode"
//                                             type="text"
//                                             placeholder="Enter 6-digit OTP"
//                                             {...register("otpCode", {
//                                                 required: viewMode === "ENTER_OTP" ? "OTP is required" : false
//                                             })}
//                                         >
//                                             <TextField.Slot>
//                                                 <ShieldCheck className="w-5 h-5 text-indigo-500" />
//                                             </TextField.Slot>
//                                         </TextField.Root>

//                                         {errors.otpCode && (
//                                             <Flex align="center" gap="1" mt="1.5" className="text-red-500">
//                                                 <AlertCircle className="w-4 h-4 flex-shrink-0" />
//                                                 <Text size="2" color="red">
//                                                     {errors.otpCode?.message as string}
//                                                 </Text>
//                                             </Flex>
//                                         )}
//                                     </Box>

//                                     <Flex justify="between" align="center">
//                                         <Button
//                                             type="button"
//                                             variant="ghost"
//                                             color="gray"
//                                             size="1"
//                                             ml="2"
//                                             onClick={() => setViewMode("SELECT_CONTACT")}
//                                         >
//                                             Change Contact Method
//                                         </Button>
//                                         <Button
//                                             type="button"
//                                             variant="ghost"
//                                             color="sky"
//                                             size="1"
//                                             mr="2"
//                                             onClick={handleSendOtpClick}
//                                             loading={loadingState === "sendOtp"}
//                                         >
//                                             Resend OTP
//                                         </Button>
//                                     </Flex>

//                                     <Button
//                                         type="button"
//                                         onClick={handleOtpVerifySubmit}
//                                         loading={loadingState === "verifyOtp"}
//                                         style={{ width: "100%" }}
//                                     >
//                                         Verify
//                                     </Button>
//                                 </motion.div>
//                             )}
//                         </AnimatePresence>
//                     </Box>
//                 </Flex>
//             </AlertDialog.Content>
//         </AlertDialog.Root>
//     )
// }


















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
    | "LOGIN"
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

    /**
     * Determines what verification flow is being performed.
     */
    purpose?: VerificationPurpose;

    /**
     * Called when password authentication succeeds.
     */
    onSubmitPassword: () => void | Promise<boolean | void>;

    /**
     * Optional external password reset handler.
     *
     * If provided, this will be called instead of
     * the internal ResetPassword API.
     */
    onPasswordReset?: (
        newPassword: string
    ) => Promise<boolean | void> | boolean | void;

    /**
     * Optional callback when the whole flow succeeds.
     */
    onSuccessNext?: () => void | Promise<void>;

    /**
     * Kept for compatibility with your previous component.
     */
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

    purpose = "LOGIN",

    onSubmitPassword,
    onPasswordReset,
    onSuccessNext,
    onSwitchAccount,
}) => {
    /* =====================================================
       STATE
    ===================================================== */

    const [showPassword, setShowPassword] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);

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
                {
                    id: "2",
                    label: "SMS to registered phone number",
                    type: "phone",
                    value: "***-***-1234",
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
        }
    }, [isOpen]);

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

        setViewMode("SELECT_CONTACT");

        resetField("password");

        if (
            availableContacts.length > 0 &&
            !selectedContactId
        ) {
            setSelectedContactId(
                availableContacts[0].id
            );
        }
    };

    /* =====================================================
       SWITCH BACK TO PASSWORD
    ===================================================== */

    const handleSwitchToPassword = () => {
        setApiError(null);

        setViewMode("PASSWORD");

        resetField("otpCode");
    };

    /* =====================================================
       SEND OTP
    ===================================================== */

    const handleSendOtpClick = async () => {
        const contact =
            availableContacts.find((c) => c.id === selectedContactId) ||
            availableContacts[0];

        if (!contact) {
            setApiError("No contact method is available.");
            return;
        }

        if (!contact.value) {
            setApiError("The selected contact does not have a valid value.");
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

            console.log("OTP sent successfully:", response.data);

            setSentContactLabel(contact.value || contact.label);
            setSentContactValue(contact.value);

            resetField("otpCode");
            setViewMode("ENTER_OTP");
        } catch (error) {
            const message = getAxiosErrorMessage(error);

            console.error("Failed to send OTP:", error);
            setApiError(message);
        } finally {
            setIsSendingOtp(false);
        }
    };

    /* =====================================================
       VERIFY OTP
    ===================================================== */

    const handleOtpVerifySubmit = async () => {
        const isValid = await trigger("otpCode");

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

        try {
            /*
             * Verify OTP
             *
             * Example:
             *
             * POST /auth/verify-otp
             *
             * {
             *   email: "user@example.com",
             *   otp: "123456",
             *   type: "FORGOT_PASSWORD"
             * }
             */

            const response = await axios.post(
                "API_ENDPOINTS.VerifyOtp",
                {
                    email: sentContactValue,
                    otp,
                    type: purpose,
                },
                {
                    withCredentials: true,
                }
            );

            console.log(
                "OTP verified:",
                response.data
            );

            /*
             * FORGOT PASSWORD
             *
             * OTP verification is not the final step.
             *
             * The user must now create a new password.
             */

            if (purpose === "FORGOT_PASSWORD") {
                resetField("newPassword");
                resetField("confirmPassword");

                setViewMode("SET_PASSWORD");

                return;
            }

            /*
             * Other flows
             *
             * LOGIN
             * CHANGE_PASSWORD
             * VERIFY_EMAIL
             *
             * Continue directly after OTP verification.
             */

            setSuccessMessage(
                "Verification successful!"
            );

            if (onSuccessNext) {
                await onSuccessNext();
            } else {
                onOpenChange(false);
            }

        } catch (error) {
            const message =
                getAxiosErrorMessage(error);

            console.error(
                "OTP verification failed:",
                error
            );

            setApiError(message);
        }
    };

    /* =====================================================
       RESET PASSWORD
    ===================================================== */

    const handleResetPassword = async () => {
        const isValid = await trigger([
            "newPassword",
            "confirmPassword",
        ]);

        if (!isValid) {
            return;
        }

        const newPassword = watch("newPassword");

        if (!newPassword) {
            return;
        }

        setApiError(null);

        try {
            /*
             * If the parent wants to handle password reset,
             * allow it to do so.
             */

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

            /*
             * Otherwise use internal API.
             *
             * POST /auth/reset-password
             */

            const response = await axios.post(
                "API_ENDPOINTS.ResetPassword",
                {
                    email: sentContactValue,
                    newPassword,
                    type: "FORGOT_PASSWORD",
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
            const message =
                getAxiosErrorMessage(error);

            console.error(
                "Password reset failed:",
                error
            );

            setApiError(message);
        }
    };

    /* =====================================================
       PASSWORD SUBMIT
    ===================================================== */

    const handlePasswordSubmit = async () => {
        const isValid =
            await trigger("password");

        if (!isValid) {
            return;
        }

        const success =
            await onSubmitPassword();

        if (success !== false) {
            if (onSuccessNext) {
                await onSuccessNext();
            } else {
                onOpenChange(false);
            }
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
                {/* =================================================
                    CLOSE BUTTON
                ================================================= */}

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

                {/* =================================================
                    HEADER
                ================================================= */}

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

                    {/* =================================================
                        SUCCESS MESSAGE
                    ================================================= */}

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

                    {/* =================================================
                        API ERROR
                    ================================================= */}

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

                    {/* =================================================
                        CONTENT
                    ================================================= */}

                    <Box
                        width="100%"
                        my="3"
                        className="text-left"
                    >
                        <AnimatePresence mode="wait">

                            {/* =================================================
                                VIEW 1 - PASSWORD
                            ================================================= */}

                            {viewMode === "PASSWORD" && (
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

                            {/* =================================================
                                VIEW 2 - SELECT CONTACT
                            ================================================= */}

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
                                                onValueChange={(
                                                    value
                                                ) =>
                                                    setSelectedContactId(
                                                        value
                                                    )
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
                                    </motion.div>
                                )}

                            {/* =================================================
                                VIEW 3 - ENTER OTP
                            ================================================= */}

                            {viewMode === "ENTER_OTP" && (
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
                                            placeholder="Enter 6-digit OTP"
                                            maxLength={6}
                                            {...register(
                                                "otpCode",
                                                {
                                                    required:
                                                        viewMode ===
                                                            "ENTER_OTP"
                                                            ? "OTP is required"
                                                            : false,
                                                    minLength: {
                                                        value: 6,
                                                        message:
                                                            "OTP must be 6 digits",
                                                    },
                                                }
                                            )}
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
                                            onClick={handleSendOtpClick}
                                            loading={isSendingOtp}
                                            disabled={isSendingOtp}
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

                            {/* =================================================
                                VIEW 4 - SET NEW PASSWORD
                            ================================================= */}

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