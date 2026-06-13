import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button, Field, Input } from "../components/ui";

export function LoginPage() {
  const { user, isAdmin, loading, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && isAdmin) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to sign in. Please try again.";
      // Normalise Firebase auth error codes to friendly text.
      if (/auth\/(invalid-credential|wrong-password|user-not-found|invalid-email)/.test(message)) {
        setError("Incorrect email or password.");
      } else if (/too-many-requests/.test(message)) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (/not authorized/i.test(message)) {
        setError(message);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-gold)] text-xl font-bold text-white">
            FF
          </div>
          <h1 className="font-display text-3xl font-semibold">Food Fort Admin</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
            <ShieldCheck className="h-4 w-4" />
            Admin access only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@foodfort.com.au"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-[var(--color-danger)]/15 px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
          Need access? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
