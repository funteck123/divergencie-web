import os
import re

nav_template = """<nav id="nav">
  <div class="nav-inner">
    <a href="{rel}index.html" class="nav-logo">
      <img src="{rel}assets/images/logo.jpg" alt="DivergenCIE logo icon"/>
      <span class="nav-logo-text">Divergen<span>CIE</span></span>
    </a>
    <div class="nav-links">
      <a href="{rel}about.html">About</a>
      <a href="{rel}index.html#results">Results</a>
      <a href="{rel}services.html">Services</a>
      <a href="{rel}pricing.html">Pricing</a>
      <a href="{rel}mock.html">Free Mock</a>
      <a href="{rel}careers.html">Careers</a>
      <a href="{rel}contact.html">Contact</a>
    </div>
    <div class="nav-right" style="display:flex;align-items:center;gap:0.75rem;">
      <button class="theme-toggle" aria-label="Toggle light/dark mode">
        <svg class="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg class="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
      <a href="{rel}auth/login.html" class="nav-cta" style="background:transparent;color:var(--text-primary);border-color:var(--border);">Sign In</a>
      <a href="{rel}contact.html" class="nav-cta nav-cta-desktop">Get Started</a>
      <button class="nav-hamburger" id="hamburger" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
  <div id="mobile-menu">
    <a href="{rel}about.html">About</a>
    <a href="{rel}index.html#results">Results</a>
    <a href="{rel}services.html">Services</a>
    <a href="{rel}pricing.html">Pricing</a>
    <a href="{rel}mock.html">Free Mock</a>
    <a href="{rel}careers.html">Careers</a>
    <a href="{rel}contact.html">Contact</a>
    <a href="{rel}auth/login.html" class="btn-ghost" style="margin-top:0.5rem;justify-content:center;">Sign In</a>
    <a href="{rel}contact.html" class="btn-gold" style="margin-top:0.5rem;justify-content:center;">Get Started</a>
  </div>
</nav>"""

def sync_file(filepath, rel_path):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_nav = nav_template.format(rel=rel_path)
    # Replace the entire <nav id="nav">...</nav> block
    pattern = re.compile(r'<nav id="nav">.*?</nav>', re.DOTALL)
    if pattern.search(content):
        new_content = pattern.sub(new_nav, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
    else:
        print(f"Could not find nav in {filepath}")

root_files = [
    'index.html', 'about.html', 'services.html', 'pricing.html', 
    'mock.html', 'careers.html', 'contact.html'
]

service_files = [
    'services/igcse.html', 'services/a-level.html', 'services/ap.html',
    'services/ib.html', 'services/sat-act.html', 'services/ielts-toefl.html'
]

for f in root_files:
    if os.path.exists(f):
        sync_file(f, '')

for f in service_files:
    if os.path.exists(f):
        sync_file(f, '../')
