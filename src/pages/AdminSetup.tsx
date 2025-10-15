import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';

export default function AdminSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useAdminCheck();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyHasAdmin, setAlreadyHasAdmin] = useState(false);

  useEffect(() => {
    // Only Teams and Enterprise can become admin
    if (user && tier && tier !== 'teams' && tier !== 'enterprise') {
      toast.error('Admin features are only available on Teams and Enterprise plans');
      navigate('/pricing');
    }
  }, [user, tier, navigate]);

  const handleBecomeAdmin = async () => {
    if (!user) {
      toast.error('You must be logged in to become an admin');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('become_first_admin');

      if (error) {
        console.error('Error becoming admin:', error);
        toast.error('Failed to become admin');
        return;
      }

      if (data === true) {
        setSuccess(true);
        toast.success('You are now an admin! Redirecting to admin dashboard...');
        setTimeout(() => {
          navigate('/admin/metrics');
        }, 2000);
      } else {
        setAlreadyHasAdmin(true);
        toast.error('An admin already exists. Contact an existing admin to be promoted.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8 mt-16">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Admin Setup</CardTitle>
              <CardDescription>
                You must be logged in to set up an admin account
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8 mt-16">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>Become First Admin</CardTitle>
            <CardDescription>
              Claim admin privileges if no admin exists yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Success!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    You are now an admin. Redirecting...
                  </p>
                </div>
              </div>
            )}

            {alreadyHasAdmin && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">
                    Admin Already Exists
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-500">
                    An admin has already been set up for this system.
                  </p>
                </div>
              </div>
            )}

            {!success && !alreadyHasAdmin && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    This will make your account an administrator if no admin exists yet.
                  </p>
                  <p className="font-medium">
                    Current user: <span className="text-foreground">{user.email}</span>
                  </p>
                </div>

                <Button 
                  onClick={handleBecomeAdmin}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Become Admin
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  This action can only be performed once. The first user to click this button
                  will become the admin.
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
