import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const apiBase = import.meta.env.VITE_API_BASE_URL || basePath;
// Tells the backend which frontend to send the browser back to after
// Google sign-in -- needed because the API may be hosted on a different
// origin than the page calling it (e.g. a GitHub Pages staging frontend).
const returnTo = encodeURIComponent(`${window.location.origin}${basePath}`);
const googleLoginUrl = `${apiBase}/api/index.php/api/auth/google/start?return_to=${returnTo}`;

const ERROR_MESSAGES: Record<string, string> = {
  domain: "You must sign in with a @qoyod.com email address.",
  oauth_state: "Sign-in expired, please try again.",
  oauth_token: "Could not complete sign-in with Google. Please try again.",
  oauth_email: "Google account has no verified email. Please try again.",
};

export default function LoginPage() {
  const { toast } = useToast();

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error) {
      toast({
        title: "Login Failed",
        description: ERROR_MESSAGES[error] || "Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-4 text-center items-center">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Qoyod" className="h-14 w-auto mb-2" />
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">Qoyod Procurement</CardTitle>
          <CardDescription>
            Sign in with your Qoyod Google account to access the Vendor & Purchase Management System
            <br />
            <span className="text-xs mt-1 block">سجّل الدخول بحساب Google الخاص بشركة قيود للوصول إلى نظام إدارة المشتريات</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full" size="lg">
            <a href={googleLoginUrl} className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48c-.28 1.5-1.13 2.78-2.4 3.63v3h3.89c2.28-2.1 3.6-5.19 3.6-8.82z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.89-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.27v3.1C3.25 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4.01-3.1z" />
                <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
              </svg>
              Sign in with Google / تسجيل الدخول بحساب Google
            </a>
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground mt-6">
        This system created by Sameh Elkherbawy. All rights reserved.
      </p>
    </div>
  );
}
