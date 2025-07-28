"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import axios from "axios"
import API_ENDPOINTS from "@/app/routes/api"
import Routes from "@/app/routes/routes"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"

type FormData = {
    fullName: string
    phone: string
    email: string
    password: string
    confirmPassword: string
}

const Registration = () => {
    const router = useRouter()
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState("")

    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues,
        trigger
    } = useForm<FormData>({mode: "onChange"})

    const nextStep = async () => {
        let valid = false
        if (step === 1) {
            valid = await trigger(["fullName", "phone"])
        } else if (step === 2) {
            valid = await trigger("email")
        }

        if (valid) {
            setStep((prev) => (prev < 3 ? (prev + 1) as 2 | 3 : prev))
        }
    }
    const prevStep = () => setStep((prev) => (prev > 1 ? (prev - 1) as any : prev))

    const onSubmit = async (data: FormData) => {
        setIsLoading(true)
        try {
            const res = await axios.post(API_ENDPOINTS.CreateUser, {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                password: data.password,
                role: "user"
            })
            setMessage(res.data.message)
        } catch (err) {
            console.log(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen px-4">
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-full max-w-md transition-all"
            >
                <Card className="border border-black/30 dark:border-white/20 dark:text-white text-black shadow-md bg-background/60 backdrop-blur-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">
                            {step === 1 && "Your Basic Info"}
                            {step === 2 && "Email"}
                            {step === 3 && "Set Your Password"}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {message && (
                            <p className="text-sky-500 text-center font-semibold">{message}</p>
                        )}

                        {step === 1 && (
                            <>
                                <div>
                                    <Label>Full Name</Label>
                                    <Input
                                        placeholder="Ashik Ikbal"
                                        {...register("fullName", {
                                            required: "Full name is required",
                                            minLength: {
                                                value: 3,
                                                message: "At least 3 characters"
                                            }
                                        })}
                                    />
                                    {errors.fullName && (
                                        <p className="text-pink-600 text-sm mt-1">{errors.fullName.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input
                                        placeholder="01xxxxxxxxx"
                                        {...register("phone", {
                                            required: "Phone number required",
                                            minLength: {
                                                value: 11,
                                                message: "Must be 11 digits"
                                            },
                                            maxLength: {
                                                value: 11,
                                                message: "Must be 11 digits"
                                            }
                                        })}
                                    />
                                    {errors.phone && (
                                        <p className="text-pink-600 text-sm mt-1">{errors.phone.message}</p>
                                    )}
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <div>
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    {...register("email", {
                                        required: "Email required",
                                        pattern: {
                                            value: /\S+@\S+\.\S+/,
                                            message: "Invalid email format"
                                        }
                                    })}
                                />
                                {errors.email && (
                                    <p className="text-pink-600 text-sm mt-1">{errors.email.message}</p>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <>
                                <div>
                                    <Label>Password</Label>
                                    <Input
                                        type="password"
                                        className="tracking-wider"
                                        {...register("password", {
                                            required: "Password required",
                                            minLength: {
                                                value: 6,
                                                message: "Minimum 6 characters"
                                            }
                                        })}
                                    />
                                    {errors.password && (
                                        <p className="text-pink-600 text-sm mt-1">{errors.password.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Confirm Password</Label>
                                    <Input
                                        type="password"
                                        {...register("confirmPassword", {
                                            required: "Confirm password required",
                                            validate: (val) =>
                                                val === getValues("password") || "Passwords do not match"
                                        })}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-pink-600 text-sm mt-1">{errors.confirmPassword.message}</p>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3">
                        <div className="flex w-full justify-between">
                            {step > 1 ? (
                                <Button type="button" variant="outline" onClick={prevStep}>
                                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                </Button>
                            ) : (
                                <div />
                            )}
                            {step < 3 ? (
                                <Button type="button" onClick={nextStep}>
                                    Continue <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Registering..." : "Register"}
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center w-full text-sm text-muted-foreground">
                            <hr className="flex-grow border-gray-500" />
                            <span className="mx-2">or</span>
                            <hr className="flex-grow border-gray-500" />
                        </div>

                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => router.push(Routes.Login)}
                            className="w-full"
                        >
                            Already have an account? Log In
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    )
}

export default Registration
