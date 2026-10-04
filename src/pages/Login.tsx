import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../contexts/auth-context";

const Login = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setErrorMessage(message);
    }
  };

  const onRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await register(name, newEmail, newPassword);
      setShowRegister(false);
      setErrorMessage("Account created. Please sign in.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      setErrorMessage(message);
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="p-8 w-full max-w-md">
        {errorMessage && (
          <div className="mt-2 text-sm text-pink-200">
            {errorMessage}
          </div>
        )}
        {!showRegister ? (
          <>
            <h1 className="text-2xl font-semibold">Sign In</h1>
            <p className="text-white/70">Access EE_Tamils LMS resources.</p>
            <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
              <input
                className="btn-secondary text-left"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <div className="relative">
                <input
                  className="btn-secondary text-left w-full pr-10"
                  placeholder="Password"
                  type={showLoginPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <Button type="submit">Login</Button>
            </form>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-white/70 text-sm">
                Don’t have an account?{" "}
                <button
                  type="button"
                  className="text-neon-blue"
                  onClick={() => setShowRegister(true)}
                >
                  Create new one
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Create Account</h1>
            <p className="text-white/70">Register to access EE_Tamils LMS.</p>
            <form className="mt-4 grid gap-3" onSubmit={onRegister}>
              <input
                className="btn-secondary text-left"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <input
                className="btn-secondary text-left"
                placeholder="Email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
              />
              <div className="relative">
                <input
                  className="btn-secondary text-left w-full pr-10"
                  placeholder="Password"
                  type={showRegisterPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                >
                  {showRegisterPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <Button type="submit" variant="secondary">
                Create Account
              </Button>
            </form>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-white/70 text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-neon-blue"
                  onClick={() => setShowRegister(false)}
                >
                  Sign in
                </button>
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Login;
