"use client";

import { ArrowRight, Eye, EyeOff, Layers3, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/error-message";
import { getCurrentUser, registerAccount, signIn } from "@/lib/teamflow/auth";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void getCurrentUser()
      .then(() => {
        if (!cancelled) router.replace("/dashboard");
      })
      .catch((reason: unknown) => {
        if (
          !cancelled &&
          !(reason instanceof ApiError && reason.status === 401)
        ) {
          setError(errorMessage(reason));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      if (mode === "register") {
        await registerAccount(name, email, password);
      }
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="TeamFlow workspace">
        <Link className="brand brand-light" href="/" aria-label="TeamFlow home">
          <span className="brand-mark">
            <Layers3 size={19} strokeWidth={2.2} />
          </span>
          <span>teamflow</span>
        </Link>
        <div className="story-copy">
          <p className="eyebrow eyebrow-light">
            A better place to build together
          </p>
          <h1>Good teams make room for good work.</h1>
          <p className="story-description">
            Keep your people, permissions, and shared workspaces in clear view.
          </p>
        </div>
        <div className="story-footer">
          <span className="story-dot" />
          <span>Teamwork, with fewer loose ends.</span>
        </div>
        <div className="story-graphic" aria-hidden="true">
          <div className="graphic-sun" />
          <div className="graphic-line graphic-line-one" />
          <div className="graphic-line graphic-line-two" />
          <div className="graphic-orbit graphic-orbit-one" />
          <div className="graphic-orbit graphic-orbit-two" />
          <span className="graphic-label">TF / 01</span>
        </div>
      </section>

      <section className="auth-side">
        <div className="auth-mobile-brand">
          <Link className="brand" href="/" aria-label="TeamFlow home">
            <span className="brand-mark">
              <Layers3 size={19} strokeWidth={2.2} />
            </span>
            <span>teamflow</span>
          </Link>
        </div>
        <div className="auth-form-wrap">
          <p className="eyebrow">YOUR TEAM, IN SYNC</p>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="auth-intro">
            {mode === "login"
              ? "Sign in to pick up where your team left off."
              : "Start by creating your personal TeamFlow account."}
          </p>

          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <label className="field-label">
                Your name
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
            )}
            <label className="field-label">
              Work email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <div className="field-label password-field">
              <label htmlFor="auth-password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeOff size={17} aria-hidden="true" />
                  ) : (
                    <Eye size={17} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-primary auth-submit"
              disabled={pending}
            >
              {pending && <LoaderCircle className="spin" size={17} />}
              {pending
                ? mode === "login"
                  ? "Signing in"
                  : "Creating account"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              {!pending && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="auth-switch">
            {mode === "login" ? "New to TeamFlow?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
        <p className="auth-legal">A clear home for the work you do together.</p>
      </section>
    </main>
  );
}
