import { marketingContent } from "@/lib/content";
import { FileCheck, MapPin, Brain, TrendingUp } from "lucide-react";

const iconMap = {
  "Verified Exports": FileCheck,
  "True Terrain": MapPin,
  "Climate Intelligence": TrendingUp,
  "Grounded AI": Brain,
};

const Showcase = () => {
  return (
    <section id="value-pillars" className="py-24 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            {marketingContent.valuePillars.title}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {marketingContent.valuePillars.cards.map((card, index) => {
            const IconComponent = iconMap[card.title as keyof typeof iconMap];
            
            return (
              <div
                key={index}
                className="group bg-card rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-2 border border-border/50 hover:border-primary/30"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/15 transition-colors">
                  <IconComponent className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-serif font-bold mb-3">
                  {card.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Showcase;
