"use client";

import { createOrbitClient, OrbitApiError } from "@orbit/api-client";
import type { AuthSessionDto, UserDto } from "@orbit/shared";
import { useMutation } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const accessTokenKey = "orbit_access_token";

type Mode = "login" | "register";
type AuthForm = {
  email: string;
  name: string;
  password: string;
};

const emptyForm: AuthForm = {
  email: "",
  name: "",
  password: "",
};

function errorMessage(error: unknown): string {
  if (error instanceof OrbitApiError) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<AuthForm>(emptyForm);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [user, setUser] = useState<UserDto | undefined>();
  const [bootMessage, setBootMessage] = useState("Checking your session...");

  const client = useMemo(
    () =>
      createOrbitClient({
        baseUrl: apiUrl,
        getAccessToken: () => accessToken ?? sessionStorage.getItem(accessTokenKey) ?? undefined,
        onAccessToken: (token) => {
          setAccessToken(token);
          if (token) {
            sessionStorage.setItem(accessTokenKey, token);
            return;
          }
          sessionStorage.removeItem(accessTokenKey);
        },
      }),
    [accessToken]
  );

  const refreshMutation = useMutation({
    mutationFn: () => client.refresh(),
    onSuccess: (session) => {
      setUser(session.user);
      setBootMessage("");
    },
    onError: () => {
      setBootMessage("");
      setAccessToken(undefined);
      sessionStorage.removeItem(accessTokenKey);
    },
  });

  const authMutation = useMutation({
    mutationFn: async () => {
      if (mode === "register") {
        return client.register(form);
      }

      return client.login({ email: form.email, password: form.password });
    },
    onSuccess: (session: AuthSessionDto) => {
      setUser(session.user);
      setForm(emptyForm);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => client.logout(),
    onSuccess: () => {
      setUser(undefined);
      setAccessToken(undefined);
      sessionStorage.removeItem(accessTokenKey);
    },
  });

  useEffect(() => {
    refreshMutation.mutate();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    authMutation.mutate();
  }

  if (user) {
    return (
      <main className="shell">
        <section className="auth-panel" aria-labelledby="dashboard-title">
          <p className="eyebrow">Orbit</p>
          <h1 id="dashboard-title">Welcome, {user.name}</h1>
          <p className="muted">{user.email}</p>
          <div className="status success">Signed in and connected to the API.</div>
          <button
            className="button secondary"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
            type="button"
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="eyebrow">Orbit</p>
        <h1 id="auth-title">{mode === "login" ? "Sign in" : "Create account"}</h1>
        <div className="segmented" role="tablist" aria-label="Authentication mode">
          <button
            aria-selected={mode === "login"}
            className="segment"
            onClick={() => setMode("login")}
            role="tab"
            type="button"
          >
            Login
          </button>
          <button
            aria-selected={mode === "register"}
            className="segment"
            onClick={() => setMode("register")}
            role="tab"
            type="button"
          >
            Register
          </button>
        </div>
        {bootMessage ? <div className="status neutral">{bootMessage}</div> : null}
        {authMutation.error ? (
          <div className="status danger">{errorMessage(authMutation.error)}</div>
        ) : null}
        <form className="form" onSubmit={submit}>
          {mode === "register" ? (
            <label className="field">
              <span>Name</span>
              <input
                autoComplete="name"
                minLength={1}
                maxLength={120}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                value={form.name}
              />
            </label>
          ) : null}
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              type="email"
              value={form.email}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              maxLength={72}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              type="password"
              value={form.password}
            />
          </label>
          <button className="button primary" disabled={authMutation.isPending} type="submit">
            {authMutation.isPending
              ? mode === "login"
                ? "Signing in..."
                : "Creating..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
