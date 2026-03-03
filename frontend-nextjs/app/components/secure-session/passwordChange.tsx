// app/secure-session/PasswordChange.tsx
'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import axios from "axios"
import API_ENDPOINTS from "@/app/routes/api"
import Routes from "@/app/routes/routes"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { AiOutlineLock } from "react-icons/ai"

type FormData = {
    password: string
    confirmPassword: string
}

type PasswordChangeProps = {
    token: string | undefined // token passed from server component
}

const inputVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export default function PasswordChange({ token }: PasswordChangeProps) {
    const router = useRouter()
    const [step, setStep] = useState<1 | 2 | 3>(1) // 1: form, 2: success, 3: failed
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues
    } = useForm<FormData>({ mode: "onChange" })

    const onSubmit = async (data: FormData) => {
        if (!token) {
            alert("Token missing. Please try again.")
            return
        }

        setIsLoading(true)
        try {
            const newPassword = data.password;

            const res = await axios.post(
                API_ENDPOINTS.UpdatePassword,
                { newPassword },
                { withCredentials: true } // important for HTTP-only cookie
            )

            if (res.data.success) setStep(2)
            else setStep(3)
        } catch (err) {
            setStep(3)
        } finally {
            setIsLoading(false)
        }
    }

    const renderInput = (label: string, placeholder: string, props: any) => (
        <div>
            <Label className="mb-1">{label}</Label>
            <div className="relative">
                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input placeholder={placeholder} className="pl-10" {...props} />
            </div>
        </div>
    )

    return (
        <div className="flex items-center justify-center min-h-[100dvh] px-4 bg-white dark:bg-slate-950 transition-colors">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
                <Card className="border border-black/30 dark:border-white/20 dark:text-white text-black shadow-md bg-background/60 backdrop-blur-md flex flex-col justify-between">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">
                            {step === 1 && "Change Password"}
                            {step === 2 && "Success!"}
                            {step === 3 && "Failed!"}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1 overflow-auto">
                        <AnimatePresence mode="wait">
                            {/* Step 1: Password Form */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    variants={inputVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="space-y-4"
                                >
                                    {renderInput(
                                        "New Password",
                                        "••••••••",
                                        register("password", {
                                            required: "Password is required",
                                            minLength: { value: 6, message: "Minimum 6 characters" }
                                        })
                                    )}
                                    {errors.password && <p className="text-pink-600 text-sm mt-0">{errors.password.message}</p>}

                                    {renderInput(
                                        "Confirm Password",
                                        "••••••••",
                                        register("confirmPassword", {
                                            required: "Confirm password is required",
                                            validate: (val) => val === getValues("password") || "Passwords do not match"
                                        })
                                    )}
                                    {errors.confirmPassword && (
                                        <p className="text-pink-600 text-sm mt-0">{errors.confirmPassword.message}</p>
                                    )}
                                </motion.div>
                            )}

                            {/* Step 2: Success */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    variants={inputVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="text-center space-y-4"
                                >
                                    <p className="text-green-600 font-semibold">Your password has been changed successfully!</p>
                                </motion.div>
                            )}

                            {/* Step 3: Failed */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    variants={inputVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="text-center space-y-4"
                                >
                                    <p className="text-rose-600 font-semibold">Failed to change password.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>

                    {/* Footer Buttons */}
                    <CardFooter className="flex flex-col gap-4 mt-auto">
                        {step === 1 && (
                            <Button type="submit" disabled={isLoading} variant="outline">
                                {isLoading ? "Updating..." : "Update Password"} <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        )}

                        {step === 3 && (
                            <div className="flex gap-4 w-full mt-auto">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                    Try Again
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => router.push(Routes.Login)}
                                >
                                    Go to Login
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
                            <Button
                                type="button"
                                className="w-full"
                                variant="outline"
                                onClick={() => router.push(Routes.Login)}
                            >
                                Continue to Login
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </form>
        </div>
    )
}
