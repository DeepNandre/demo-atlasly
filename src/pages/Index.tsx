import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Showcase from "@/components/Showcase";
import NewFeatures from "@/components/NewFeatures";
import APIShowcase from "@/components/APIShowcase";
import Differentiators from "@/components/Differentiators";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <NewFeatures />
      <Showcase />
      <APIShowcase />
      <Differentiators />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
