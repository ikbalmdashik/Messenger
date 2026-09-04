"use client"

import Routes from "@/app/routes/routes"
import API_ENDPOINTS from "@/app/routes/api"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useState, useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { motion, AnimatePresence } from "framer-motion"
import { FaAngleRight } from "react-icons/fa"
import { MdClose } from "react-icons/md"
import { Mail, Lock, User, Phone, AlertCircle, MessageCircle, ArrowLeft, Eye, EyeOff } from "lucide-react"

import { Button, Card, Flex, Text, Box, TextField, IconButton, AlertDialog } from "@radix-ui/themes"

type FormData = {
  fullName: string
  phone: string
  email: string
  password: string
  confirmPassword: string
}

type Step = 1 | 2 | 3 | 4

const STEP_CONFIG = {
  HEADERS: {
    1: { title: "Your Basic Info", color: undefined },
    2: { title: "Enter your Email", color: undefined },
    3: { title: "Set Your Password", color: undefined },
    4: { title: "Registration Successful!", color: "green" },
  } as const,
  PREVIOUS_STEP: {
    2: 1, 3: 2
  } as Record<Exclude<Step, 1 | 4>, Step>
} as const

const TOTAL_FORM_STEPS = 3

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
}

const MultiStepRegistration = () => {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loadingButton, setLoadingButton] = useState<string | null>(null)

  // Alert Dialog State
  const [isAlertOpen, setIsAlertOpen] = useState(false)

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    trigger
  } = useForm<FormData>({ mode: "onChange" })

  // API calls
  const checkEmailExists = useCallback(async (email: string) => {
    return (await axios.post(API_ENDPOINTS.IsEmailExist, { email })).data
  }, [])

  const createUser = useCallback(async (data: FormData) => {
    return await axios.post(API_ENDPOINTS.CreateUser, {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: "user"
    })
  }, [])

  // Step handlers
  const handleNextStep = useCallback(async () => {
    if (step === 1) {
      const valid = await trigger(["fullName", "phone"])
      if (valid) setStep(2)
    } else if (step === 2) {
      const valid = await trigger("email")
      if (!valid) return

      setLoadingButton("checkEmail")
      try {
        const exists = await checkEmailExists(getValues("email"))
        if (exists) {
          setIsAlertOpen(true)
        } else {
          setStep(3)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingButton(null)
      }
    }
  }, [step, trigger, getValues, checkEmailExists])

  const onSubmit = useCallback(async (data: FormData) => {
    setLoadingButton("register")
    try {
      await createUser(data)
      setStep(4)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingButton(null)
    }
  }, [createUser])

  const goToPreviousStep = useCallback(() => {
    if (step in STEP_CONFIG.PREVIOUS_STEP) {
      setStep(STEP_CONFIG.PREVIOUS_STEP[step as Exclude<Step, 1 | 4>])
    }
  }, [step])

  const goToLogin = useCallback(() => {
    setLoadingButton("gotologin")
    router.push(Routes.Login)
  }, [router])

  // Step Indicator Component
  const renderStepIndicator = () => {
    if (step > 3) return null

    return (
      <Flex direction="column" align="center" gap="2" py="3">
        <Text size="1" color="gray" weight="medium">
          Step {step} of {TOTAL_FORM_STEPS}
        </Text>
        <Flex gap="2" align="center" justify="center">
          {[1, 2, 3].map((i) => (
            <Box
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step
                ? "w-8 bg-sky-500"
                : i < step
                  ? "w-2 bg-sky-300 dark:bg-sky-700"
                  : "w-2 bg-gray-200 dark:bg-gray-700"
                }`}
            />
          ))}
        </Flex>
      </Flex>
    )
  }

  // Step content wrapper
  const stepContent = useMemo(() => {
    switch (step) {
      case 1:
        return (
          <motion.div key="step1-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <Box mb="3">
              <Box mb="2">
                <Text as="label" size="2" weight="medium" htmlFor="fullName">
                  Full Name
                </Text>
              </Box>
              <TextField.Root
                id="fullName"
                type="text"
                placeholder="Ashik Ikbal"
                {...register("fullName", {
                  required: "Full name is required",
                  minLength: { value: 3, message: "At least 3 characters" }
                })}
              >
                <TextField.Slot>
                  <User className="w-5 h-5 text-gray-400" />
                </TextField.Slot>
              </TextField.Root>
              {errors.fullName && (
                <Flex align="center" gap="1" mt="1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <Text size="2" color="red">{errors.fullName.message}</Text>
                </Flex>
              )}
            </Box>

            <Box>
              <Box mb="2">
                <Text as="label" size="2" weight="medium" htmlFor="phone">
                  Phone
                </Text>
              </Box>
              <TextField.Root
                id="phone"
                type="text"
                placeholder="01xxxxxxxxx"
                {...register("phone", {
                  required: "Phone number required",
                  minLength: { value: 11, message: "Must be 11 digits" },
                  maxLength: { value: 11, message: "Must be 11 digits" }
                })}
              >
                <TextField.Slot>
                  <Phone className="w-5 h-5 text-gray-400" />
                </TextField.Slot>
              </TextField.Root>
              {errors.phone && (
                <Flex align="center" gap="1" mt="1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <Text size="2" color="red">{errors.phone.message}</Text>
                </Flex>
              )}
            </Box>
          </motion.div>
        )

      case 2:
        return (
          <motion.div key="step2-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <Box mb="2">
              <Text as="label" size="2" weight="medium" htmlFor="email">
                Email
              </Text>
            </Box>
            <TextField.Root
              id="email"
              type="text"
              placeholder="you@example.com"
              {...register("email", {
                required: "Email required",
                pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email format" }
              })}
            >
              <TextField.Slot>
                <Mail className="w-5 h-5 text-gray-400" />
              </TextField.Slot>
            </TextField.Root>
            {errors.email && (
              <Flex align="center" gap="1" mt="1">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <Text size="2" color="red">{errors.email.message}</Text>
              </Flex>
            )}
          </motion.div>
        )

      case 3:
        return (
          <motion.div key="step3-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <Box mb="3">
              <Box mb="2">
                <Text as="label" size="2" weight="medium" htmlFor="password">
                  Password
                </Text>
              </Box>
              <TextField.Root
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={showPassword ? "Enter password" : "●●●●●●●●"}
                className={!showPassword ? "tracking-[3px]" : ""}
                {...register("password", {
                  required: "Password required",
                  minLength: { value: 6, message: "Minimum 6 characters" }
                })}
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
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </IconButton>
                </TextField.Slot>
              </TextField.Root>
              {errors.password && (
                <Flex align="center" gap="1" mt="1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <Text size="2" color="red">{errors.password.message}</Text>
                </Flex>
              )}
            </Box>

            <Box>
              <Box mb="2">
                <Text as="label" size="2" weight="medium" htmlFor="confirmPassword">
                  Confirm Password
                </Text>
              </Box>
              <TextField.Root
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder={showConfirmPassword ? "Re-enter password" : "●●●●●●●●"}
                className={!showConfirmPassword ? "tracking-[3px]" : ""}
                {...register("confirmPassword", {
                  required: "Confirm password required",
                  validate: (val) => val === getValues("password") || "Passwords do not match"
                })}
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
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </IconButton>
                </TextField.Slot>
              </TextField.Root>
              {errors.confirmPassword && (
                <Flex align="center" gap="1" mt="1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <Text size="2" color="red">{errors.confirmPassword.message}</Text>
                </Flex>
              )}
            </Box>
          </motion.div>
        )

      case 4:
        return (
          <motion.div key="step4-content" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <Text align="center" size="2" color="green" as="div">
              Your account has been created successfully! You can now log in.
            </Text>
          </motion.div>
        )

      default:
        return null
    }
  }, [step, errors, register, getValues, showPassword, showConfirmPassword])

  // Dynamic Footer Buttons
  const footerButtons = useMemo(() => {
    switch (step) {
      case 1:
      case 2:
        return (
          <Box width="100%">
            <Button
              type="button"
              size="2"
              onClick={handleNextStep}
              loading={loadingButton === "checkEmail"}
              style={{ width: "100%" }}
            >
              <Flex align="center" gap="2" justify="center">
                Continue <FaAngleRight />
              </Flex>
            </Button>
          </Box>
        )

      case 3:
        return (
          <Box width="100%">
            <Button
              type="submit"
              size="2"
              loading={loadingButton === "register"}
              style={{ width: "100%" }}
            >
              <Flex align="center" gap="2" justify="center">
                Register <FaAngleRight />
              </Flex>
            </Button>
          </Box>
        )

      case 4:
        return (
          <Box width="100%">
            <Button
              type="button"
              size="2"
              onClick={goToLogin}
              loading={loadingButton === "gotologin"}
              style={{ width: "100%" }}
            >
              <Flex align="center" gap="2" justify="center">
                Continue to Login <FaAngleRight />
              </Flex>
            </Button>
          </Box>
        )

      default:
        return null
    }
  }, [step, loadingButton, handleNextStep, goToLogin])

  return (
    <Flex align="center" justify="center" className="min-h-[100dvh] p-4">
      <Box className="w-full max-w-md">
        <Flex align="center" justify="center" gap="3" mb="6">
          <MessageCircle className="w-8 h-8 text-sky-500" />
          <Text size="8" weight="bold" className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
            Messenger
          </Text>
        </Flex>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card variant="ghost" className="shadow-xl">
            <Box position="relative" className="text-center pt-6 pb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`header-${step}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <Text as="div" size="6" weight="bold" color={STEP_CONFIG.HEADERS[step].color}>
                    {STEP_CONFIG.HEADERS[step].title}
                  </Text>
                </motion.div>
              </AnimatePresence>

              {renderStepIndicator()}
            </Box>

            {/* Back Navigator Bar */}
            {step > 1 && step < 4 && (
              <Box px="4" pt="1" pb="2">
                <Button
                  type="button"
                  variant="ghost"
                  color="gray"
                  size="1"
                  onClick={goToPreviousStep}
                  className="cursor-pointer"
                >
                  <Flex align="center" gap="1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <Text size="1" weight="medium">Back to previous step</Text>
                  </Flex>
                </Button>
              </Box>
            )}

            <Box px="4" py="2">
              <AnimatePresence mode="wait">
                {stepContent}
              </AnimatePresence>
            </Box>

            <Box px="3" pb="3" width="100%" mt="3">
              {footerButtons}

              {step !== 4 && (
                <Box mt="3">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={goToLogin}
                    loading={loadingButton === "gotologin"}
                    style={{ width: "100%" }}
                  >
                    Already have an account? Log In
                  </Button>
                </Box>
              )}
            </Box>
          </Card>
        </form>

        {/* Radix UI AlertDialog for Email Already Registered */}
        <AlertDialog.Root open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialog.Content maxWidth="400px" className="relative p-6">
            {/* Top-Right Close Button */}
            <Box className="absolute top-3 right-3">
              <AlertDialog.Cancel>
                <IconButton variant="ghost" color="gray" type="button" size="2">
                  <MdClose className="w-5 h-5" />
                </IconButton>
              </AlertDialog.Cancel>
            </Box>

            {/* Centered Modal Content */}
            <Flex direction="column" align="center" className="text-center pt-2">
              <AlertDialog.Title className="text-center">
                <Flex align="center" justify="center" gap="2" className="text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  Email Already Registered
                </Flex>
              </AlertDialog.Title>

              <AlertDialog.Description size="2" my="4" className="text-center">
                The email address <strong>{getValues("email")}</strong> is already associated with an account!
              </AlertDialog.Description>
            </Flex>

            <AlertDialog.Cancel>
              <Flex align="end" justify="end" gap="2" mt="4">
                <Button variant="soft" color="gray">
                  Done
                </Button>
              </Flex>
            </AlertDialog.Cancel>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Box>
    </Flex>
  )
}

export default MultiStepRegistration