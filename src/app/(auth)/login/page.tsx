'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sheet as Sheep, Loader2 } from 'lucide-react'; // Added Loader2 for spinner

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icons from "@/components/layout/icons/socialIcon"

const loginSchema = z.object({
  email: z.string().email({ message: 'Email tidak valid' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false); // New state for Google loading

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (!result?.ok) {
        setError('Email atau password salah');
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error(error)
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // New function for Google login
  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      
      const result = await signIn('google', {
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError('Gagal login dengan Google. Silakan coba lagi.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Sheep className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Petugas Qurban</span>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Masuk ke Akun
          </CardTitle>
          <CardDescription className="text-center">
            Masukkan email dan password untuk mengakses panel admin
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button variant="link" className="p-0 h-auto" type="button">
                  Lupa password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isLoading || isGoogleLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : 'Masuk'}
            </Button>
            
            {/* Divider */}
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Atau lanjutkan dengan
                </span>
              </div>
            </div>
            
            {/* Google Login Button */}
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-2"
              onClick={handleGoogleLogin}
              type="button"
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="h-4 w-4" />
              )}
              <span>Google</span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}