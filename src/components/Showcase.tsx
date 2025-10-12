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
    <section id="value-pillars" className="py-20 px-6 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            {marketingContent.valuePillars.title}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {marketingContent.valuePillars.cards.map((card, index) => {
            const IconComponent = iconMap[card.title as keyof typeof iconMap];
            
            return (
              <div
                key={index}
                className="group bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/20"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <IconComponent className="w-6 h-6 text-primary group-hover:translate-y-[-2px] transition-transform" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-serif font-semibold mb-3">
                  {card.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
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
