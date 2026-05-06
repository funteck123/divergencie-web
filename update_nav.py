import os
import re

index_path = 'index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    index_content = f.read()

nav_links_match = re.search(r'<div class="nav-links">.*?</div>', index_content, re.DOTALL)
mobile_menu_match = re.search(r'<div id="mobile-menu">.*?</div>', index_content, re.DOTALL)

nav_links_html = nav_links_match.group(0)
mobile_menu_html = mobile_menu_match.group(0)

nav_links_html_other = nav_links_html.replace('href="#results"', 'href="index.html#results"')
mobile_menu_html_other = mobile_menu_html.replace('href="#results"', 'href="index.html#results"')
mobile_menu_html_other = mobile_menu_html_other.replace('href="contact.html" class="btn-gold"', 'href="contact.html" style="margin-top:0.5rem;padding:0.75rem 1.25rem;background:var(--gold);color:#0a0a0a;font-weight:700;font-size:0.8rem;letter-spacing:0.07em;text-transform:uppercase;text-align:center;"')


def update_file(filepath):
    if 'index.html' in filepath or 'portal' in filepath or 'auth' in filepath:
        return
    if not filepath.endswith('.html'):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '<div class="nav-links">' not in content:
        return

    # To preserve active states (style="color:var(--gold);"), we might lose them if we just replace. 
    # But it's easier to just replace and then inject the active state based on filename.
    filename = os.path.basename(filepath)
    
    new_nav = nav_links_html_other
    new_mob = mobile_menu_html_other
    
    if filename == 'about.html':
        new_nav = new_nav.replace('href="about.html"', 'href="about.html" style="color:var(--gold);"')
    elif filename == 'services.html' or 'services' in filepath:
        new_nav = new_nav.replace('href="services.html"', 'href="services.html" style="color:var(--gold);"')
    elif filename == 'pricing.html':
        new_nav = new_nav.replace('href="pricing.html"', 'href="pricing.html" style="color:var(--gold);"')
    elif filename == 'mock.html':
        new_nav = new_nav.replace('href="mock.html"', 'href="mock.html" style="color:var(--gold);"')
    elif filename == 'contact.html':
        new_nav = new_nav.replace('href="contact.html"', 'href="contact.html" style="color:var(--gold);"')
    elif filename == 'careers.html':
        new_nav = new_nav.replace('href="careers.html"', 'href="careers.html" style="color:var(--gold);"')

    # Replace nav-links
    content = re.sub(r'<div class="nav-links">.*?</div>', new_nav, content, flags=re.DOTALL)
    # Replace mobile-menu
    content = re.sub(r'<div id="mobile-menu">.*?</div>', new_mob, content, flags=re.DOTALL)
    
    # Let's also make sure we use the correct relative paths if in services folder.
    if 'services\\' in filepath or 'services/' in filepath:
        new_nav_sub = new_nav.replace('href="', 'href="../').replace('href="../http', 'href="http')
        new_mob_sub = new_mob.replace('href="', 'href="../').replace('href="../http', 'href="http')
        # fix the index.html#results back
        new_nav_sub = new_nav_sub.replace('href="../#results"', 'href="../index.html#results"')
        new_mob_sub = new_mob_sub.replace('href="../#results"', 'href="../index.html#results"')
        
        # fix active state
        new_nav_sub = new_nav_sub.replace('href="../services.html"', 'href="../services.html" style="color:var(--gold);"')

        content = re.sub(r'<div class="nav-links">.*?</div>', new_nav_sub, content, flags=re.DOTALL)
        content = re.sub(r'<div id="mobile-menu">.*?</div>', new_mob_sub, content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

for root, dirs, files in os.walk('.'):
    for f in files:
        update_file(os.path.join(root, f))

