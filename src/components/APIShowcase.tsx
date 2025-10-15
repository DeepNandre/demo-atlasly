import { Code, Zap, Shield, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const APIShowcase = () => {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Generate comprehensive site analysis in under 30 seconds via RESTful API"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade authentication with rate limiting and usage tracking"
    },
    {
      icon: Code,
      title: "Developer First",
      description: "Clean REST API with comprehensive docs, code examples, and SDKs"
    },
    {
      icon: TrendingUp,
      title: "Usage-Based Pricing",
      description: "Pay only for what you use. Scale from prototype to millions of requests"
    }
  ];

  const codeExample = `const response = await fetch(
  'https://api.siteiq.com/v1/analyze-site',
  {
    method: 'POST',
    headers: {
      'X-API-Key': 'sk_your_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 500
    })
  }
);

const { site_request_id } = await response.json();
// Returns: terrain, solar, climate, feasibility`;

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <Badge className="mb-4">Coming Soon</Badge>
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            API for Developers
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Integrate geospatial intelligence into your applications. Build the next generation 
            of construction tech, real estate platforms, and planning tools.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <pre className="text-sm overflow-x-auto">
                <code className="text-muted-foreground">{codeExample}</code>
              </pre>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => window.location.href = '/dashboard'}>
                Get API Access
              </Button>
              <Button variant="ghost" size="lg">
                View Documentation →
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="bg-muted/50 border border-border rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-serif font-bold mb-4">
            Become an Early Adopter
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join our API beta program and get free credits, priority support, and influence on our roadmap.
          </p>
          <Button size="lg" onClick={() => window.location.href = '/dashboard'}>
            Request API Access
          </Button>
        </div>
      </div>
    </section>
  );
};

export default APIShowcase;
