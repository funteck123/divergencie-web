// "use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, Link as LinkIcon, Send, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  //"use cache";
  const currentYear = 2026; // new Date().getFullYear();

  return (
    <footer className="bg-[var(--navy)] text-white pt-24 pb-12 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--gold)] opacity-5 rounded-full blur-[120px] -mr-64 -mb-64"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          {/* Brand Col */}
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/assets/images/logo.jpg" alt="DivergenCIE logo icon" width={40} height={40} className="h-10 w-10 rounded-sm object-cover"
              />
              <span className="text-2xl font-black text-white">
                Divergen<span className="text-[var(--gold)]">CIE</span>
              </span>
            </Link>
            <p className="text-white font-medium leading-relaxed max-w-xs">
              World-class coaching for Cambridge, AP, IB, and SAT. Led by World Toppers and examiners.
            </p>
            <div className="flex gap-4">
              <Link href="https://www.instagram.com/divergencie_coaching/" className="w-12 h-12 rounded-none bg-white/5 flex items-center justify-center hover:bg-[var(--gold)] hover:scale-110 transition-all">
                <Camera size={20} />
              </Link>
              <Link href="https://www.linkedin.com/company/divergencie-coaching/" className="w-12 h-12 rounded-none bg-white/5 flex items-center justify-center hover:bg-[var(--gold)] hover:scale-110 transition-all">
                <LinkIcon size={20} />
              </Link>
            </div>
          </div>

          {/* Links Col 1 */}
          <div>
            <h4 className="text-lg font-black uppercase tracking-widest mb-8 text-[var(--gold)]">Institution</h4>
            <ul className="space-y-4">
              {["About", "Results", "Services", "Pricing", "Careers"].map((link) => (
                <li key={link}>
                  <Link href={`/${link.toLowerCase()}`} className="text-white font-bold hover:text-[var(--gold)] transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Col 2 */}
          <div>
            <h4 className="text-lg font-black uppercase tracking-widest mb-8 text-[var(--gold)]">Support</h4>
            <ul className="space-y-4">
              {["Contact", "Free Mock", "Portal Login", "Privacy Policy", "Terms of Service"].map((link) => (
                <li key={link}>
                  <Link href={link === "Portal Login" ? "/auth/login" : `/${link.toLowerCase().replace(/ /g, '-')}`} className="text-white font-bold hover:text-[var(--gold)] transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-lg font-black uppercase tracking-widest mb-8 text-[var(--gold)]">Get in Touch</h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-none bg-white/5 flex items-center justify-center group-hover:bg-[var(--gold)] transition-colors">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Email us</p>
                  <p className="font-bold">team@divergencie.co.uk</p>
                </div>
              </li>
              <li className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-none bg-white/5 flex items-center justify-center group-hover:bg-[var(--gold)] transition-colors">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">WhatsApp</p>
                  <p className="font-bold">+91 96506 75507</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-white font-bold text-sm">
            © {currentYear} DivergenCIE Educational Consultancy Pvt Ltd. All rights reserved.
          </p>
          <div className="flex gap-8">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/40">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              System Online
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-white/40">
              Built with Next.js 15
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
