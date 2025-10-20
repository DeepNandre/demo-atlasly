import atlasLogo from "@/assets/atlas-logo.png";

const Footer = () => {
  return (
    <footer className="relative py-20 px-6 border-t border-border bg-background overflow-hidden">
      <div className="container mx-auto">
        {/* Top Section - Info */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
          <div className="space-y-4 max-w-md">
            <h3 className="text-lg font-medium">Transform your site analysis</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Whether you are an architect, developer, or planner, Atlasly provides the tools and insights to understand terrain, climate, and solar potential—helping you make informed decisions for every project.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Connect</h4>
            <div className="space-y-2">
              <a href="mailto:hello@atlasly.com" className="block text-sm hover:text-primary transition-smooth">
                hello@atlasly.com
              </a>
              <nav className="flex flex-col gap-2">
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Privacy Policy
                </a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Terms of Service
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Section - Logo and Brand Name */}
        <div className="relative border-t border-border/50 pt-8">
          <div className="flex items-center justify-between">
            {/* Logo and Brand Name Side by Side */}
            <div className="flex items-center gap-6">
              <img 
                src={atlasLogo} 
                alt="Atlasly" 
                className="h-20 md:h-28 w-auto opacity-90" 
              />
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
                ATLASLY
              </h2>
            </div>
            
            {/* Copyright */}
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Atlasly
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
