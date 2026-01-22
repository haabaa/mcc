import React from "react";

export function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      onLoggedIn();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">FX POS Login</h1>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <input className="w-full border rounded-xl p-3" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="w-full border rounded-xl p-3" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full rounded-xl p-3 bg-black text-white">Sign in</button>
      </form>
    </div>
  );
}
