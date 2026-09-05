"use client";

import Routes from "@/app/routes/routes";
import API_ENDPOINTS from "@/app/routes/api";

import axios from "axios";
import { useRouter } from "next/navigation";

import {
    useState,
    useCallback,
    useMemo,
    useEffect,
} from "react";

import {
    useForm,
    FormProvider,
} from "react-hook-form";

import {
    motion,
    AnimatePresence,
} from "framer-motion";

import { IoSend } from "react-icons/io5";
import { FaAngleRight } from "react-icons/fa";
import { MdClose } from "react-icons/md";

import {
    Mail,
    AlertCircle,
    MessageCircle,
    ShieldAlert,
    ArrowLeft,
    RefreshCw,
    CheckCircle2,
} from "lucide-react";

import {
    Button,
    Card,
    Flex,
    Text,
    Box,
    TextField,
    AlertDialog,
    IconButton,
    Badge,
    Callout,
} from "@radix-ui/themes";

import {
    PasswordModal,
    ContactOption,
} from "@/app/components/auth/PasswordModal";

type FormData = {
    email: string;
    password: string;

    otpCode?: string;

    newPassword?: string;
    confirmPassword?: string;
};

type Step = 1 | 5;

type Notification = {
    type: "success" | "error";
    message: string;
} | null;

const STEP_CONFIG = {
    HEADERS: {
        1: {
            title: "Enter your Email",
            color: undefined,
        },

        5: {
            title: "Verification Required",
            color: undefined,
        },
    } as const,

    PREVIOUS_STEP: {
        5: 1,
    } as Record<Exclude<Step, 1>, Step>,
} as const;

const stepVariants = {
    hidden: {
        opacity: 0,
        x: 50,
    },

    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.3,
        },
    },

    exit: {
        opacity: 0,
        x: -50,
        transition: {
            duration: 0.3,
        },
    },
};

