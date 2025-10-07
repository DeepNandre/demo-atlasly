import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Showcase from "@/components/Showcase";
import WhyChoose from "@/components/WhyChoose";
import Process from "@/components/Process";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Showcase />
      <WhyChoose />
      <Process />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
