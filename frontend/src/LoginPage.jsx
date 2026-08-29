import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    console.log("Logged in user:", data.user);
    console.log("Session:", data.session);

    // TODO: once profiles table is ready, look up role here and redirect:
    // const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    // then redirect based on profile.role → /farmer, /staff, /admin

    // Temporary stub for now, so you can keep building redirect logic:
    const fakeRole = "farmer"; // hardcode 'farmer' / 'staff' / 'admin' to test each path
    console.log("Stubbed role (replace once profiles lands):", fakeRole);
  };

  return (
    <div style={{ maxWidth: 320, margin: "80px auto" }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 10 }}
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  );
}
