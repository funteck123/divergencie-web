# Auth.js / NextAuth CLI Login Guide

## 🔗 CSRF Chain Login Process

To authenticate via `curl` against the DivergenCIE portal, follow this multi-step stateful handshake:

1. **Fetch CSRF Token & Initialize Cookies**
   Request a valid CSRF token and save the session cookie to a "cookie jar" file.
   ```bash
   curl -c cookies.txt http://localhost:3000/api/auth/csrf
   ```

2. **Extract the Token**
   Extract the `csrfToken` value from the JSON response.

3. **Execute Login POST**
   Send credentials along with the captured token and the stored cookies.
   ```bash
   curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials \
     -d "email=management@divergencie.com&password=demo&csrfToken=YOUR_TOKEN_HERE&redirect=false"
   ```

## 🧠 Why this works (The Theory)

1. **Security Handshake**: Auth.js requires a CSRF token to prevent cross-site request forgery attacks on login.
2. **Cookie Persistence**: The first request fetches the `authjs.csrf-token` cookie. The `-c` flag ensures this is saved locally.
3. **Stateful Session**: The second request uses `-b` to load the saved cookie and `-c` to save the resulting session cookie after a successful login.
4. **JSON Response**: Including `redirect=false` in the payload ensures the server returns a JSON status instead of a browser-level 302 redirect, making it CLI-friendly.
5. **Browser Mimicry**: This chained sequence mimics a browser's stateful behavior, which is mandatory for NextAuth's security model.
