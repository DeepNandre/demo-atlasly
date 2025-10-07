import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            <span className="text-xl font-serif font-bold">Area</span>
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
          
          <Button variant="hero" size="default" onClick={() => window.location.href = '/generate'}>
            Generate Pack →
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
