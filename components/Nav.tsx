"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Menu, X } from "lucide-react";

export default function Nav() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggle } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  const navLinks = [
    { name: "ABOUT", href: "/about" },
    { name: "RESULTS", href: "/#results" },
    { name: "SERVICES", href: "/services" },
    { name: "PRICING", href: "/pricing" },
    { name: "FREE MOCK", href: "/mock" },
    { name: "CAREERS", href: "/careers" },
    { name: "CONTACT", href: "/contact" },
  ];

  return (
    <nav className={`fixed top-0 z-50 w-full h-20 transition-colors duration-300 ${
      isScrolled 
        ? "border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/60 backdrop-blur-md" 
        : "bg-transparent"
    }`}>
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group -translate-y-[1px] -translate-x-2">
          <Image src="/assets/images/logo.jpg" alt="DivergenCIE logo icon" width={40} height={40} className="h-8 w-8 rounded-sm object-cover"
          />
          <span className={`text-xl font-black transition-colors ${
            isScrolled ? "text-[var(--navy)] dark:text-white" : "text-white"
          }`}>
            Divergen<span className="text-[var(--gold)]">CIE</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex md:items-center md:gap-8 -translate-y-[1px]">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-xs font-black tracking-widest transition-colors ${
                isScrolled ? "text-[var(--text-muted)] hover:text-[var(--navy)]" : "text-white/80 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Desktop Right */}
        <div className="hidden md:flex md:items-center md:gap-4 translate-x-4">
          <button
            onClick={toggle}
            className={`p-2 rounded-full transition-colors ${
              isScrolled ? "hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]" : "hover:bg-white/10 text-white"
            }`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <Link
            href="/login"
            className={`text-xs font-black tracking-widest transition-opacity ${
              isScrolled ? "text-[var(--navy)]" : "text-white"
            } hover:opacity-80`}
          >
            PORTAL LOGIN
          </Link>
          
          <Link
            href="/contact"
            className="rounded-none bg-[var(--gold)] px-6 py-2.5 text-xs font-black text-white tracking-widest shadow-lg shadow-[var(--gold)]/20 hover:brightness-110 active:scale-95 transition-all"
          >
            GET STARTED
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-4 md:hidden">
          <button
            onClick={toggle}
            className={`p-2 rounded-full transition-colors ${
              isScrolled ? "hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]" : "hover:bg-white/10 text-white"
            }`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 transition-colors ${
              isScrolled ? "text-[var(--navy)] dark:text-white" : "text-white"
            }`}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu — absolute overlay so it doesn't push page content */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-20 z-40 bg-black/40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute top-full left-0 right-0 z-50 md:hidden max-h-[80vh] overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-6 space-y-4 animate-in slide-in-from-top duration-300 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-lg font-semibold text-[var(--text-primary)]"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="w-full text-center py-3 rounded-xl border border-[var(--border-subtle)] font-semibold text-[var(--text-primary)]"
              >
                Portal Login
              </Link>
              <Link
                href="/contact"
                onClick={() => setIsOpen(false)}
                className="w-full text-center py-3 rounded-xl bg-[var(--gold)] font-bold text-white shadow-lg"
              >
                Get Started
              </Link>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
