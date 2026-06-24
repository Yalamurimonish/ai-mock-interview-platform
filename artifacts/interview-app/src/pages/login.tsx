import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const loginMutation = useLogin();

  useEffect(() => {
    if (user && !isUserLoading) {
      setLocation("/dashboard");
    }
  }, [user, isUserLoading, setLocation]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          // Store the auth token in localStorage
          if (response.token) {
            localStorage.setItem("auth_token", response.token);
            // Invalidate the auth query to trigger a refetch with the new token
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          }
          toast({ title: "Welcome back!", description: "Successfully logged in." });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ 
            title: "Login failed", 
            description: "Invalid email or password. Please try again.",
            variant: "destructive"
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex flex-col items-start gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-xl">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground">
                <Video className="w-5 h-5" />
              </div>
              CoachAI
            </Link>
            
            <div className="space-y-2 w-full">
              <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
              <p className="text-muted-foreground text-sm">
                Enter your details to access your dashboard.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="email">Email address</Label>
                      <FormControl>
                        <Input 
                          id="email" 
                          placeholder="you@example.com" 
                          type="email"
                          autoComplete="email"
                          data-testid="input-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="password">Password</Label>
                      <FormControl>
                        <Input 
                          id="password" 
                          placeholder="••••••••" 
                          type="password"
                          autoComplete="current-password"
                          data-testid="input-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base" 
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden lg:block relative w-0 flex-1 bg-primary">
        <div className="absolute inset-0 flex flex-col justify-center items-center text-primary-foreground p-12 text-center">
          <Video className="w-24 h-24 mb-8 opacity-90" />
          <h2 className="text-4xl font-bold tracking-tight mb-4">Master Your Interviews</h2>
          <p className="text-lg opacity-80 max-w-md">
            Practice makes perfect. Our AI analyzes your responses, identifies gaps, and gives you actionable feedback so you're ready for the real thing.
          </p>
        </div>
      </div>
    </div>
  );
}
