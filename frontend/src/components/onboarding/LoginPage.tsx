import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const { setEmail, setOnboardingStep } = useApp();
  const [email, setLocalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail(email);
    setOnboardingStep(1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-neigh w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🐴</span>
          <h1 className="text-2xl font-bold font-display leading-tight">
            Welcome to Neigh-ver Go Broke
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Stop horsing around with your money.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setLocalEmail(e.target.value)}
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
          <Button type="submit" className="w-full h-11 text-sm font-semibold active:scale-[0.97]">
            {isLogin ? "Login" : "Create Account"}
          </Button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
