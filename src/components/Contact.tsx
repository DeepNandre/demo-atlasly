import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <section id="contact" className="py-32 px-6 bg-primary text-primary-foreground">
      <div className="container mx-auto text-center space-y-12">
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight">
          Ready to transform your workflow?
        </h2>
        <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto font-light leading-relaxed">
          Start generating professional site analysis in seconds, not weeks.
        </p>
        <Button 
          variant="secondary" 
          size="xl"
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-12 py-7 rounded-lg"
          onClick={() => window.location.href = '/generate'}
        >
          Start Free Analysis
        </Button>
      </div>
    </section>
  );
};

export default Contact;
