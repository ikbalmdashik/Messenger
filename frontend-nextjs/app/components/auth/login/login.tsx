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
import { Mail, Lock, AlertCircle, MessageCircle } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { AiFillApple } from "react-icons/ai"
import { FaFacebookF, FaCaretRight, FaQuoteRight } from "react-icons/fa"
import { AnimatePresence, motion } from "framer-motion"
import { IoChevronBackOutline, IoSend, IoLogIn } from "react-icons/io5"
import { Spinner } from "@/components/ui/spinner"
import { FaAngleRight } from "react-icons/fa";
import { GrPowerReset } from "react-icons/gr";

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
    const [email, setEmail] = useState("")

    // Single loading state for active button
    const [loadingButton, setLoadingButton] = useState<string | null>(null)

    const { register, handleSubmit, formState: { errors }, getValues, trigger } = useForm<FormData>({ mode: "onChange" })

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

        setLoadingButton("emailStep")
        setEmail(inputEmail)

        try {
            const isEmailExist = (await axios.post(API_ENDPOINTS.IsEmailExist, { email: inputEmail })).data
            setStep(isEmailExist ? 3 : 2)
        } catch (error) {
            console.error(error)
            alert(error)
        } finally {
            setLoadingButton(null)
        }
    }

    const onSubmit = async (data: FormData) => {
        setLoadingButton("login")
        try {
            const result = await AuthLogin(data.email, data.password)
            if (result?.data?.userId != null) {
                setEmail(result.data.email)
                if (result.data.isEmailVerified) {
                    sessionStorage.setItem("loginId", `${result.data.userId}`)
                    router.push(Routes.Chat)
                } else {
                    setStep(5)
                }
            } else {
                setStep(4)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingButton(null)
        }
    }

    const handleSocialLogin = async (provider: "google" | "apple" | "facebook") => {
        setLoadingButton(provider)
        alert(`Login with ${provider} not implemented yet.`)
        setLoadingButton(null)
    }

    const handleSendVerification = async () => {
        setLoadingButton("sendVerification")
        try {
            await axios.post(API_ENDPOINTS.SendLink, { email, type: "VERIFY_EMAIL" })
            setStep(6)
        } catch (error) {
            console.log(error)
        } finally {
            setLoadingButton(null)
        }
    }

    const handlePasswordReset = async () => {
        setLoadingButton("passwordReset")
        try {
            await axios.post(API_ENDPOINTS.SendLink, { email, type: "RESET_PASSWORD" })
            setStep(7)
        } catch (error) {
            console.log(error)
        } finally {
            setLoadingButton(null)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[100dvh] px-4 bg-white dark:bg-slate-950 transition-colors">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
                <h1 className="font-bold text-3xl md:text-4xl 
                                flex items-center justify-center gap-3
                                bg-gradient-to-r from-sky-500 to-indigo-500 
                                bg-clip-text text-transparent mb-10">
                    <MessageCircle className="w-8 h-8 text-sky-500" />
                    Messenger
                </h1>
                <Card className="dark:bg-white/5 bg-black/5 shadow-xl dark:shadwo-xl/30 border-none dark:text-white text-black overflow-hidden">
                    <CardHeader className="relative text-center">
                        <AnimatePresence mode="wait">
                            {step === 1 && <motion.div key="step1-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CardTitle className="text-2xl">Enter your Email</CardTitle></motion.div>}
                            {step === 2 && <motion.div key="step2-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CardTitle className="text-2xl text-red-600">Email Not Found</CardTitle></motion.div>}
                            {step === 3 && <motion.div key="step3-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CardTitle className="text-2xl">Enter your Password</CardTitle></motion.div>}
                            {step === 4 && <motion.div key="step4-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CardTitle className="text-2xl text-red-600">Password Incorrect</CardTitle></motion.div>}
                            {step === 5 && <motion.div key="step5-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CardTitle className="text-2xl text-red-600">Email Not Verified</CardTitle></motion.div>}
                            {step === 6 && <motion.div key="step6-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CardTitle className="text-2xl text-green-600">Verification Link Sent</CardTitle></motion.div>}
                            {step === 7 && <motion.div key="step7-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CardTitle className="text-2xl text-green-600">Password Reset Sent</CardTitle></motion.div>}
                        </AnimatePresence>
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
                            {/* Step 1 - Email */}
                            {step === 1 && (
                                <motion.div key="step1-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                        <Input
                                            id="email"
                                            type="text"
                                            placeholder="example@company.com"
                                            className="pl-10 border-black/30 dark:border-white/20"
                                            {...register("email", { required: "Email is required", pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" } })}
                                        />
                                    </div>
                                    {errors.email && <p className="text-sm text-pink-700 mt-0 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email.message}</p>}
                                </motion.div>
                            )}

                            {/* Step 2 - Email Not Found */}
                            {step === 2 && (
                                <motion.div key="step2-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-4">
                                    <p className="text-sm text-muted-foreground">We couldn't find that email.</p>
                                </motion.div>
                            )}

                            {/* Step 3 - Password */}
                            {step === 3 && (
                                <motion.div key="step3-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-2">
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
                                    {errors.password && <p className="text-sm text-pink-700 mt-0">{errors.password.message}</p>}
                                </motion.div>
                            )}

                            {/* Step 4 - Password Incorrect */}
                            {step === 4 && (
                                <motion.div key="step4-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-4">
                                    <p className="text-sm text-red-600">Wrong password.</p>
                                </motion.div>
                            )}

                            {/* Step 5 - Email Not Verified */}
                            {step === 5 && (
                                <motion.div key="step5-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-4">
                                    <p className="text-sm text-red-600">Your email ({email}) is not verified. Please verify your email to continue.</p>
                                </motion.div>
                            )}

                            {/* Step 6 - Verification Sent */}
                            {step === 6 && (
                                <motion.div key="step6-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-4">
                                    <p className="text-sm text-green-600">Verification link has been sent to your email ({email}).</p>
                                </motion.div>
                            )}

                            {/* Step 7 - Password Reset Sent */}
                            {step === 7 && (
                                <motion.div key="step7-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-4">
                                    <p className="text-sm text-green-600">Password reset link has been sent to your email ({email}).</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>

                    {/* Footer Buttons */}
                    <CardFooter className="flex flex-col gap-4">
                        {step === 1 && (
                            <Button
                                type="button"
                                className="relative flex items-center justify-center px-5 py-2 rounded-lg w-1/2"
                                onClick={handleEmailStep}
                                variant={"outline"}
                                disabled={loadingButton === "emailStep"}
                            >
                                <span className={`flex items-center gap-2 ${loadingButton === "emailStep" ? "opacity-0" : "opacity-100"}`}>
                                    Continue <FaAngleRight />
                                </span>
                                {loadingButton === "emailStep" && <span className="absolute flex items-center justify-center"><Spinner color="currentColor" size={20} /></span>}
                            </Button>
                        )}
                        {step === 2 && (
                            <div className="flex justify-center gap-2">
                                <Button
                                    type="button"
                                    className="relative flex items-center justify-center px-5 py-2 rounded-lg w-1/2"
                                    disabled={loadingButton === "gotoreg"}
                                    variant="outline"
                                    onClick={() => {
                                        setLoadingButton("gotoreg")
                                        router.push(Routes.Register)
                                    }}
                                >
                                    <span className={`flex items-center gap-2 ${loadingButton === "gotoreg" ? "opacity-0" : "opacity-100"}`}>
                                        Go to Register
                                    </span>
                                    {loadingButton === "gotoreg" && <span className="absolute flex items-center justify-center"><Spinner color="currentColor" size={20} /></span>}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="relative flex items-center justify-center px-5 py-2 rounded-lg w-1/2"
                                    onClick={() => setStep(1)}
                                >
                                    Change Email
                                </Button>
                            </div>
                        )}
                        {step === 3 && (
                            <Button
                                type="submit"
                                variant={"outline"}
                                className="relative flex items-center justify-center px-5 py-2 rounded-lg w-1/2"
                                disabled={loadingButton === "login"}
                            >
                                <span className={`flex items-center gap-2 ${loadingButton === "login" ? "opacity-0" : "opacity-100"}`}>
                                    Log In <FaAngleRight />
                                </span>
                                {loadingButton === "login" && <span className="absolute flex items-center justify-center"><Spinner color="currentColor" size={20} /></span>}
                            </Button>
                        )}

                        {step === 4 && (
                            <Button
                                type="button"
                                variant={"outline"}
                                className="px-5 py-2 rounded-lg"
                                onClick={handlePasswordReset}
                                disabled={loadingButton === "passwordReset"}
                            >
                                <span className={`flex items-center gap-2 ${loadingButton === "passwordReset" ? "opacity-0" : "opacity-100"}`}>
                                    Recover Password <GrPowerReset />
                                </span>
                                {loadingButton === "passwordReset" && <span className="absolute flex items-center justify-center"><Spinner color="currentColor" size={20} /></span>}
                            </Button>
                        )}

                        {step === 5 && (
                            <Button
                                type="button"
                                variant={"outline"}
                                className="px-5 py-2 rounded-lg"
                                onClick={handleSendVerification}
                                disabled={loadingButton === "sendVerification"}
                            >
                                <span className={`flex items-center gap-2 ${loadingButton === "sendVerification" ? "opacity-0" : "opacity-100"}`}>
                                    Send Verification Link <IoSend />
                                </span>
                                {loadingButton === "sendVerification" && <span className="absolute flex items-center justify-center"><Spinner color="currentColor" size={20} /></span>}
                            </Button>
                        )}

                        {step === 6 && (
                            <Button type="button" variant="outline" onClick={() => setStep(3)} className="rpx-5 py-2 rounded-lg">
                                <span className="flex items-center gap-2"><IoChevronBackOutline /> Go To Login</span>
                            </Button>
                        )}

                        {step === 7 && (
                            <Button type="button" variant="outline" onClick={() => setStep(3)} className="px-5 py-2 rounded-lg">
                                <span className="flex items-center gap-2"><IoChevronBackOutline /> Go To Login</span>
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                {/* Social Login */}
                {step === 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground mb-6">Or continue with</p>
                        <div className="flex justify-center gap-4">
                            <Button
                                variant="outline"
                                className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2"
                                onClick={() => handleSocialLogin("google")}
                                disabled={loadingButton === "google"}
                            >
                                <span className={`flex items-center gap-2 ${loadingButton === "google" ? "opacity-0" : "opacity-100"}`}>
                                    <FcGoogle className="w-5 h-5" /> Google
                                </span>
                                {loadingButton === "google" && <span className="absolute flex items-center justify-center"><Spinner color="currentColor" size={20} /></span>}
                            </Button>

                            <Button
                                variant="outline"
                                className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2"
                                onClick={() => handleSocialLogin("apple")}
                                disabled={loadingButton === "apple"}
                            >
                                <span className={`flex items-center gap-2 ${loadingButton === "apple" ? "opacity-0" : "opacity-100"}`}>
                                    <AiFillApple className="w-5 h-5" /> Apple
                                </span>
                                {loadingButton === "apple" && <span className="absolute flex items-center justify-center"><Spinner color="currentColor" size={20} /></span>}
                            </Button>

                            <Button
                                variant="outline"
                                className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2"
                                onClick={() => handleSocialLogin("facebook")}
                                disabled={loadingButton === "facebook"}
                            >
                                <span className={`flex items-center gap-2 ${loadingButton === "facebook" ? "opacity-0" : "opacity-100"}`}>
                                    <FaFacebookF className="w-5 h-5" /> Facebook
                                </span>
                                {loadingButton === "facebook" && <span className="absolute flex items-center justify-center"><Spinner color="currentColor" size={20} /></span>}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </form>
        </div>
    )
}

export default MultiStepLogin
