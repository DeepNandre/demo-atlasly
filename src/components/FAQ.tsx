import { marketingContent } from "@/lib/content";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <section id="faq" className="py-20 px-6 bg-muted/30">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            {marketingContent.faq.title}
          </h2>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {marketingContent.faq.items.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-card rounded-lg border border-border/50 px-6"
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
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