"use client";

import Routes from "@/app/routes/routes";
import API_ENDPOINTS, {
    GetUserByTokenResponse,
    SavedAccount,
} from "@/app/routes/api";
import { broadcastAuth } from "@/app/lib/session";
import { getErrorMessage } from "@/app/lib/apiError";

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

import { FaAngleRight } from "react-icons/fa";
import { MdClose } from "react-icons/md";

import {
    Mail,
    AlertCircle,
    MessageCircle,
    UserCheck,
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
} from "@radix-ui/themes";

import {
    PasswordModal,
    ContactOption,
} from "@/app/components/auth/PasswordModal";
import SavedAccounts from "./SavedAccounts";


type FormData = {
    email: string;
    password: string;

    otpCode?: string;

    newPassword?: string;
    confirmPassword?: string;
};


/**
 * An account that is already signed in on this
 * browser: offered instead of logging in again.
 */
type AlreadySignedIn = {
    userId: number;
    fullName: string;
    email: string;
    /** It is the account currently open. */
    isActive: boolean;
};


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
    },
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

    const [email, setEmail] = useState("");

    const [loadingButton, setLoadingButton] =
        useState<string | null>(null);

    const [notification, setNotification] =
        useState<Notification>(null);


    /*
     * ================================
     * Dialog states
     * ================================
     */

    const [isNotFoundAlertOpen, setIsNotFoundAlertOpen] =
        useState(false);

    const [isPasswordAlertOpen, setIsPasswordAlertOpen] =
        useState(false);

    const [alreadySignedIn, setAlreadySignedIn] =
        useState<AlreadySignedIn | null>(null);

    const [savedAccounts, setSavedAccounts] =
        useState<SavedAccount[]>([]);


    /*
     * ================================
     * React Hook Form
     * ================================
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
     * ================================
     * Contact options for PasswordModal
     * ================================
     */

    const contactOptions = useMemo<ContactOption[]>(() => {
        const currentEmail = email || getValues("email");

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
     * ================================
     * CHECK EXISTING AUTHENTICATION
     *
     * Important:
     * We DO NOT check email verification here.
     *
     * If the user has a valid authenticated
     * session, always go to Chat.
     * ================================
     */

    useEffect(() => {
        let mounted = true;

        const checkAuthentication = async () => {
            /*
             * "Add another account": stay on the login
             * page even though a session exists. The new
             * login is added to the saved accounts.
             */
            if (
                new URLSearchParams(window.location.search).get(
                    "addAccount"
                ) === "1"
            ) {
                return;
            }

            try {
                const response =
                    await axios.post<GetUserByTokenResponse>(
                        API_ENDPOINTS.GetUserByToken,
                        {},
                        {
                            withCredentials: true,
                        }
                    );

                if (!mounted) return;

                /*
                 * Already logged in: continue with the
                 * last used account. (Typing the email
                 * of a signed-in account still prompts,
                 * see handleEmailStep.)
                 *
                 * Email verification is intentionally
                 * NOT checked here.
                 */
                if (response.data?.userId) {
                    router.replace(Routes.Chat);
                }
            } catch (error) {
                /*
                 * No valid cookie/session.
                 *
                 * Stay on login page.
                 */
                console.log("User is not authenticated");
            }
        };

        checkAuthentication();

        return () => {
            mounted = false;
        };
    }, [router]);


    /*
     * ================================
     * API
     * ================================
     */

    const checkEmailExists = useCallback(
        async (emailInput: string) => {
            const response = await axios.post(
                API_ENDPOINTS.IsEmailExist,
                {
                    email: emailInput,
                }
            );

            return response.data;
        },
        []
    );


    /*
     * ================================
     * STEP 1: EMAIL CHECK
     * ================================
     */

    const handleEmailStep = useCallback(async () => {
        const valid = await trigger("email");

        if (!valid) return;

        const inputEmail = getValues("email");

        /*
         * Already signed in on this browser: no
         * need for a password, offer to open it.
         */
        const signedIn = savedAccounts.find(
            (account) =>
                account.isSignedIn &&
                account.email.trim().toLowerCase() ===
                    inputEmail.trim().toLowerCase()
        );

        if (signedIn) {
            setNotification(null);
            setAlreadySignedIn({
                userId: signedIn.userId,
                fullName: signedIn.fullName,
                email: signedIn.email,
                isActive: signedIn.isActive,
            });
            return;
        }

        setLoadingButton("emailStep");
        setEmail(inputEmail);
        setNotification(null);

        try {
            const isEmailExist =
                await checkEmailExists(inputEmail);

            if (isEmailExist) {
                /*
                 * Existing account.
                 *
                 * Open password / OTP modal.
                 */
                setIsPasswordAlertOpen(true);
            } else {
                /*
                 * Account does not exist.
                 */
                setIsNotFoundAlertOpen(true);
            }
        } catch (error) {
            console.log(error);

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
        savedAccounts,
    ]);


    /*
     * ================================
     * ALREADY SIGNED IN: CONTINUE
     * ================================
     */

    const continueWithSignedIn = useCallback(async () => {
        if (!alreadySignedIn) return;

        if (alreadySignedIn.isActive) {
            router.replace(Routes.Chat);
            return;
        }

        try {
            setLoadingButton("continueSignedIn");

            await axios.post(
                API_ENDPOINTS.SwitchAccount,
                { userId: alreadySignedIn.userId },
                { withCredentials: true }
            );

            broadcastAuth("ACCOUNT_SWITCHED");
            window.location.assign(Routes.Chat);
        } catch (error) {
            setAlreadySignedIn(null);
            setLoadingButton(null);
            setNotification({
                type: "error",
                message: getErrorMessage(
                    error,
                    "Couldn't open that account. Please log in again."
                ),
            });
        }
    }, [alreadySignedIn, router]);


    const chooseAnotherAccount = useCallback(() => {
        setAlreadySignedIn(null);
        setValue("email", "");
        setEmail("");

        /*
         * Stay here after a reload too, as with
         * "Add another account".
         */
        const url = new URL(window.location.href);
        url.searchParams.set("addAccount", "1");
        window.history.replaceState(null, "", url.toString());
    }, [setValue]);


    /*
     * ================================
     * LOGIN SUCCESS
     *
     * Important:
     * Email verification is NOT checked here.
     *
     * Once authentication succeeds,
     * always navigate to Chat.
     * ================================
     */

    const handleVerifySuccess = useCallback(
        async (
            method: "PASSWORD" | "OTP",
            token: string | null
        ) => {
            setIsPasswordAlertOpen(false);

            try {
                /*
                 * Create authenticated session.
                 */
                await axios.post(
                    API_ENDPOINTS.Login,
                    {
                        token,
                    },
                    {
                        withCredentials: true,
                    }
                );

                /*
                 * Other tabs are now on this account.
                 */
                broadcastAuth("ACCOUNT_SWITCHED");

                /*
                 * Authentication succeeded.
                 *
                 * Do NOT check isEmailVerified here.
                 *
                 * Chat page is responsible for deciding
                 * what an unverified user can access.
                 */
                router.replace(Routes.Chat);
            } catch (error) {
                console.error(
                    "Login error:",
                    error
                );

                setNotification({
                    type: "error",
                    message:
                        "Unable to sign in. Please try again.",
                });
            }
        },
        [router]
    );


    /*
     * ================================
     * Navigation to Register Page
     * ================================
     */

    const goToRegister = useCallback(() => {
        setLoadingButton("gotoreg");

        router.push(Routes.Register);
    }, [router]);


    /*
     * ================================
     * STEP CONTENT
     * ================================
     */

    const stepContent = useMemo(() => {
        return (
            <motion.div
                key="step1-content"
                variants={stepVariants}
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
                    {...register("email", {
                        required: "Email is required",

                        pattern: {
                            value:
                                /\S+@\S+\.\S+/,

                            message:
                                "Enter a valid email",
                        },
                    })}
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
                            {errors.email.message}
                        </Text>
                    </Flex>
                )}
            </motion.div>
        );
    }, [
        errors.email,
        register,
    ]);


    /*
     * ================================
     * FOOTER BUTTONS
     * ================================
     */

    const footerButtons = useMemo(() => {
        return (
            <Box>
                <Button
                    type="button"
                    size="2"
                    onClick={handleEmailStep}
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
    }, [
        loadingButton,
        handleEmailStep,
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


                    {/* Form */}

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            handleEmailStep();
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
                                <AnimatePresence
                                    mode="wait"
                                >
                                    <motion.div
                                        key="header-1"
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
                                                    .HEADERS[1]
                                                    .title
                                            }
                                        </Text>
                                    </motion.div>
                                </AnimatePresence>
                            </Box>


                            {/* Notification */}

                            <Box px="4">
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
                                            <Box
                                                className={`rounded-md border p-3 ${
                                                    notification.type ===
                                                    "success"
                                                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400"
                                                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                                }`}
                                            >
                                                <Flex
                                                    align="center"
                                                    gap="2"
                                                >
                                                    <AlertCircle className="w-4 h-4 shrink-0" />

                                                    <Text size="2">
                                                        {
                                                            notification.message
                                                        }
                                                    </Text>
                                                </Flex>
                                            </Box>
                                        </motion.div>
                                    )}
                                </AnimatePresence>


                                {/* Step */}

                                <AnimatePresence
                                    mode="wait"
                                >
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


                    {/* SAVED ACCOUNTS */}

                    <Box px="4">
                    <SavedAccounts
                        onAccountsChange={setSavedAccounts}
                        onNeedsPassword={(savedEmail) => {
                            setValue("email", savedEmail);
                            setEmail(savedEmail);
                            setNotification(null);
                            setIsPasswordAlertOpen(true);
                        }}
                        onError={(message) =>
                            setNotification({
                                type: "error",
                                message,
                            })
                        }
                    />
                    </Box>


                    {/* ALREADY LOGGED IN ALERT */}

                    <AlertDialog.Root
                        open={alreadySignedIn !== null}
                        onOpenChange={(open) => {
                            if (!open) {
                                chooseAnotherAccount();
                            }
                        }}
                    >
                        <AlertDialog.Content
                            maxWidth="400px"
                            className="p-6"
                        >
                            <Flex
                                direction="column"
                                align="center"
                                className="text-center"
                            >
                                <AlertDialog.Title>
                                    <Flex
                                        align="center"
                                        justify="center"
                                        gap="2"
                                    >
                                        <UserCheck className="w-5 h-5 text-sky-500" />
                                        Already logged in
                                    </Flex>
                                </AlertDialog.Title>

                                <AlertDialog.Description
                                    size="2"
                                    my="3"
                                    className="text-center"
                                >
                                    <strong>
                                        {alreadySignedIn?.fullName}
                                    </strong>
                                    {alreadySignedIn?.email &&
                                    alreadySignedIn.email !==
                                        alreadySignedIn.fullName
                                        ? ` (${alreadySignedIn.email})`
                                        : ""}{" "}
                                    is already logged in on this
                                    browser. Continue with this
                                    account, or log in with another
                                    one.
                                </AlertDialog.Description>
                            </Flex>

                            <Flex
                                gap="3"
                                width="100%"
                                mt="2"
                            >
                                <Button
                                    type="button"
                                    variant="soft"
                                    color="gray"
                                    onClick={chooseAnotherAccount}
                                    disabled={
                                        loadingButton ===
                                        "continueSignedIn"
                                    }
                                    style={{ flex: 1 }}
                                >
                                    Use another account
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() =>
                                        void continueWithSignedIn()
                                    }
                                    loading={
                                        loadingButton ===
                                        "continueSignedIn"
                                    }
                                    style={{ flex: 1 }}
                                >
                                    Continue
                                </Button>
                            </Flex>
                        </AlertDialog.Content>
                    </AlertDialog.Root>


                    {/* PASSWORD & OTP MODAL */}

                    <PasswordModal
                        isOpen={
                            isPasswordAlertOpen
                        }

                        onOpenChange={(open) => {
                            setIsPasswordAlertOpen(
                                open
                            );

                            if (!open) {
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
                            getValues("email")
                        }

                        contactOptions={
                            contactOptions
                        }

                        onVerifySuccess={
                            handleVerifySuccess
                        }
                    />


                    {/* ACCOUNT NOT FOUND ALERT */}

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

                            {/* Close */}

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
                                    We couldn't find an
                                    account associated
                                    with{" "}
                                    <strong>
                                        {
                                            getValues(
                                                "email"
                                            )
                                        }
                                    </strong>
                                    . Would you like to
                                    register a new account?
                                </AlertDialog.Description>


                                <Flex
                                    gap="3"
                                    width="100%"
                                    mt="2"
                                >

                                    {/* Go Back */}

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
                                                width:
                                                    "100%",
                                            }}
                                        >
                                            Go Back
                                        </Button>
                                    </AlertDialog.Cancel>


                                    {/* Register */}

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