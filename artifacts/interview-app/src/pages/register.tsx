import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
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

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const registerMutation = useRegister();

  useEffect(() => {
    if (user && !isUserLoading) {
      setLocation("/dashboard");
    }
  }, [user, isUserLoading, setLocation]);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          // Store the auth token in localStorage
          if (response.token) {
            localStorage.setItem("auth_token", response.token);
            // Invalidate the auth query to trigger a refetch with the new token
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          }
          toast({ title: "Account created!", description: "Welcome to CoachAI." });
          setLocation("/dashboard");
        },
        onError: (err) => {
          toast({ 
            title: "Registration failed", 
            description: "An error occurred. Please try again.",
            variant: "destructive"
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      <div className="hidden lg:block relative w-0 flex-1 bg-primary">
        <div className="absolute inset-0 flex flex-col justify-center items-center text-primary-foreground p-12 text-center">
          <Video className="w-24 h-24 mb-8 opacity-90" />
          <h2 className="text-4xl font-bold tracking-tight mb-4">Start Your Journey</h2>
          <p className="text-lg opacity-80 max-w-md">
            Join thousands of candidates who improved their interview skills and landed their dream roles.
          </p>
        </div>
      </div>
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
              <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
              <p className="text-muted-foreground text-sm">
                Get started with your personal AI interview coach.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="name">Full Name</Label>
                      <FormControl>
                        <Input 
                          id="name" 
                          placeholder="John Doe" 
                          autoComplete="name"
                          data-testid="input-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          autoComplete="new-password"
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
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? "Creating account..." : "Sign up"}
                </Button>
              </form>
            </Form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
