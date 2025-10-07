import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <section id="contact" className="py-20 px-6 bg-primary text-primary-foreground">
      <div className="container mx-auto text-center space-y-8">
        <h2 className="text-5xl md:text-6xl font-serif font-bold">
          Connect with us
        </h2>
        <p className="text-lg opacity-90 max-w-2xl mx-auto">
          Ready to transform your architectural workflow? Start generating 
          professional site packs in minutes, not hours.
        </p>
        <Button 
          variant="secondary" 
          size="xl"
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          Get Started Now →
        </Button>
      </div>
    </section>
  );
};

export default Contact;
