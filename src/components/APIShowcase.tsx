import { Code2, Rocket, Workflow, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const APIShowcase = () => {
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

  const codeExample = `curl -X POST https://api.siteiq.com/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "include": ["terrain", "solar", "climate"]
  }'`;

  return (
    <section id="api" className="py-32 px-6 bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="inline-block px-4 py-1.5 bg-primary-foreground/10 rounded-full">
                <span className="text-sm font-medium">Coming Soon</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
                API Platform for Developers
              </h2>
              <p className="text-xl opacity-90 font-light leading-relaxed">
                Integrate geospatial intelligence directly into your construction tech platform or workflow automation.
              </p>
            </div>
            
            <div className="space-y-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                        <Icon className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-semibold mb-2">
                        {feature.title}
                      </h3>
                      <p className="opacity-90 font-light">
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
              Join API Waitlist
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          
          <div className="lg:order-first">
            <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-8 border border-primary-foreground/10">
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
