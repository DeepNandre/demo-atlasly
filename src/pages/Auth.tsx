import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (error.message.includes('User already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email to confirm your account');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (!isLogin) {
        toast.success('Account created successfully! You can now sign in.');
      } else {
        toast.success('Signed in successfully!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Container with rounded corners and shadow */}
      <div className="w-full max-w-6xl mx-auto my-8 bg-white rounded-3xl shadow-2xl flex overflow-hidden">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col">
          {/* Header */}
          <div className="p-8 flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/30" />
            </div>
            <div className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                  setPassword('');
                }}
                className="text-foreground font-medium hover:underline"
              >
                {isLogin ? 'Register' : 'Sign In'}
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 flex items-center justify-center px-8 pb-12">
            <div className="w-full max-w-sm space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-500" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">
                  {isLogin ? 'Login to your account' : 'Create your account'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isLogin ? 'Enter your details to login.' : 'Enter your details to sign up.'}
                </p>
              </div>

              {/* Google Sign In */}
              <Button
                variant="outline"
                className="w-full border-gray-200 hover:bg-gray-50"
                type="button"
                onClick={() => toast.info('Google sign-in not configured yet')}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-muted-foreground">OR</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="hello@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="• • • • • • • • • •"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 border-gray-200 focus:border-primary"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="keep-logged"
                        checked={keepLoggedIn}
                        onCheckedChange={(checked) => setKeepLoggedIn(checked as boolean)}
                      />
                      <label
                        htmlFor="keep-logged"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Keep me logged in
                      </label>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                      onClick={() => toast.info('Password reset not implemented yet')}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
                </Button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 flex items-center justify-between text-xs text-muted-foreground">
            <div>© 2025 SiteIQ</div>
            <div>ENG</div>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50" />
          
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="40" fill="white" opacity="0.1" />
              <circle cx="300" cy="200" r="60" fill="white" opacity="0.08" />
              <circle cx="200" cy="300" r="30" fill="white" opacity="0.12" />
              <circle cx="350" cy="450" r="50" fill="white" opacity="0.09" />
              <circle cx="50" cy="400" r="35" fill="white" opacity="0.11" />
            </svg>
          </div>
          
          {/* Content */}
          <div className="relative z-10 w-full p-12 flex flex-col">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-8 h-8 bg-white rounded-lg" />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <h2 className="text-4xl font-bold text-white">SITEIQ</h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Site analysis has never been{' '}
                <span className="font-semibold text-white">easier.</span>
              </p>

              {/* 3D Shield/Crystal Graphics */}
              <div className="mt-16 relative">
                <div className="absolute inset-0 bg-gradient-radial from-white/20 via-white/10 to-transparent blur-2xl" />
                <svg
                  className="w-full h-80 opacity-80"
                  viewBox="0 0 400 320"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Main Shield/Crystal Shape */}
                  <path
                    d="M200 40 L280 100 L300 180 L280 240 L200 280 L120 240 L100 180 L120 100 Z"
                    stroke="white"
                    strokeWidth="2"
                    fill="url(#shield1)"
                    opacity="0.7"
                  />
                  <path
                    d="M200 60 L260 110 L275 160 L260 210 L200 250 L140 210 L125 160 L140 110 Z"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="url(#shield2)"
                    opacity="0.6"
                  />
                  <path
                    d="M200 80 L240 120 L250 160 L240 200 L200 220 L160 200 L150 160 L160 120 Z"
                    stroke="white"
                    strokeWidth="1"
                    fill="url(#shield3)"
                    opacity="0.5"
                  />
                  
                  {/* Glow effects */}
                  <circle cx="200" cy="160" r="15" fill="white" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                  
                  <defs>
                    <linearGradient id="shield1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
                      <stop offset="50%" stopColor="rgba(255, 255, 255, 0.2)" />
                      <stop offset="100%" stopColor="rgba(255, 255, 255, 0.1)" />
                    </linearGradient>
                    <linearGradient id="shield2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
                      <stop offset="50%" stopColor="rgba(255, 255, 255, 0.15)" />
                      <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
                    </linearGradient>
                    <linearGradient id="shield3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.2)" />
                      <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="grid grid-cols-2 gap-8 mt-auto">
              <div className="space-y-2">
                <h3 className="text-white font-semibold">Get Access</h3>
                <p className="text-sm text-white/80">
                  Sign up at{' '}
                  <a href="/" className="underline hover:text-white">
                    siteiq.app
                  </a>{' '}
                  to start using the app.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-semibold">Questions?</h3>
                <p className="text-sm text-white/80">
                  Reach us at{' '}
                  <a href="mailto:info@siteiq.app" className="underline hover:text-white">
                    info@siteiq.app
                  </a>{' '}
                  or call{' '}
                  <a href="tel:+1234567890" className="underline hover:text-white">
                    +1 234 567 890
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
