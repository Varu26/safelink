'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Shield, Smartphone, Watch } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/onboarding';
  const error = searchParams.get('error');

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emergency text-emergency-foreground">
          <Shield className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl">Welcome to SafeLink</CardTitle>
        <CardDescription>
          Sign in with Google to access your safety dashboard and manage emergency contacts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-emergency/10 p-3 text-sm text-emergency">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Authentication failed. Please try again.</span>
          </div>
        )}

        <Button
          className="w-full gap-2"
          onClick={() => signIn('google', { callbackUrl: searchParams.get('callbackUrl') || '/onboarding' })}
          disabled={error === 'OAuthSignin'}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button variant="outline" className="w-full gap-2" disabled>
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          Continue with Apple
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-4">
        <p className="text-xs text-muted-foreground text-center">
          By continuing, you agree to our{' '}
          <a href="#" className="underline hover:text-foreground">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Watch App</span>
          </div>
          <div className="flex items-center gap-1">
            <Smartphone className="h-4 w-4" />
            <span>Phone App</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Suspense fallback={<div className="w-full max-w-md"><div className="animate-pulse space-y-4"><div className="h-12 bg-muted rounded-xl"></div><div className="h-48 bg-muted rounded-xl"></div></div></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}