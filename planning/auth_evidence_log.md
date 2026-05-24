# 📋 DivergenCIE — Authentication Evidence Log

This document provides a step-by-step console log of a successful login and logout sequence using `curl` against the DivergenCIE Auth.js (NextAuth v5) implementation.

---

## 🔐 Phase 1: Authentication (Login)

### Step 1: CSRF Handshake
Initialize the cookie jar and fetch a valid CSRF token.

**Command:**
```bash
curl -s -c cookies.txt http://localhost:3000/api/auth/csrf && cat cookies.txt
```

**Evidence:**
```json
{"csrfToken":"b2bf38b783de4e87a3e5149016daf9a5f7d55ac31d5aca2301b0e0a594a84a17"}
```
```text
# Netscape HTTP Cookie File
#HttpOnly_localhost     FALSE   /       FALSE   0       authjs.callback-url     http%3A%2F%2Flocalhost%3A3000
#HttpOnly_localhost     FALSE   /       FALSE   0       authjs.csrf-token       b2bf38b783de4e87a3e5149016daf9a5f7d55ac31d5aca2301b0e0a594a84a17%7C83d155fa76eec9ef2f0eabc5c6217ecb2e5222f3af38a8aed2cd95e37174fb45
```

### Step 2: Credentials POST
Submit email, password, and the CSRF token to the credentials callback.

**Command:**
```bash
curl -v -b cookies.txt -c cookies.txt -X POST \
  http://localhost:3000/api/auth/callback/credentials \
  -d "email=management@divergencie.com&password=demo&csrfToken=b2bf38b783de4e87a3e5149016daf9a5f7d55ac31d5aca2301b0e0a594a84a17&redirect=false"
```

**Evidence:**
```text
> POST /api/auth/callback/credentials HTTP/1.1
< HTTP/1.1 302 Found
< location: http://localhost:3000
< set-cookie: authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiT295cnRxN052WVJYSlhCQzNEcUp3Rl9UM0R2ZXpMenQxcVdRVzFHc1pHMkNpdF9MN0ZwWTY1UnFiVWJOUkRCYUtscWxwX2tGTzVhX3ljM1ZrREpDOXcifQ...; Path=/; Expires=Tue, 09 Jun 2026 14:09:31 GMT; HttpOnly; SameSite=Lax
```

---

## ✅ Phase 2: Session Verification

### Step 3: Access Protected Route
Verify that the `authjs.session-token` allows access to the management portal.

**Command:**
```bash
curl -I -b cookies.txt http://localhost:3000/portal/management
```

**Evidence:**
```text
HTTP/1.1 200 OK
```

---

## 🚪 Phase 3: De-authentication (Logout)

### Step 4: Signout POST
Terminate the session using the CSRF-protected signout endpoint.

**Command:**
```bash
curl -v -b cookies.txt -c cookies.txt -X POST \
  http://localhost:3000/api/auth/signout \
  -d "csrfToken=b2bf38b783de4e87a3e5149016daf9a5f7d55ac31d5aca2301b0e0a594a84a17&redirect=false"
```

**Evidence:**
```text
> POST /api/auth/signout HTTP/1.1
< HTTP/1.1 302 Found
< set-cookie: authjs.session-token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
```

### Step 5: Verify Cleanup
Check the cookie jar to ensure the session token has been cleared.

**Command:**
```bash
cat cookies.txt
```

**Evidence:**
```text
# Netscape HTTP Cookie File
# (authjs.session-token is missing)
#HttpOnly_localhost     FALSE   /       FALSE   0       authjs.csrf-token       b2bf38b783de4e87a3e5149016daf9a5f7d55ac31d5aca2301b0e0a594a84a17%7C83d155fa76eec9ef2f0eabc5c6217ecb2e5222f3af38a8aed2cd95e37174fb45
```
