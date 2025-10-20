import { Layers } from "lucide-react";
import atlasLogo from "@/assets/atlas-logo.png";

const Footer = () => {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={atlasLogo} alt="Atlasly" className="h-6 w-auto" />
            <span className="font-serif font-bold">Atlasly</span>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
              Legal
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
              Terms
            </a>
          </nav>
          
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Atlasly. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
