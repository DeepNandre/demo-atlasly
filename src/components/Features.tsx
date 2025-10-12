import { Check } from "lucide-react";
import { marketingContent } from "@/lib/content";

const Features = () => {
  return (
    <section id="problem" className="py-24 px-6 bg-background">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16 space-y-8">
          <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
            {marketingContent.problem.title}
          </h2>
          <div className="space-y-6 max-w-4xl mx-auto">
            {marketingContent.problem.content.map((paragraph, index) => (
              <p key={index} className="text-xl text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mt-16">
          {marketingContent.problem.bullets.map((bullet, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border/50 hover:border-[hsl(var(--mint))]/30 transition-all duration-300"
            >
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--mint))]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-[hsl(var(--mint))]" strokeWidth={2.5} />
              </div>
              <span className="text-foreground font-medium leading-relaxed text-lg">
                {bullet}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
