# Security & Authentication UX

Usability of secure flows. Context: custom Argon2 auth + Better Auth + Entra ID. Backed by NIST 800-63B r4, OWASP, WCAG 2.2.

## Password fields
- **Never block paste; never disable password managers** (fails WCAG 3.3.8 AA). No `onpaste="return false"`, no `autocomplete="off"`.
- **Autocomplete is mandatory and role-specific:** sign-in → `autocomplete="current-password"`; sign-up/change → `autocomplete="new-password"` (triggers strong-password generation); `email`/`username` accordingly. Give sign-in vs sign-up forms **different `id`/`name`**.
- **Show/hide toggle** with an accessible label (`aria-label="Mostrar contraseña"` ↔ `"Ocultar contraseña"`), `type="button"`, `aria-pressed` reflecting state.
- **Live requirement checklist** (`aria-live="polite"`), each rule with text + icon (not color alone); never hide requirements until after a failed submit.
- **Strength meter — run it server-side.** zxcvbn-style meters help, but shipping the blocklist/scoring to the client leaks it (2025 research). Show a coarse bar (débil/ok/fuerte) + actionable suggestion; don't expose which passwords are blocked.

## Password policy (NIST 800-63B r4)
- Min **8** (15 recommended when it's the sole factor); **accept ≥64 chars**, allow all Unicode + spaces (passphrases).
- **No mandatory composition rules** (forced upper/lower/digit/symbol weaken choices).
- **Screen against breached-password lists** at registration/change (k-anonymity range API or local list) in the server action; return a generic "esta contraseña apareció en una filtración, elige otra".
- **No forced periodic rotation** — only on evidence of compromise. State requirements up front.

## Login/signup errors (anti-enumeration)
- **Generic message for all auth failures:** "Correo o contraseña incorrectos" — same message whether the email is missing, password wrong, or account locked (OWASP). Keep **timing constant** (verify against a dummy Argon2 hash when the user is missing) to prevent timing enumeration.
- Signup/forgot-password: "Si el correo existe, enviamos instrucciones" — never "email not found". Better Auth does this by default — don't override with a leaky message.
- **Rate limiting / lockout:** count failures **per account** (not just per IP) + IP throttling; clear lockout messaging with a recovery path. next-safe-action → enforce via a rate-limit **middleware**.

## 2FA / MFA / OTP
- **OTP input:** single or segmented (shadcn `input-otp`) but must support **paste** (distributes across cells) and autofill.
- **`autocomplete="one-time-code"`** so mobile offers the SMS code; **auto-submit** on the last digit.
- **Resend with countdown** (disable button, ~60s) to avoid spam and give feedback.
- **Remember-device** option (Better Auth `trustDevice`) so users aren't re-challenged every login.
- **Recovery/backup codes:** show once at enrollment, force acknowledge/download, allow regeneration.
- **Passkeys/WebAuthn** — phishing-resistant; use Conditional UI (`autocomplete="username webauthn"` + `mediation: "conditional"`) to surface in autofill without a modal. Don't put `webauthn` on OTP fields (unreliable). Better Auth keeps `newSession = null` until 2FA verified — don't treat the pending state as authenticated.

## SSO / social / enterprise (Entra ID)
- **Clear branded provider buttons** ("Continuar con Microsoft") with the official logo, distinct from email/password.
- **Account linking by verified email** so password and Entra land on the same account; only auto-link on **trusted/verified** providers (Better Auth trust-inheritance concern).
- **Avoid "which login did I use":** badge the last-used method (non-sensitive cookie); if a user tries password on an SSO-only account, route them to the right provider instead of a generic error.

## Permissions & consent
- **Just-in-time, in context** — request a scope only when the feature needing it is used, not all upfront (NN/g; GDPR-friendly).
- **Explain the why** with a brief task-specific rationale *before* the system prompt.
- **Graceful denial** — keep the app usable, explain what won't work, offer a way to re-grant. For Entra/Graph, request incremental scopes as features are used.

## Session & security feedback
- **Timeout warning (WCAG 2.2.1):** show a modal before expiry ("Tu sesión expirará en 60 segundos") with an **Extend** action; **preserve user input** across re-auth (don't lose a half-filled form).
- **Logout confirmation on shared devices** + "cerrar sesión en todos los dispositivos".
- **Active sessions/devices UI** (device, location, last active) with per-session revoke (Better Auth `listSessions`/`revokeSession`/`revokeOtherSessions`).
- **Step-up re-authentication** for sensitive actions (change email, disable 2FA, delete account) — enforce via a next-safe-action middleware checking a recent-auth timestamp.

## Trust & phishing resistance
- **Don't train users to click email links for sensitive actions** — prefer in-app confirmation; where email is needed (verify/reset), use short-lived single-use tokens, state what the link does, show the real sender/domain.
- **Push toward phishing-resistant sign-in** (passkeys, Entra) — controls that work regardless of user vigilance beat "don't click" warnings.
- **Error messages must not leak internals** — no stack traces, no "user not found", no DB/library detail. Log specifics to Sentry, return a generic user-facing message.

## Destructive / irreversible actions
- **Type-to-confirm** (type the account name or `ELIMINAR`) for high-severity irreversible actions only.
- **Undo beats confirm where possible** — soft-delete + grace window + undo toast for reversible actions.
- **Separate destructive from benign buttons** (distance + label + icon, not color alone) — never "Eliminar" adjacent to "Guardar".

## Also worth doing
- **CAPTCHA:** prefer invisible/risk-based over image puzzles (puzzles can fail 3.3.8); escalate only after failed attempts.
- **Forgot-password:** generic response, single-use short-TTL token, invalidate on use, no password in email (OWASP cheat sheet).
- **Notify the OLD email** on email change (takeover early warning); send "new sign-in" alerts for anomalous logins.
- **Autofill styling:** `:-webkit-autofill` can break dark-mode contrast — verify WCAG on autofilled fields.
- **Prefill/keep a hidden `autocomplete="username"`** on 2FA/step-up screens so managers save the right pair.
- **CSRF/SameSite** on custom-auth cookies — affects silent session failures users can't diagnose.

## Sources
- NIST SP 800-63B r4 — https://pages.nist.gov/800-63-4/sp800-63b.html
- OWASP Authentication Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- WCAG 3.3.8 Accessible Authentication — https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum
- web.dev sign-in form best practices — https://web.dev/articles/sign-in-form-best-practices
- web.dev passkey form autofill — https://web.dev/articles/passkey-form-autofill
- NN/g permission requests — https://www.nngroup.com/articles/permission-requests/
- Better Auth 2FA — https://better-auth.com/docs/plugins/2fa
