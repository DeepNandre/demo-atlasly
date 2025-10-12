import { Button } from "@/components/ui/button";
import { marketingContent } from "@/lib/content";

const WhyChoose = () => {
  return (
    <section className="py-24 px-6 bg-muted/20">
      <div className="container mx-auto max-w-5xl text-center">
        <div className="space-y-10">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            {marketingContent.socialProof.title}
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {marketingContent.socialProof.subtitle}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 py-8">
            {marketingContent.socialProof.badges.map((badge, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 bg-[hsl(var(--mint))]/10 text-[hsl(var(--mint))] px-5 py-3 rounded-full text-base font-semibold border border-[hsl(var(--mint))]/20"
              >
                <span className="w-2 h-2 bg-[hsl(var(--mint))] rounded-full animate-pulse" />
                {badge}
              </div>
            ))}
          </div>
          
          <Button 
            variant="hero" 
            size="xl"
            className="rounded-lg text-lg px-8 py-6"
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