const MultiStepLogin = () => {
    const router = useRouter();

    const [step, setStep] =
        useState<Step>(1);

    const [email, setEmail] =
        useState("");

    const [loadingButton, setLoadingButton] =
        useState<string | null>(null);

    /*
     * Auth state populated after password login.
     */
    const [authPayload, setAuthPayload] =
        useState<{
            userId: string;
            isEmailVerified: boolean;
            email: string;
        } | null>(null);

    const [notification, setNotification] =
        useState<Notification>(null);

    const [resendCooldown, setResendCooldown] =
        useState(0);

    /*
     * Dialog states
     */
    const [
        isNotFoundAlertOpen,
        setIsNotFoundAlertOpen,
    ] = useState(false);

    const [
        isPasswordAlertOpen,
        setIsPasswordAlertOpen,
    ] = useState(false);

    const [passwordError, setPasswordError] =
        useState<string | null>(null);

    /*
     * React Hook Form
     */
    const methods = useForm<FormData>({
        mode: "onChange",
    });

    const {
        register,
        getValues,
        trigger,
        setValue,
        formState: { errors },
    } = methods;

    /*
     * Contact options for PasswordModal.
     */
    const contactOptions =
        useMemo<ContactOption[]>(() => {
            const currentEmail =
                email || getValues("email");

            return [
                {
                    id: "1",
                    label: `Email (${currentEmail})`,
                    type: "email",
                    value: currentEmail,
                },
            ];
        }, [email, getValues]);

    /*
     * Resend cooldown.
     */
    useEffect(() => {
        if (resendCooldown <= 0) return;

        const timer = setInterval(() => {
            setResendCooldown(
                (prev) => prev - 1
            );
        }, 1000);

        return () =>
            clearInterval(timer);
    }, [resendCooldown]);

    /*
     * ================================
     * API
     * ================================
     */

    const checkEmailExists =
        useCallback(
            async (emailInput: string) => {
                const response =
                    await axios.post(
                        API_ENDPOINTS.IsEmailExist,
                        {
                            email: emailInput,
                        }
                    );

                return response.data;
            },
            []
        );

    const authLogin =
        useCallback(
            async (
                emailInput: string,
                passwordInput: string
            ) => {
                return await axios.post(
                    API_ENDPOINTS.LoginAuth,
                    {
                        email: emailInput,
                        password: passwordInput,
                    }
                );
            },
            []
        );

    const sendVerificationLink =
        useCallback(
            async (
                emailInput: string,
                type: string
            ) => {
                return await axios.post(
                    API_ENDPOINTS.SendLink,
                    {
                        email: emailInput,
                        type,
                    }
                );
            },
            []
        );

    /*
     * ================================
     * STEP 1
     * ================================
     */

    const handleEmailStep =
        useCallback(async () => {
            const valid =
                await trigger("email");

            if (!valid) return;

            const inputEmail =
                getValues("email");

            setLoadingButton("emailStep");

            setEmail(inputEmail);

            setPasswordError(null);
            setNotification(null);

            try {
                const isEmailExist =
                    await checkEmailExists(
                        inputEmail
                    );

                if (isEmailExist) {
                    setIsPasswordAlertOpen(
                        true
                    );
                } else {
                    setIsNotFoundAlertOpen(
                        true
                    );
                }
            } catch (error) {
                console.error(error);

                setNotification({
                    type: "error",
                    message:
                        "Network error occurred while checking your email.",
                });
            } finally {
                setLoadingButton(null);
            }
        }, [
            trigger,
            getValues,
            checkEmailExists,
        ]);

    /*
     * ================================
     * PASSWORD LOGIN
     * ================================
     */

    const handleVerifyLogin =
        useCallback(async (): Promise<boolean> => {
            setPasswordError(null);

            const valid =
                await trigger("password");

            if (!valid) return false;

            const currentEmail =
                email || getValues("email");

            const currentPassword =
                getValues("password");

            if (!currentPassword) {
                return false;
            }

            setLoadingButton("login");

            try {
                const result =
                    await authLogin(
                        currentEmail,
                        currentPassword
                    );

                if (
                    result?.data?.userId != null
                ) {
                    const userId =
                        `${result.data.userId}`;

                    const isEmailVerified =
                        !!result.data
                            .isEmailVerified;

                    const userEmail =
                        result.data.email ||
                        currentEmail;

                    setEmail(userEmail);

                    setAuthPayload({
                        userId,
                        isEmailVerified,
                        email: userEmail,
                    });

                    setIsPasswordAlertOpen(
                        false
                    );

                    /*
                     * Verified account
                     */
                    if (isEmailVerified) {
                        sessionStorage.setItem(
                            "loginId",
                            userId
                        );

                        router.push(
                            Routes.Chat
                        );
                    } else {
                        /*
                         * Password is correct,
                         * but email is not verified.
                         */
                        setStep(5);
                    }

                    return true;
                }

                setPasswordError(
                    "Incorrect password. Please verify your details."
                );

                return false;
            } catch (error: any) {
                console.error(error);

                setPasswordError(
                    error?.response?.data
                        ?.message ||
                        "Incorrect password. Please try again."
                );

                return false;
            } finally {
                setLoadingButton(null);
            }
        }, [
            trigger,
            email,
            getValues,
            authLogin,
            router,
        ]);

    /*
     * ================================
     * OTP VERIFIED
     * ================================
     *
     * OTP verification itself proves
     * ownership of the email.
     */
    const handleOtpVerified =
        useCallback(() => {
            if (!authPayload) return;

            sessionStorage.setItem(
                "loginId",
                authPayload.userId
            );

            setIsPasswordAlertOpen(
                false
            );

            router.push(
                Routes.Chat
            );
        }, [
            authPayload,
            router,
        ]);

    /*
     * Password login success.
     *
     * This is separate from OTP success
     * because an unverified account must
     * go to Step 5.
     */
    const handleSuccessNextStep =
        useCallback(() => {
            setIsPasswordAlertOpen(
                false
            );

            if (
                authPayload?.isEmailVerified
            ) {
                sessionStorage.setItem(
                    "loginId",
                    authPayload.userId
                );

                router.push(
                    Routes.Chat
                );
            } else {
                setStep(5);
            }
        }, [
            authPayload,
            router,
        ]);

    /*
     * ================================
     * STEP 5
     * SEND VERIFICATION LINK
     * ================================
     */

    const handleSendVerification =
        useCallback(async () => {
            if (resendCooldown > 0) {
                return;
            }

            const currentEmail =
                email || getValues("email");

            if (!currentEmail) {
                setNotification({
                    type: "error",
                    message:
                        "Email address is missing.",
                });

                return;
            }

            setLoadingButton(
                "sendVerification"
            );

            setNotification(null);

            try {
                await sendVerificationLink(
                    currentEmail,
                    "VERIFY_EMAIL"
                );

                setResendCooldown(60);

                setNotification({
                    type: "success",
                    message:
                        `Verification link successfully sent to ${currentEmail}. Please check your inbox.`,
                });
            } catch (error) {
                console.error(error);

                setNotification({
                    type: "error",
                    message:
                        "Failed to send verification link. Please try again.",
                });
            } finally {
                setLoadingButton(null);
            }
        }, [
            email,
            getValues,
            resendCooldown,
            sendVerificationLink,
        ]);

    /*
     * ================================
     * REGISTER
     * ================================
     */

    const goToRegister =
        useCallback(() => {
            setLoadingButton("gotoreg");

            router.push(
                Routes.Register
            );
        }, [router]);

    /*
     * ================================
     * STEP 5 UI
     * ================================
     */

    const renderUnverifiedStep =
        () => (
            <motion.div
                key="step5-content"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <Flex
                    direction="column"
                    align="center"
                    gap="4"
                    className="text-center"
                >
                    <Box className="relative mt-4">
                        <Box className="absolute -inset-1 rounded-full bg-amber-500/20 blur-md animate-pulse" />

                        <Flex
                            align="center"
                            justify="center"
                            className="relative w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800"
                        >
                            <ShieldAlert className="w-8 h-8 text-amber-500" />
                        </Flex>
                    </Box>

                    <Box className="space-y-1">
                        <Badge
                            color="amber"
                            variant="soft"
                            radius="full"
                            size="2"
                        >
                            Account Unverified
                        </Badge>

                        <Text
                            as="p"
                            size="2"
                            color="gray"
                            className="mt-2 max-w-xs mx-auto"
                        >
                            Your account requires
                            email verification
                            before accessing the
                            system dashboard.
                        </Text>
                    </Box>

                    <Box className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded p-3">
                        <Flex
                            align="center"
                            justify="between"
                        >
                            <Flex
                                align="center"
                                gap="2"
                                className="overflow-hidden"
                            >
                                <Mail className="w-4 h-4 text-slate-400 shrink-0" />

                                <Text
                                    size="2"
                                    weight="bold"
                                    className="truncate"
                                >
                                    {email ||
                                        getValues(
                                            "email"
                                        )}
                                </Text>
                            </Flex>

                            <Badge
                                color="amber"
                                variant="surface"
                                size="1"
                            >
                                Pending
                            </Badge>
                        </Flex>
                    </Box>
                </Flex>
            </motion.div>
        );

    /*
     * ================================
     * STEP CONTENT
     * ================================
     */

    const stepContent =
        useMemo(() => {
            switch (step) {
                case 1:
                    return (
                        <motion.div
                            key="step1-content"
                            variants={
                                stepVariants
                            }
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <Box mb="2">
                                <Text
                                    as="label"
                                    size="2"
                                    weight="medium"
                                    htmlFor="email"
                                >
                                    Email
                                </Text>
                            </Box>

                            <TextField.Root
                                id="email"
                                type="email"
                                placeholder="example@company.com"
                                {...register(
                                    "email",
                                    {
                                        required:
                                            "Email is required",

                                        pattern: {
                                            value: /\S+@\S+\.\S+/,
                                            message:
                                                "Enter a valid email",
                                        },
                                    }
                                )}
                            >
                                <TextField.Slot>
                                    <Mail className="w-5 h-5 text-gray-400" />
                                </TextField.Slot>
                            </TextField.Root>

                            {errors.email && (
                                <Flex
                                    align="center"
                                    gap="1"
                                    mt="1"
                                >
                                    <AlertCircle className="w-4 h-4 text-red-500" />

                                    <Text
                                        size="2"
                                        color="red"
                                    >
                                        {
                                            errors
                                                .email
                                                .message
                                        }
                                    </Text>
                                </Flex>
                            )}
                        </motion.div>
                    );

                case 5:
                    return renderUnverifiedStep();

                default:
                    return null;
            }
        }, [
            step,
            errors,
            register,
            email,
            getValues,
        ]);

    /*
     * ================================
     * FOOTER BUTTONS
     * ================================
     */

    const footerButtons =
        useMemo(() => {
            switch (step) {
                case 1:
                    return (
                        <Box>
                            <Button
                                type="button"
                                size="2"
                                onClick={
                                    handleEmailStep
                                }
                                loading={
                                    loadingButton ===
                                    "emailStep"
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
                                    Continue
                                    <FaAngleRight />
                                </Flex>
                            </Button>
                        </Box>
                    );

                case 5:
                    return (
                        <Flex
                            direction="column"
                            gap="2"
                            width="100%"
                            align="stretch"
                        >
                            <Button
                                type="button"
                                onClick={
                                    handleSendVerification
                                }
                                loading={
                                    loadingButton ===
                                    "sendVerification"
                                }
                                disabled={
                                    resendCooldown >
                                    0
                                }
                            >
                                {resendCooldown >
                                0 ? (
                                    <Flex
                                        align="center"
                                        gap="2"
                                        justify="center"
                                    >
                                        <RefreshCw className="w-4 h-4 animate-spin" />

                                        Resend in{" "}
                                        {
                                            resendCooldown
                                        }
                                        s
                                    </Flex>
                                ) : (
                                    <Flex
                                        align="center"
                                        gap="2"
                                        justify="center"
                                    >
                                        <IoSend className="w-4 h-4" />

                                        Resend Verification
                                        Link
                                    </Flex>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                color="gray"
                                size="2"
                                onClick={() => {
                                    setNotification(
                                        null
                                    );

                                    setStep(1);

                                    setEmail(
                                        ""
                                    );

                                    setValue(
                                        "email",
                                        ""
                                    );

                                    setValue(
                                        "password",
                                        ""
                                    );
                                }}
                            >
                                <Flex
                                    align="center"
                                    gap="2"
                                    justify="center"
                                >
                                    <ArrowLeft className="w-4 h-4" />

                                    Use Different
                                    Account
                                </Flex>
                            </Button>
                        </Flex>
                    );

                default:
                    return null;
            }
        }, [
            step,
            loadingButton,
            handleEmailStep,
            handleSendVerification,
            resendCooldown,
            setValue,
        ]);

    /*
     * ================================
     * RENDER
     * ================================
     */

    return (
        <FormProvider {...methods}>
            <Flex
                align="center"
                justify="center"
                className="min-h-[100dvh] p-4"
            >
                <Box className="w-full max-w-md">

                    {/* Logo */}
                    <Flex
                        align="center"
                        justify="center"
                        gap="3"
                        mb="6"
                    >
                        <MessageCircle className="w-8 h-8 text-sky-500" />

                        <Text
                            size="8"
                            weight="bold"
                            className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent"
                        >
                            Messenger
                        </Text>
                    </Flex>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (step === 1) {
                                handleEmailStep();
                            }
                        }}
                    >
                        <Card
                            variant="ghost"
                            className="shadow-xl"
                        >
                            {/* Header */}
                            <Box
                                position="relative"
                                className="text-center pt-6"
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`header-${step}`}
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
                                            y: 10,
                                        }}
                                    >
                                        <Text
                                            as="div"
                                            size="6"
                                            weight="bold"
                                        >
                                            {
                                                STEP_CONFIG
                                                    .HEADERS[
                                                    step
                                                ]
                                                    .title
                                            }
                                        </Text>
                                    </motion.div>
                                </AnimatePresence>
                            </Box>

                            <Box px="4">

                                {/* Notification */}
                                <AnimatePresence>
                                    {notification && (
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
                                            className="mt-4"
                                        >
                                            <Callout.Root
                                                color={
                                                    notification.type ===
                                                    "success"
                                                        ? "green"
                                                        : "red"
                                                }
                                                size="1"
                                                variant="soft"
                                            >
                                                <Callout.Icon>
                                                    {notification.type ===
                                                    "success" ? (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4" />
                                                    )}
                                                </Callout.Icon>

                                                <Callout.Text size="2">
                                                    {
                                                        notification.message
                                                    }
                                                </Callout.Text>
                                            </Callout.Root>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Step */}
                                <AnimatePresence mode="wait">
                                    {stepContent}
                                </AnimatePresence>
                            </Box>

                            {/* Footer */}
                            <Box
                                px="4"
                                width="100%"
                                mt="2"
                            >
                                {footerButtons}
                            </Box>
                        </Card>
                    </form>

                    {/* =====================================
                        PASSWORD / OTP MODAL
                    ===================================== */}

                    <PasswordModal
                        isOpen={
                            isPasswordAlertOpen
                        }

                        onOpenChange={(
                            open
                        ) => {
                            setIsPasswordAlertOpen(
                                open
                            );

                            if (!open) {
                                setPasswordError(
                                    null
                                );

                                setValue(
                                    "password",
                                    ""
                                );

                                setValue(
                                    "otpCode",
                                    ""
                                );
                            }
                        }}

                        purpose="VERIFY_LOGIN"

                        subtitleAccount={
                            email ||
                            getValues(
                                "email"
                            )
                        }

                        passwordError={
                            passwordError
                        }

                        loadingState={
                            loadingButton
                        }

                        contactOptions={
                            contactOptions
                        }

                        /*
                         * Password login
                         */
                        onSubmitPassword={
                            handleVerifyLogin
                        }

                        /*
                         * Password success
                         */
                        onSuccessNext={
                            handleSuccessNextStep
                        }

                        /*
                         * OTP success
                         */
                        onOtpVerified={
                            handleOtpVerified
                        }
                    />

                    {/* =====================================
                        EMAIL NOT FOUND
                    ===================================== */}

                    <AlertDialog.Root
                        open={
                            isNotFoundAlertOpen
                        }
                        onOpenChange={
                            setIsNotFoundAlertOpen
                        }
                    >
                        <AlertDialog.Content
                            maxWidth="400px"
                            className="relative p-6"
                        >
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

                            <Flex
                                direction="column"
                                align="center"
                                className="text-center pt-2"
                            >
                                <AlertDialog.Title>
                                    <Flex
                                        align="center"
                                        justify="center"
                                        gap="2"
                                        className="text-red-600"
                                    >
                                        <AlertCircle className="w-5 h-5" />

                                        Email Not Found
                                    </Flex>
                                </AlertDialog.Title>

                                <AlertDialog.Description
                                    size="2"
                                    my="4"
                                    className="text-center"
                                >
                                    We couldn't find
                                    an account
                                    associated with{" "}
                                    <strong>
                                        {
                                            getValues(
                                                "email"
                                            )
                                        }
                                    </strong>
                                    . Would you like
                                    to register a new
                                    account?
                                </AlertDialog.Description>

                                <Flex
                                    gap="3"
                                    width="100%"
                                    mt="2"
                                >
                                    <AlertDialog.Cancel
                                        style={{
                                            flex: 1,
                                        }}
                                    >
                                        <Button
                                            variant="soft"
                                            color="gray"
                                            type="button"
                                            style={{
                                                width: "100%",
                                            }}
                                        >
                                            Go Back
                                        </Button>
                                    </AlertDialog.Cancel>

                                    <Button
                                        type="button"
                                        onClick={
                                            goToRegister
                                        }
                                        loading={
                                            loadingButton ===
                                            "gotoreg"
                                        }
                                        style={{
                                            flex: 1,
                                        }}
                                    >
                                        Go to Register
                                    </Button>
                                </Flex>
                            </Flex>
                        </AlertDialog.Content>
                    </AlertDialog.Root>
                </Box>
            </Flex>
        </FormProvider>
    );
};

export default MultiStepLogin;