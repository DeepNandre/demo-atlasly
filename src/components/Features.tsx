import { Check } from "lucide-react";
import { marketingContent } from "@/lib/content";

const Features = () => {
  return (
    <section id="problem" className="py-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12 space-y-6">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            {marketingContent.problem.title}
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {marketingContent.problem.content.map((paragraph, index) => (
              <p key={index} className="text-lg text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {marketingContent.problem.bullets.map((bullet, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50"
            >
              <div className="w-5 h-5 rounded-full bg-mint/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-mint" strokeWidth={2.5} />
              </div>
              <span className="text-foreground font-medium leading-relaxed">
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
