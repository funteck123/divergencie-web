import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ResultsTicker from "@/components/ResultsTicker";
import Stats from "@/components/Stats";
import GlobalReach from "@/components/GlobalReach";
import AboutSection from "@/components/AboutSection";
import ServicesGrid from "@/components/ServicesGrid";
import AcademicResults from "@/components/AcademicResults";
import Partners from "@/components/Partners";
import Press from "@/components/Press";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <ResultsTicker />
      <Stats />
      <GlobalReach />
      <AboutSection />
      <ServicesGrid />
      <AcademicResults />
      <Partners />
      <Press />
      <Testimonials />
      <Footer />
    </main>
  );
}
