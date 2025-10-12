import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <section id="contact" className="py-24 px-6 bg-primary text-primary-foreground">
      <div className="container mx-auto text-center space-y-10">
        <h2 className="text-5xl md:text-7xl font-serif font-bold">
          Connect with us
        </h2>
        <p className="text-xl opacity-90 max-w-3xl mx-auto leading-relaxed">
          Ready to transform your architectural workflow? Start generating 
          professional site packs in minutes, not hours.
        </p>
        <Button 
          variant="secondary" 
          size="xl"
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-8 py-6 rounded-lg"
          onClick={() => window.location.href = '/generate'}
        >
          Get Started Now →
        </Button>
      </div>
    </section>
  );
};

export default Contact;
