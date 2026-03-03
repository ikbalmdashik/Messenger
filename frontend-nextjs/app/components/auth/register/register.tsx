// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { useForm } from "react-hook-form"
// import axios from "axios"
// import API_ENDPOINTS from "@/app/routes/api"
// import Routes from "@/app/routes/routes"
// import {
//     Card,
//     CardContent,
//     CardFooter,
//     CardHeader,
//     CardTitle
// } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Button } from "@/components/ui/button"
// import { ArrowLeft, ArrowRight } from "lucide-react"

// type FormData = {
//     fullName: string
//     phone: string
//     email: string
//     password: string
//     confirmPassword: string
// }

// const Registration = () => {
//     const router = useRouter()
//     const [step, setStep] = useState<1 | 2 | 3>(1)
//     const [isLoading, setIsLoading] = useState(false)
//     const [message, setMessage] = useState("")

//     const {
//         register,
//         handleSubmit,
//         formState: { errors },
//         getValues,
//         trigger
//     } = useForm<FormData>({mode: "onChange"})

//     const nextStep = async () => {
//         let valid = false
//         if (step === 1) {
//             valid = await trigger(["fullName", "phone"])
//         } else if (step === 2) {
//             valid = await trigger("email")
//         }

//         if (valid) {
//             setStep((prev) => (prev < 3 ? (prev + 1) as 2 | 3 : prev))
//         }
//     }
//     const prevStep = () => setStep((prev) => (prev > 1 ? (prev - 1) as any : prev))

//     const onSubmit = async (data: FormData) => {
//         setIsLoading(true)
//         try {
//             const res = await axios.post(API_ENDPOINTS.CreateUser, {
//                 fullName: data.fullName,
//                 email: data.email,
//                 phone: data.phone,
//                 password: data.password,
//                 role: "user"
//             })
//             setMessage(res.data.message)
//         } catch (err) {
//             console.log(err)
//         } finally {
//             setIsLoading(false)
//         }
//     }

//     return (
//         <div className="flex items-center justify-center min-h-screen px-4">
//             <form
//                 onSubmit={handleSubmit(onSubmit)}
//                 className="w-full max-w-md transition-all"
//             >
//                 <Card className="border border-black/30 dark:border-white/20 dark:text-white text-black shadow-md bg-background/60 backdrop-blur-md">
//                     <CardHeader className="text-center">
//                         <CardTitle className="text-2xl">
//                             {step === 1 && "Your Basic Info"}
//                             {step === 2 && "Email"}
//                             {step === 3 && "Set Your Password"}
//                         </CardTitle>
//                     </CardHeader>

//                     <CardContent className="space-y-4">
//                         {message && (
//                             <p className="text-sky-500 text-center font-semibold">{message}</p>
//                         )}

//                         {step === 1 && (
//                             <>
//                                 <div>
//                                     <Label>Full Name</Label>
//                                     <Input
//                                         placeholder="Ashik Ikbal"
//                                         {...register("fullName", {
//                                             required: "Full name is required",
//                                             minLength: {
//                                                 value: 3,
//                                                 message: "At least 3 characters"
//                                             }
//                                         })}
//                                     />
//                                     {errors.fullName && (
//                                         <p className="text-pink-600 text-sm mt-1">{errors.fullName.message}</p>
//                                     )}
//                                 </div>
//                                 <div>
//                                     <Label>Phone</Label>
//                                     <Input
//                                         placeholder="01xxxxxxxxx"
//                                         {...register("phone", {
//                                             required: "Phone number required",
//                                             minLength: {
//                                                 value: 11,
//                                                 message: "Must be 11 digits"
//                                             },
//                                             maxLength: {
//                                                 value: 11,
//                                                 message: "Must be 11 digits"
//                                             }
//                                         })}
//                                     />
//                                     {errors.phone && (
//                                         <p className="text-pink-600 text-sm mt-1">{errors.phone.message}</p>
//                                     )}
//                                 </div>
//                             </>
//                         )}

//                         {step === 2 && (
//                             <div>
//                                 <Label>Email</Label>
//                                 <Input
//                                     type="email"
//                                     placeholder="you@example.com"
//                                     {...register("email", {
//                                         required: "Email required",
//                                         pattern: {
//                                             value: /\S+@\S+\.\S+/,
//                                             message: "Invalid email format"
//                                         }
//                                     })}
//                                 />
//                                 {errors.email && (
//                                     <p className="text-pink-600 text-sm mt-1">{errors.email.message}</p>
//                                 )}
//                             </div>
//                         )}

