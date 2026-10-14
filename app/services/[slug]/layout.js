import { SERVICE_SLUGS } from "@/lib/siteSeo";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const s = SERVICE_SLUGS[slug];
  if (!s) return { title: "Services | DivergenCIE Coaching" };
  return { title: `${s.name} | DivergenCIE Coaching`, description: s.description, alternates: { canonical: `/services/${slug}` } };
}

export default function Layout({ children }) {
  return children;
}
