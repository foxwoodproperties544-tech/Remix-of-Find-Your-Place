import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { SupportBanner } from "@/components/site/SupportBanner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Foxwood Properties" }] }),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [refCode, setRefCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    // Capture ?ref= from URL, persist for later
    const params = new URLSearchParams(window.location.search);
    const r = params.get("ref");
    if (r) {
      const clean = r.trim().toUpperCase().slice(0, 12);
      setRefCode(clean);
      try { localStorage.setItem("foxwood_ref", clean); } catch {}
      setMode("signup");
    } else {
      try {
        const stored = localStorage.getItem("foxwood_ref");
        if (stored) setRefCode(stored);
      } catch {}
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Attribute referrer if we still have one stashed
        try {
          const stored = localStorage.getItem("foxwood_ref");
          if (stored) {
            await supabase.rpc("claim_referral" as any, { _code: stored });
            localStorage.removeItem("foxwood_ref");
          }
        } catch {}
        navigate({ to: "/dashboard" });
      }
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, referred_by_code: refCode || undefined },
          },
        });
        if (error) throw error;
        try { localStorage.removeItem("foxwood_ref"); } catch {}
        toast.success("Account created! You are signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Attempt post-hoc referral attribution
        try {
          const stored = localStorage.getItem("foxwood_ref");
          if (stored) {
            await supabase.rpc("claim_referral" as any, { _code: stored });
            localStorage.removeItem("foxwood_ref");
          }
        } catch {}
        toast.success("Welcome back!");
      }
      router.invalidate();
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error(result.error.message ?? "Google sign-in failed");
    if (result.redirected) return;
    router.invalidate();
    navigate({ to: "/dashboard" });
  }


  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-center">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "Sign in to save favorites & list properties." : "Join Foxwood to list properties & save favorites."}
      </p>

      <button onClick={google} className="mt-6 w-full btn-ghost !py-3 flex items-center justify-center gap-2">
        <svg className="h-5 w-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.4 5.9 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.4 5.9 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.3C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.1-11.3-7.4l-6.6 5.1C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.4 4.4-4.5 5.8l6.5 5.3C41.8 35.7 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Full name"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email"
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password (min 6 chars)"
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
        <button disabled={loading} className="w-full btn-primary btn-primary-hover !py-3">
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New to Foxwood?" : "Already have an account?"}{" "}
        <button className="text-primary font-semibold" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
      <div className="mt-6">
        <SupportBanner
          context="auth"
          message={mode === "signin" ? "Trouble signing in?" : "Need help signing up?"}
          whatsappMessage={`Hello Foxwood Properties, I need help ${mode === "signin" ? "signing in" : "creating an account"}.`}
        />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/">← Back to home</Link>
      </p>
    </div>
  );
}