//                         {step === 3 && (
//                             <>
//                                 <div>
//                                     <Label>Password</Label>
//                                     <Input
//                                         type="password"
//                                         className="tracking-wider"
//                                         {...register("password", {
//                                             required: "Password required",
//                                             minLength: {
//                                                 value: 6,
//                                                 message: "Minimum 6 characters"
//                                             }
//                                         })}
//                                     />
//                                     {errors.password && (
//                                         <p className="text-pink-600 text-sm mt-1">{errors.password.message}</p>
//                                     )}
//                                 </div>
//                                 <div>
//                                     <Label>Confirm Password</Label>
//                                     <Input
//                                         type="password"
//                                         {...register("confirmPassword", {
//                                             required: "Confirm password required",
//                                             validate: (val) =>
//                                                 val === getValues("password") || "Passwords do not match"
//                                         })}
//                                     />
//                                     {errors.confirmPassword && (
//                                         <p className="text-pink-600 text-sm mt-1">{errors.confirmPassword.message}</p>
//                                     )}
//                                 </div>
//                             </>
//                         )}
//                     </CardContent>

//                     <CardFooter className="flex flex-col gap-3">
//                         <div className="flex w-full justify-between">
//                             {step > 1 ? (
//                                 <Button type="button" variant="outline" onClick={prevStep}>
//                                     <ArrowLeft className="w-4 h-4 mr-1" /> Back
//                                 </Button>
//                             ) : (
//                                 <div />
//                             )}
//                             {step < 3 ? (
//                                 <Button type="button" onClick={nextStep}>
//                                     Continue <ArrowRight className="w-4 h-4 ml-1" />
//                                 </Button>
//                             ) : (
//                                 <Button type="submit" disabled={isLoading}>
//                                     {isLoading ? "Registering..." : "Register"}
//                                 </Button>
//                             )}
//                         </div>

//                         <div className="flex items-center w-full text-sm text-muted-foreground">
//                             <hr className="flex-grow border-gray-500" />
//                             <span className="mx-2">or</span>
//                             <hr className="flex-grow border-gray-500" />
//                         </div>

//                         <Button
//                             variant="ghost"
//                             type="button"
//                             onClick={() => router.push(Routes.Login)}
//                             className="w-full"
//                         >
//                             Already have an account? Log In
//                         </Button>
//                     </CardFooter>
//                 </Card>
//             </form>
//         </div>
//     )
// }

// export default Registration





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
import { AnimatePresence, motion } from "framer-motion"
import { AiOutlineUser, AiOutlinePhone, AiOutlineMail, AiOutlineLock } from "react-icons/ai"
import { FcGoogle } from "react-icons/fc"
import { AiFillApple } from "react-icons/ai"
import { FaFacebookF } from "react-icons/fa"

type FormData = {
  fullName: string
  phone: string
  email: string
  password: string
  confirmPassword: string
}

const inputVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

