import { marketingContent } from "@/lib/content";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <section id="faq" className="py-32 px-6 bg-background">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-20 space-y-6">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            {marketingContent.faq.title}
          </h2>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {marketingContent.faq.items.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-card border border-border/50 px-8 py-2 rounded-lg hover:border-primary/30 transition-colors"
            >
              <AccordionTrigger className="text-left font-serif font-semibold text-lg hover:no-underline py-6">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-light leading-relaxed text-base pb-6">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;