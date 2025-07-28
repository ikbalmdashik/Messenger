import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthStepSkeleton({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <form className="w-full max-w-md animate-pulse">
        <Card className="bg-transparent border border-black/30 dark:border-white/20 shadow-md dark:text-white text-black">
          <CardHeader className="relative">
            <CardTitle className="text-center text-2xl">
              <Skeleton className="h-8 w-60 mx-auto bg-white/10" />
            </CardTitle>
            {(step === 2 || step === 3 || step === 4) && (
              <Skeleton className="absolute left-2 top-2 h-8 w-20 rounded bg-white/20" />
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {step === 1 && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 bg-white/10" /> {/* Label */}
                <Skeleton className="h-10 w-full rounded-md pl-10 bg-white/10" /> {/* Email input */}
                {/* <Skeleton className="h-4 w-1/2 bg-white/20" /> */}
              </div>
            )}

            {step === 2 && (
              <div className="text-center space-y-4">
                <Skeleton className="h-4 w-48 mx-auto bg-white/10" /> {/* Not found message */}
                <Skeleton className="h-10 w-40 mx-auto rounded-md bg-white/10" /> {/* Register button */}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-white/10" /> {/* Label */}
                <Skeleton className="h-10 w-full rounded-md pl-10 bg-white/10" /> {/* Password input */}
                <Skeleton className="h-4 w-1/2" /> {/* Error */}
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-4">
                <Skeleton className="h-4 w-32 mx-auto bg-white/10" /> {/* Wrong password message */}
                <Skeleton className="h-10 w-48 mx-auto rounded-md bg-white/10" /> {/* Recover Password button */}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {(step === 1 || step === 3) && (
              <Skeleton className="h-10 w-full rounded-md bg-white/10" /> /* Continue / Login button */
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