const Registration = () => {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    trigger
  } = useForm<FormData>({ mode: "onChange" })

  const nextStep = async () => {
    let valid = false

    if (step === 1) {
      valid = await trigger(["fullName", "phone"])
    } else if (step === 2) {
      valid = await trigger("email")
      if (valid) {
        const email = getValues("email")
        try {
          const exists = (
            await axios.post(API_ENDPOINTS.IsEmailExist, { email })
          ).data
          if (exists) {
            setStep(4)
            return
          } else {
            setStep(3)
            return
          }
        } catch (err) {
          console.log(err)
        }
      }
    }

    if (valid) setStep((prev) => (prev < 3 ? (prev + 1) as 2 | 3 : prev))
  }

  const prevStep = () => {
    // If coming from Step 4 (email exists), go back to Step 2 (email input)
    if (step === 4) {
      setStep(2)
    } else {
      setStep((prev) => (prev > 1 ? (prev - 1) as any : prev))
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      await axios.post(API_ENDPOINTS.CreateUser, {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: "user"
      })
      setStep(5) // success step
    } catch (err) {
      console.log(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider: "google" | "apple" | "facebook") => {
    alert(`Login with ${provider} not implemented yet.`)
  }

  const renderInput = (label: string, icon: JSX.Element, placeholder: string, props: any) => (
    <div>
      <Label className="mb-1">{label}</Label>
      <div className="relative">
        {icon}
        <Input placeholder={placeholder} className="pl-10" {...props} />
      </div>
    </div>
  )

  return (
    <div className="flex items-center justify-center min-h-[100dvh] px-4 bg-white dark:bg-slate-950 transition-colors">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
        <Card className="border border-black/30 dark:border-white/20 dark:text-white text-black shadow-md bg-background/60 backdrop-blur-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {step === 1 && "Your Basic Info"}
              {step === 2 && "Email"}
              {step === 3 && "Set Your Password"}
              {step === 4 && "Email Already Exists"}
              {step === 5 && "Registration Successful!"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
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
                    "Full Name",
                    <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />,
                    "Ashik Ikbal",
                    register("fullName", {
                      required: "Full name is required",
                      minLength: { value: 3, message: "At least 3 characters" }
                    })
                  )}
                  {errors.fullName && (
                    <p className="text-pink-600 text-sm mt-0">{errors.fullName.message}</p>
                  )}

                  {renderInput(
                    "Phone",
                    <AiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />,
                    "01xxxxxxxxx",
                    register("phone", {
                      required: "Phone number required",
                      minLength: { value: 11, message: "Must be 11 digits" },
                      maxLength: { value: 11, message: "Must be 11 digits" }
                    })
                  )}
                  {errors.phone && (
                    <p className="text-pink-600 text-sm mt-0">{errors.phone.message}</p>
                  )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-4"
                >
                  {renderInput(
                    "Email",
                    <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />,
                    "you@example.com",
                    register("email", {
                      required: "Email required",
                      pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email format" }
                    })
                  )}
                  {errors.email && (
                    <p className="text-pink-600 text-sm mt-0">{errors.email.message}</p>
                  )}

                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Or continue with</p>
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        className="flex-1 flex items-center justify-center gap-2"
                        onClick={() => handleSocialLogin("google")}
                      >
                        <FcGoogle className="w-5 h-5" /> Google
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 flex items-center justify-center gap-2"
                        onClick={() => handleSocialLogin("apple")}
                      >
                        <AiFillApple className="w-5 h-5" /> Apple
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 flex items-center justify-center gap-2"
                        onClick={() => handleSocialLogin("facebook")}
                      >
                        <FaFacebookF className="w-5 h-5" /> Facebook
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-4"
                >
                  {renderInput(
                    "Password",
                    <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />,
                    "•••••••",
                    register("password", {
                      required: "Password required",
                      minLength: { value: 6, message: "Minimum 6 characters" }
                    })
                  )}
                  {errors.password && (
                    <p className="text-pink-600 text-sm mt-0">{errors.password.message}</p>
                  )}

                  {renderInput(
                    "Confirm Password",
                    <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />,
                    "•••••••",
                    register("confirmPassword", {
                      required: "Confirm password required",
                      validate: (val) =>
                        val === getValues("password") || "Passwords do not match"
                    })
                  )}
                  {errors.confirmPassword && (
                    <p className="text-pink-600 text-sm mt-0">{errors.confirmPassword.message}</p>
                  )}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="text-center space-y-4"
                >
                  <p className="text-red-600 font-semibold">This email already exists.</p>

                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full mb-2"
                  >
                    Change Email
                  </Button>

                  <p className="mt-2 text-sm text-muted-foreground">Or continue with</p>
                  <div className="flex justify-center gap-4 mt-2">
                    <Button
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2"
                      onClick={() => handleSocialLogin("google")}
                    >
                      <FcGoogle className="w-5 h-5" /> Google
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2"
                      onClick={() => handleSocialLogin("apple")}
                    >
                      <AiFillApple className="w-5 h-5" /> Apple
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2"
                      onClick={() => handleSocialLogin("facebook")}
                    >
                      <FaFacebookF className="w-5 h-5" /> Facebook
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="text-center space-y-4"
                >
                  <p className="text-green-600 font-semibold">Registration successful!</p>
                  <Button
                    variant="default"
                    type="button"
                    className="w-full"
                    onClick={() => router.push(Routes.Login)}
                  >
                    Continue to Login
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <div className="flex w-full justify-between">
              {step > 1 && step < 5 ? (
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
              ) : step === 3 ? (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Registering..." : "Register"}{" "}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : null}
            </div>

            {/* Divider */}
            {step !== 5 && (
              <div className="flex items-center w-full text-sm text-muted-foreground">
                <hr className="flex-grow border-gray-500" />
                <span className="mx-2">or</span>
                <hr className="flex-grow border-gray-500" />
              </div>
            )}

            {step !== 5 && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => router.push(Routes.Login)}
                className="w-full"
              >
                Already have an account? Log In
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

export default Registration
