"use client"

import Routes from "@/app/routes/routes"
import API_ENDPOINTS from "@/app/routes/api"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Mail, Lock, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { AiFillApple } from "react-icons/ai"
import { FaFacebookF } from "react-icons/fa"
import { AnimatePresence, motion } from "framer-motion"
import { AuthStepSkeleton } from "../sleleton/authSkeleton"
import { IoChevronBackOutline, IoSend } from "react-icons/io5";
import { FaCaretRight } from "react-icons/fa";
import { IoIosLogIn } from "react-icons/io";
import { FaRotateRight } from "react-icons/fa6";

type FormData = {
    email: string
    password: string
}

const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
}

const MultiStepLogin = () => {
    const router = useRouter()
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState("")
    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues,
        trigger,
    } = useForm<FormData>({ mode: "onChange" })

    const AuthLogin = async (email: string, password: string) => {
        try {
            return await axios.post(API_ENDPOINTS.LoginAuth, { email, password })
        } catch (error) {
            console.log(error)
        }
    }

    const handleEmailStep = async () => {
        const valid = await trigger("email")
        const inputEmail = getValues("email")

        if (!valid) return

        setLoading(true)
        setEmail(inputEmail)

        try {
            const isEmailExist = (
                await axios.post(API_ENDPOINTS.IsEmailExist, { email: inputEmail })
            ).data

            if (isEmailExist) {
                setStep(3) // go to password step
            } else {
                setStep(2) // email not found
            }
        } catch (error) {
            console.error(error)
            alert(error)
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = async (data: FormData) => {
        setLoading(true)
        try {
            const result = await AuthLogin(data.email, data.password)
            if (result?.data?.userId != null) {
                setEmail(result.data.email)
                if (result.data.isEmailVerified) {
                    sessionStorage.setItem("loginId", `${result.data.userId}`)
                    router.push(Routes.Chat)
                } else {
                    setStep(5) // email not verified
                }
            } else {
                setStep(4) // password incorrect
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSocialLogin = (provider: "google" | "apple" | "facebook") => {
        alert(`Login with ${provider} not implemented yet.`)
    }

    // NEW BUTTON METHODS
    const handleSendVerification = async () => {
        try {
            await axios.post(API_ENDPOINTS.SendLink, { email: email, type: "VERIFY_EMAIL" })
            setStep(6) // move to "Verification Link Sent" interface
        } catch (error) {
            console.log(error);
        }
    }

    const handlePasswordReset = async () => {
        try {
            const response = (await axios.post(API_ENDPOINTS.SendLink, { email: email, type: "RESET_PASSWORD" })).data;
            console.log(response)
            setStep(7)
        } catch (error) {
            console.log(error);
        }
    }

    // return (
    //     <>
    //         {loading ? (
    //             <AuthStepSkeleton step={step} />
    //         ) : (
    //         )}
    //     </>
    // )

    return (
        <>
            <div className="flex items-center justify-center min-h-[100dvh] px-4 bg-white dark:bg-slate-950 transition-colors">
                <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
                    <Card className="bg-transparent border border-black/30 dark:border-white/20 shadow-md dark:text-white text-black">
                        <CardHeader className="relative text-center">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1-header"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <CardTitle className="text-2xl"> Enter your Email</CardTitle>
                                    </motion.div>
                                )}
                                {step === 2 && (
                                    <motion.div
                                        key="step2-header"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <CardTitle className="text-2xl text-red-600">Email Not Found</CardTitle>
                                    </motion.div>
                                )}
                                {step === 3 && (
                                    <motion.div
                                        key="step3-header"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <CardTitle className="text-2xl">Enter your Password</CardTitle>
                                    </motion.div>
                                )}
                                {step === 4 && (
                                    <motion.div
                                        key="step4-header"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <CardTitle className="text-2xl text-red-600">Password Incorrect</CardTitle>
                                    </motion.div>
                                )}
                                {step === 5 && (
                                    <motion.div
                                        key="step5-header"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <CardTitle className="text-2xl text-red-600">Email Not Verified</CardTitle>
                                    </motion.div>
                                )}
                                {step === 6 && (
                                    <motion.div
                                        key="step6-header"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <CardTitle className="text-2xl text-green-600">Verification Link Sent</CardTitle>
                                    </motion.div>
                                )}
                                {step === 7 && (
                                    <motion.div
                                        key="step7-header"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <CardTitle className="text-2xl text-green-600">Password Reset Sent</CardTitle>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Back button */}
                            {step !== 1 && (
                                <Button
                                    variant="ghost"
                                    type="button"
                                    onClick={() =>
                                        step === 2 ? setStep(1)
                                            : step === 3 ? setStep(1)
                                                : step === 4 ? setStep(3)
                                                    : step === 5 ? setStep(3)
                                                        : step === 6 ? setStep(5)
                                                            : step === 7 ? setStep(4)
                                                                : setStep(step - 1 as any)
                                    }
                                    className="absolute left-4 top-4 h-8 w-8 rounded-full"
                                >
                                    <IoChevronBackOutline />
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <AnimatePresence mode="wait">
                                {/* Email Input */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1-content"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-2"
                                    >
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                            <Input
                                                id="email"
                                                type="text"
                                                placeholder="example@company.com"
                                                className="pl-10 border-black/30 dark:border-white/20"
                                                {...register("email", {
                                                    required: "Email is required",
                                                    pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
                                                })}
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="text-sm text-pink-700 mt-0 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" /> {errors.email.message}
                                            </p>
                                        )}
                                    </motion.div>
                                )}

                                {/* Email Not Found */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2-content"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="text-center space-y-4"
                                    >
                                        <p className="text-sm text-muted-foreground">We couldn't find that email.</p>
                                        <div className="flex justify-center gap-2">
                                            <Button type="button" variant="outline" onClick={() => router.push(Routes.Register)}>Go to Register</Button>
                                            <Button type="button" variant="outline" onClick={() => setStep(1)}>Change Email</Button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Password Step */}
                                {step === 3 && (
                                    <motion.div
                                        key="step3-content"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-2"
                                    >
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="•••••••"
                                                className="tracking-[5px] text-2xl pl-10 border-black/30 dark:border-white/20"
                                                {...register("password", { required: "Password is required" })}
                                            />
                                        </div>
                                        {errors.password && (
                                            <p className="text-sm text-pink-700 mt-0">{errors.password.message}</p>
                                        )}
                                    </motion.div>
                                )}

                                {/* Password Incorrect */}
                                {step === 4 && (
                                    <motion.div
                                        key="step4-content"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="text-center space-y-4"
                                    >
                                        <p className="text-sm text-red-600">Wrong password.</p>
                                        <Button type="button" variant="outline" onClick={handlePasswordReset}>Recover Password <FaRotateRight /> </Button>
                                    </motion.div>
                                )}

                                {/* Email Not Verified */}
                                {step === 5 && (
                                    <motion.div
                                        key="step5-content"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="text-center space-y-4"
                                    >
                                        <p className="text-sm text-red-600">Your email ({email}) is not verified. Please verify your email to continue.</p>
                                        <div className="flex justify-center gap-2">
                                            <Button type="button" variant="outline" onClick={handleSendVerification}>Send Verification Link <IoSend /> </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Verification Link Sent */}
                                {step === 6 && (
                                    <motion.div
                                        key="step6-content"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="text-center space-y-4"
                                    >
                                        <p className="text-sm text-green-600">Verification link has been sent to your email ({email}).</p>
                                        <Button type="button" variant="outline" onClick={() => setStep(3)}> <IoChevronBackOutline /> Back</Button>
                                    </motion.div>
                                )}

                                {/* Password Reset Sent */}
                                {step === 7 && (
                                    <motion.div
                                        key="step7-content"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="text-center space-y-4"
                                    >
                                        <p className="text-sm text-green-600">Password reset link has been sent to your email ({email}).</p>
                                        <Button type="button" variant="outline" onClick={() => setStep(3)}> <IoChevronBackOutline /> Back</Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4">
                            {step === 1 && (
                                <Button type="button" variant="outline" className="w-1/2" onClick={handleEmailStep} disabled={loading}>
                                    Continue <FaCaretRight />
                                </Button>
                            )}
                            {step === 3 && (
                                <Button type="submit" variant="outline" className="w-1/2 flex items-center justify-center gap-2" disabled={loading}>
                                    Log In <IoIosLogIn />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>

                    {/* Social Login */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground mb-6">Or continue with</p>
                            <div className="flex justify-center gap-4">
                                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2" onClick={() => handleSocialLogin("google")}>
                                    <FcGoogle className="w-5 h-5" /> Google
                                </Button>
                                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2" onClick={() => handleSocialLogin("apple")}>
                                    <AiFillApple className="w-5 h-5" /> Apple
                                </Button>
                                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2" onClick={() => handleSocialLogin("facebook")}>
                                    <FaFacebookF className="w-5 h-5" /> Facebook
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </form>
            </div>
        </>
    );
}

export default MultiStepLogin
