"use client"

import API_ENDPOINTS from "@/app/routes/api"
import Routes from "@/app/routes/routes"
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
import { Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react"
import { AuthStepSkeleton } from "../sleleton/authSkeleton"

type FormData = {
    email: string
    password: string
}

const MultiStepLogin = () => {
    const router = useRouter()
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
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
            const isEmailEsist = (await axios.post(API_ENDPOINTS.IsEmailExist, { email: inputEmail })).data

            if (isEmailEsist) {
                setStep(3)
            } else {
                setStep(2)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = async (data: FormData) => {
        setLoading(true)
        try {
            const result = await AuthLogin(data.email, data.password)
            if (result?.data?.userId != null) {
                sessionStorage.setItem("loginId", `${result.data.userId}`)
                router.push(Routes.Chat)
            } else {
                setStep(4)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }


    return (
        <>
            {loading ? (
                <AuthStepSkeleton step={step} />
            ) : (
                <div className="flex items-center justify-center min-h-screen px-4">


                    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
                        <Card className="bg-transparent border border-black/30 dark:border-white/20 shadow-md dark:text-white text-black">
                            <CardHeader className="relative">
                                {step === 1 && (
                                    <CardTitle className="text-center text-2xl">Enter your Email</CardTitle>
                                )}
                                {step === 2 && (
                                    <>
                                        <CardTitle className="text-center text-2xl text-red-600">Email Not Found</CardTitle>
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="absolute left-2 top-2 text-muted-foreground"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                        </Button>
                                    </>
                                )}
                                {step === 3 && (
                                    <>
                                        <CardTitle className="text-center text-2xl">Enter your Password</CardTitle>
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="absolute left-2 top-2 text-muted-foreground"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                        </Button>
                                    </>
                                )}
                                {step === 4 && (
                                    <>
                                        <CardTitle className="text-center text-2xl text-red-600">
                                            Password Incorrect
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            onClick={() => setStep(3)}
                                            className="absolute left-2 top-2 text-muted-foreground"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                        </Button>
                                    </>
                                )}
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {step === 1 && (
                                    <div>
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
                                                    pattern: {
                                                        value: /\S+@\S+\.\S+/,
                                                        message: "Enter a valid email",
                                                    },
                                                })}
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="text-sm text-pink-700 mt-1">{errors.email.message}</p>
                                        )}
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="text-center space-y-4">
                                        <p className="text-sm text-muted-foreground">We couldn't find that email.</p>
                                        <Button
                                            type="button"
                                            variant="default"
                                            onClick={() => router.push(Routes.Register)}
                                        >
                                            Go to Register
                                        </Button>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div>
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="•••••••"
                                                className="tracking-[5px] text-2xl pl-10 border-black/30 dark:border-white/20"
                                                {...register("password", {
                                                    required: "Password is required",
                                                })}
                                            />
                                        </div>
                                        {errors.password && (
                                            <p className="text-sm text-pink-700 mt-1">{errors.password.message}</p>
                                        )}
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="text-center space-y-4">
                                        <p className="text-sm text-red-600">Wrong password.</p>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                router.push("/recover-password")
                                            }}
                                        >
                                            Recover Password
                                        </Button>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4">
                                {step === 1 && (
                                    <Button
                                        type="button"
                                        className="w-full flex justify-between"
                                        onClick={handleEmailStep}
                                        disabled={loading}
                                    >
                                        Continue
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                )}

                                {step === 3 && (
                                    <Button type="submit" className="w-full" disabled={loading}>
                                        Log In
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    </form>
                </div>
            )}
        </>
    );
}

export default MultiStepLogin
