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

        {/* Main Brand Section - Big Text */}
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img 
                src={atlasLogo} 
                alt="Atlasly" 
                className="h-24 md:h-32 w-auto opacity-90" 
              />
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Atlasly
            </p>
          </div>
          
          {/* Giant Text */}
          <div className="mt-8">
            <h2 className="text-[12vw] md:text-[10vw] font-bold tracking-tight leading-none text-foreground/10 select-none">
              ATLASLY
            </h2>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
