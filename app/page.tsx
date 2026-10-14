import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ResultsTicker from "@/components/ResultsTicker";
import Stats from "@/components/Stats";
import GlobalReach from "@/components/GlobalReach";
import AboutSection from "@/components/AboutSection";
import ServicesGrid from "@/components/ServicesGrid";
import AcademicResults from "@/components/AcademicResults";
import Press from "@/components/Press";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/siteSeo";

// TKT-0285: facts that are already printed on the site (name, address, email, WhatsApp, social profiles) in a form search engines read.
const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "DivergenCIE Coaching",
  legalName: "DivergenCIE Educational Consultancy Pvt Ltd",
  url: SITE_URL,
  logo: `${SITE_URL}/assets/images/logo.jpg`,
  email: "team@divergencie.co.uk",
  telephone: "+91 96506 75507",
  sameAs: ["https://www.instagram.com/divergencie_coaching/", "https://www.linkedin.com/company/divergencie-coaching/"],
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden w-full">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }} />
      <Nav />
      <Hero />
      <ResultsTicker />
      <Stats />
      <GlobalReach />
      <AboutSection />
      <ServicesGrid />
      <AcademicResults />
      <Press />
      <Testimonials />
      <Footer />
    </main>
  );
}
