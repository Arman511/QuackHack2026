import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const { setEmail, setOnboardingStep } = useApp();
  const [email, setLocalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail(email);
    setOnboardingStep(1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-neigh w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <img
            src="/horse-head.png"
            alt="Horse"
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold leading-tight">
            Neigh-ver Go Broke!!
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Stop horsing around with your money.</p>
        </div>

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
          {isLogin ? (
            <>Don't have an account? <span className="font-bold">Sign up</span></>
          ) : (
            <>Already have an account? <span className="font-bold">Login</span></>
          )}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
