import { Button } from "@/components/ui/button";
import { marketingContent } from "@/lib/content";

const WhyChoose = () => {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="space-y-8">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            {marketingContent.socialProof.title}
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {marketingContent.socialProof.subtitle}
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 py-8">
            {marketingContent.socialProof.badges.map((badge, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium"
              >
                <span className="w-2 h-2 bg-mint rounded-full" />
                {badge}
              </div>
            ))}
          </div>
          
          <Button 
            variant="hero" 
            size="xl"
            className="rounded-lg"
            onClick={() => window.location.href = '/generate'}
          >
            {marketingContent.socialProof.cta}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
