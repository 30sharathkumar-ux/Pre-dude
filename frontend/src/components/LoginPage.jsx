export default function LoginPage({ onGoogleLogin }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

      {/* Animated background blobs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', animation: 'blob1 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-5%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(70px)', animation: 'blob2 10s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '20%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(50px)', animation: 'blob3 12s ease-in-out infinite'
      }} />

      {/* Keyframes injected inline */}
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.08); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 20px) scale(1.05); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -15px) scale(1.1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .login-card {
          animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .google-btn {
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .google-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(99,102,241,0.45);
          background: rgba(255,255,255,0.18) !important;
        }
        .google-btn:active {
          transform: translateY(0);
        }
        .brand-shimmer {
          background: linear-gradient(90deg, #a78bfa, #818cf8, #c084fc, #818cf8, #a78bfa);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.1);
        }
      `}</style>

      {/* Glass Card */}
      <div className="login-card relative z-10 w-full max-w-md mx-4" style={{
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '24px',
        padding: '48px 40px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
      }}>

        {/* Logo / Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px', marginBottom: '20px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99,102,241,0.5)'
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 24 L16 8 L24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.5 19 H21.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>

          <h1 className="brand-shimmer text-3xl font-bold tracking-tight mb-1">BuddyJudge</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', textAlign: 'center', lineHeight: '1.5' }}>
            Your intelligent learning companion.<br/>Sign in to access your dashboard.
          </p>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div className="divider-line" />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', whiteSpace: 'nowrap' }}>Continue with</span>
          <div className="divider-line" />
        </div>

        {/* Google Login Button */}
        <button
          id="google-login-btn"
          className="google-btn"
          onClick={onGoogleLogin}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '14px 20px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '14px',
            color: 'white',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          {/* Google G Logo SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Footer note */}
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', textAlign: 'center', marginTop: '24px', lineHeight: '1.6' }}>
          By continuing, you agree to our{' '}
          <a href="#" style={{ color: 'rgba(167,139,250,0.7)', textDecoration: 'none' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{ color: 'rgba(167,139,250,0.7)', textDecoration: 'none' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
