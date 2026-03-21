import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const { login, register, authLoading, authError, clearAuthError } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const clearFormData = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
  };

  const clearAllMessages = () => {
    setValidationError("");
    setSuccessMessage("");
    clearAuthError();
  };

  const switchToLogin = () => {
    setIsLogin(true);
    clearAllMessages();
  };

  const switchToSignup = () => {
    setIsLogin(false);
    clearAllMessages();
  };

  const validateForm = () => {
    clearAllMessages();

    if (!email.trim()) {
      setValidationError("Email is required");
      return false;
    }

    if (!email.includes("@")) {
      setValidationError("Please enter a valid email address");
      return false;
    }

    if (!password.trim()) {
      setValidationError("Password is required");
      return false;
    }

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters long");
      return false;
    }

    if (!isLogin) {
      if (!firstName.trim() || !lastName.trim()) {
        setValidationError("First and last names are required");
        return false;
      }

      if (password !== confirmPassword) {
        setValidationError("Passwords do not match");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isLogin) {
        await login({
          username: email, // Backend expects username field but we use email
          password: password,
        });
        // Login successful - AppContext will handle navigation
      } else {
        await register({
          username: email, // Backend expects username field but we use email
          password: password,
          email: email,
          full_name: `${firstName} ${lastName}`,
        });
        // Registration successful - show success message and switch to login
        setSuccessMessage("Account created successfully! Please log in with your credentials.");
        clearFormData();
        setIsLogin(true);
      }
    } catch (error: unknown) {
      // Errors are handled by AppContext and reflected in authError
      console.error("Authentication error:", error);
    }
  };

  const displayError = validationError || authError;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-neigh w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <img
            src="/horse-head.png"
            alt="Horse"
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold leading-tight">Neigh-ver Go Broke!!</h1>
          <p className="text-muted-foreground mt-2 text-sm">Stop horsing around with your money.</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm animate-fade-up">
            {successMessage}
          </div>
        )}

        {displayError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-fade-up">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3 animate-fade-up">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Impulse"
                    required={!isLogin}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Cowboy"
                    required={!isLogin}
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="cowboy@ranch.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
              required
            />
          </div>
          {!isLogin && (
            <div className="animate-fade-up">
              <label className="text-sm font-medium mb-1.5 block">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
                required
              />
            </div>
          )}
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={authLoading}
          >
            {authLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isLogin ? "Logging in..." : "Creating Account..."}
              </div>
            ) : isLogin ? (
              "Login"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <button
          onClick={() => (isLogin ? switchToSignup() : switchToLogin())}
          disabled={authLoading}
          className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLogin ? (
            <>
              Don't have an account? <span className="font-bold">Sign up</span>
            </>
          ) : (
            <>
              Already have an account? <span className="font-bold">Login</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
