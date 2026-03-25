import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useToast } from '../context/AppContext';
import { Button, Input, Divider } from '../components/ui/index';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleLoginField(e) {
    setLoginForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
  }
  function handleRegField(e) {
    setRegisterForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
  }

  async function handleLogin(e) {
    e.preventDefault();
    const errs = {};
    if (!loginForm.email) errs.email = 'Email is required';
    if (!loginForm.password) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    login({ name: 'Demo User', email: loginForm.email });
    showToast('Welcome back!');
    setLoading(false);
    navigate(from, { replace: true });
  }

  async function handleRegister(e) {
    e.preventDefault();
    const errs = {};
    if (!registerForm.firstName) errs.firstName = 'Required';
    if (!registerForm.email) errs.email = 'Email is required';
    if (!registerForm.password || registerForm.password.length < 8) errs.password = 'Min 8 characters';
    if (registerForm.password !== registerForm.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1100));
    login({ name: `${registerForm.firstName} ${registerForm.lastName}`, email: registerForm.email });
    showToast('Account created! Welcome to Ironclad.');
    setLoading(false);
    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen bg-cream-50 flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px)',
          }}
        />
        <div className="relative text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <span className="text-charcoal-900 font-display font-black text-2xl tracking-wider">IC</span>
          </div>
          <h2 className="font-display font-black text-5xl tracking-wider uppercase text-cream-100 leading-none mb-4">
            The Parts<br /><span className="text-amber-400">You Need.</span>
          </h2>
          <p className="font-serif font-light text-steel-400 text-lg leading-relaxed">
            12,450+ OEM-grade parts. Every make, model, and year. Guaranteed fitment or your money back.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '🛡', label: '2-Year Warranty', sub: 'On every part' },
              { icon: '🚚', label: 'Fast Shipping', sub: 'As fast as next day' },
              { icon: '↩', label: 'Easy Returns', sub: '30-day hassle-free' },
              { icon: '✓', label: 'OEM Quality', sub: 'Factory certified' },
            ].map(b => (
              <div key={b.label} className="p-3 bg-cream-50/5 border border-cream-50/10 rounded-xl">
                <span className="text-xl">{b.icon}</span>
                <p className="text-xs font-display font-bold tracking-widest uppercase text-cream-200 mt-2">{b.label}</p>
                <p className="text-xs font-mono text-steel-500">{b.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-charcoal-900 rounded flex items-center justify-center">
              <span className="text-amber-400 font-display font-black text-sm">IC</span>
            </div>
            <span className="font-display font-black text-xl tracking-widest text-charcoal-900 uppercase">Ironclad</span>
          </Link>

          {/* Tab switcher */}
          <div className="flex bg-cream-200 rounded-xl p-1 mb-8">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}); }}
                className={`flex-1 py-2.5 text-sm font-display font-bold tracking-widest uppercase rounded-lg transition-all ${
                  mode === m ? 'bg-charcoal-900 text-cream-100 shadow' : 'text-steel-500 hover:text-charcoal-900'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-up">
              <div>
                <h1 className="font-display font-black text-3xl tracking-wider uppercase text-charcoal-900 mb-1">
                  Welcome back
                </h1>
                <p className="text-sm font-mono text-steel-400">Sign in to your Ironclad account</p>
              </div>

              {/* Demo hint */}
              <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg">
                <p className="text-xs font-mono text-amber-700">
                  Demo: use any email + password (8+ chars) to sign in
                </p>
              </div>

              <Input
                label="Email" name="email" type="email"
                value={loginForm.email} onChange={handleLoginField}
                placeholder="john@example.com" error={errors.email}
              />
              <Input
                label="Password" name="password" type="password"
                value={loginForm.password} onChange={handleLoginField}
                placeholder="••••••••" error={errors.password}
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="custom-check" />
                  <span className="font-mono text-steel-600">Remember me</span>
                </label>
                <a href="#" className="font-mono text-amber-600 hover:text-amber-700 transition-colors">
                  Forgot password?
                </a>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                {loading ? 'Signing In…' : 'Sign In'}
              </Button>

              <Divider label="or continue with" />

              <div className="grid grid-cols-2 gap-3">
                {['Google', 'Apple'].map(provider => (
                  <button
                    key={provider}
                    type="button"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-cream-200 rounded-lg text-sm font-mono text-steel-600 hover:bg-cream-100 hover:border-steel-300 transition-colors"
                  >
                    <span>{provider === 'Google' ? 'G' : '🍎'}</span>
                    {provider}
                  </button>
                ))}
              </div>

              <p className="text-center text-sm font-mono text-steel-400">
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('register')} className="text-amber-600 hover:text-amber-700 font-semibold transition-colors">
                  Register
                </button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-up">
              <div>
                <h1 className="font-display font-black text-3xl tracking-wider uppercase text-charcoal-900 mb-1">
                  Create account
                </h1>
                <p className="text-sm font-mono text-steel-400">Join thousands of DIY mechanics</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name" name="firstName"
                  value={registerForm.firstName} onChange={handleRegField}
                  placeholder="John" error={errors.firstName}
                />
                <Input
                  label="Last Name" name="lastName"
                  value={registerForm.lastName} onChange={handleRegField}
                  placeholder="Doe"
                />
              </div>
              <Input
                label="Email" name="email" type="email"
                value={registerForm.email} onChange={handleRegField}
                placeholder="john@example.com" error={errors.email}
              />
              <Input
                label="Password" name="password" type="password"
                value={registerForm.password} onChange={handleRegField}
                placeholder="Min 8 characters" error={errors.password}
              />
              <Input
                label="Confirm Password" name="confirm" type="password"
                value={registerForm.confirm} onChange={handleRegField}
                placeholder="Repeat password" error={errors.confirm}
              />

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" required className="custom-check mt-0.5" />
                <span className="text-xs font-mono text-steel-500">
                  I agree to the{' '}
                  <a href="#" className="text-amber-600 hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-amber-600 hover:underline">Privacy Policy</a>
                </span>
              </label>

              <Button type="submit" variant="amber" size="lg" className="w-full" loading={loading}>
                {loading ? 'Creating Account…' : 'Create Account'}
              </Button>

              <p className="text-center text-sm font-mono text-steel-400">
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-amber-600 hover:text-amber-700 font-semibold">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
