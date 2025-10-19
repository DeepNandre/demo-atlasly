import { Code2, Rocket, Workflow, ArrowRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const APIShowcase = () => {
  const [copied, setCopied] = useState(false);
  
  const features = [
    {
      icon: Code2,
      title: "RESTful API",
      description: "Simple HTTP requests return JSON. Authentication via API keys."
    },
    {
      icon: Workflow,
      title: "Webhook Ready",
      description: "Get notified when analysis completes. Perfect for async workflows."
    },
    {
      icon: Rocket,
      title: "Enterprise Scale",
      description: "Usage-based pricing. Dedicated support and custom SLAs available."
    }
  ];

  const codeExample = `curl -X POST https://api.atlasly.com/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "include": ["terrain", "solar", "climate"]
  }'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="api" className="py-24 px-6 bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-1.5 bg-primary-foreground/10 rounded-full border border-primary-foreground/20">
                <span className="text-sm font-medium">Now Available</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
                API Platform for Developers
              </h2>
              <p className="text-xl opacity-90 leading-relaxed">
                Integrate geospatial intelligence directly into your construction tech platform or workflow automation.
              </p>
            </div>
            
            <div className="space-y-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                        <Icon className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-semibold mb-1">
                        {feature.title}
                      </h3>
                      <p className="opacity-90 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Button 
              variant="secondary" 
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => window.location.href = '/dashboard'}
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          
          {/* Bento Box Style Code Card */}
          <div className="relative">
            <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-3xl p-8 border border-primary-foreground/20 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-foreground/30" />
                  <div className="w-3 h-3 rounded-full bg-primary-foreground/30" />
                  <div className="w-3 h-3 rounded-full bg-primary-foreground/30" />
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-lg transition-colors border border-primary-foreground/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-sm">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-sm font-mono overflow-x-auto">
                <code className="text-primary-foreground/90 whitespace-pre">
                  {codeExample}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default APIShowcase;
