import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Showcase from "@/components/Showcase";
import Process from "@/components/Process";
import Differentiators from "@/components/Differentiators";
import WhyChoose from "@/components/WhyChoose";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Showcase />
      <Process />
      <Differentiators />
      <WhyChoose />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
