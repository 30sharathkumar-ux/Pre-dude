export default function Header({ user }) {
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  // Build initials from name (e.g. "Irham M. Shidiq" → "IS")
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .join('')

  return (
    <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between px-8" data-purpose="dashboard-header">
      {/* Search Field */}
      <div className="w-96 relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
          <i className="fa-solid fa-magnifying-glass text-sm"></i>
        </span>
        <input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-2xl text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" placeholder="Search courses, instructors, topics..." type="text" />
      </div>
      
      {/* Right Top Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Live Status Indicator Pill */}
        <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-full text-xs font-semibold border border-red-100/80 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          2 Live Classes
        </span>
        
        {/* Dark/Light Theme Button */}
        <button className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-all border border-slate-100">
          <i className="fa-regular fa-moon text-sm"></i>
        </button>
        
        {/* Notification Bell Icon */}
        <button className="relative w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-all border border-slate-100">
          <i className="fa-regular fa-bell text-sm"></i>
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-600 rounded-full ring-2 ring-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 mx-1"></div>
        
        {/* User Profile Quick Info */}
        <div className="flex items-center gap-3 pl-1 cursor-pointer">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-10 h-10 rounded-xl object-cover shadow-sm ring-2 ring-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white">
                {initials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </div>
          <div className="text-left hidden lg:block">
            <h5 className="text-sm font-semibold text-slate-800 leading-tight">{fullName}</h5>
            <p className="text-[11px] font-medium text-slate-400">Senior Student</p>
          </div>
          <i className="fa-solid fa-chevron-down text-[10px] text-slate-400 hidden lg:block"></i>
        </div>
      </div>
    </header>
  );
}
