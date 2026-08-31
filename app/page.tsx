import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ResultsTicker from "@/components/ResultsTicker";
import Stats from "@/components/Stats";
import GlobalReach from "@/components/GlobalReach";
import AboutSection from "@/components/AboutSection";
import ServicesGrid from "@/components/ServicesGrid";
import AcademicResults from "@/components/AcademicResults";
import Partners from "@/components/Partners";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden w-full">
      <Nav />
      <Hero />
      <ResultsTicker />
      <Stats />
      <GlobalReach />
      <AboutSection />
      <ServicesGrid />
      <AcademicResults />
      <Partners />
      {/* TKT-0179: Press hidden -- its logos (Guardian Education, BBC
          Learning, etc.) are fabricated, no real coverage exists yet.
          Component kept intact for when there's real press to list. */}
      <Testimonials />
      <Footer />
    </main>
  );
}
