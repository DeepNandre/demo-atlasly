import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layers, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { canAccessAdmin, tier } = useAdminCheck();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            <span className="text-xl font-serif font-bold">SiteIQ</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#benefits" className="text-sm text-foreground hover:text-primary transition-smooth">
              Benefits
            </a>
            <a href="#specifications" className="text-sm text-foreground hover:text-primary transition-smooth">
              Specifications
            </a>
            <a href="#how-to" className="text-sm text-foreground hover:text-primary transition-smooth">
              How-to
            </a>
            <a href="#contact" className="text-sm text-foreground hover:text-primary transition-smooth">
              Contact Us
            </a>
          </nav>
          
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button variant="outline" size="default" onClick={() => navigate('/ai')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  SiteIQ AI
                </Button>
                <Button variant="outline" size="default" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                {canAccessAdmin ? (
                  <Button variant="outline" size="default" onClick={() => navigate('/admin/metrics')}>
                    Admin Metrics
                  </Button>
                ) : (tier === 'free' || tier === 'pro') && (
                  <Button variant="outline" size="default" onClick={() => navigate('/pricing')}>
                    Upgrade
                  </Button>
                )}
                <Button variant="ghost" size="default" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="default" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                <Button variant="outline" size="default" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button variant="hero" size="default" onClick={() => navigate('/generate')}>
                  Generate Pack →
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
