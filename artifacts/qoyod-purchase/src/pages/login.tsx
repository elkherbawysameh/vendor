import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").endsWith("@qoyod.com", "Email must end with @qoyod.com"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.email);
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-4 text-center items-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-2">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">Qoyod Procurement</CardTitle>
          <CardDescription>
            Enter your Qoyod email to access the Vendor & Purchase Management System
            <br />
            <span className="text-xs mt-1 block">أدخل بريدك الإلكتروني للوصول إلى نظام إدارة المشتريات</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address / البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input placeholder="name@qoyod.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing in..." : "Sign In / تسجيل الدخول"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
