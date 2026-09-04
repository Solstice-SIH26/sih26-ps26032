import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    // 1. Login using Supabase Auth
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Login failed
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    // 2. Get the user's role from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    // Could not find profile
    if (profileError || !profile) {
      setError("Could not determine user role");
      setLoading(false);
      return;
    }

    // 3. Redirect according to role
    if (profile.role === "farmer") {
      navigate("/farmer");
    } else if (profile.role === "procurement") {
      navigate("/staff");
    } else if (profile.role === "admin") {
      navigate("/admin");
    } else {
      setError("Invalid user role");
    }

    setLoading(false);
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
