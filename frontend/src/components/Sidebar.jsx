import { NavLink } from 'react-router-dom';

export default function Sidebar({ onLogout }) {
  const linkClass = ({ isActive }) => 
    `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
      isActive
        ? 'text-brand-600 bg-brand-50/80'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  const iconClass = ({ isActive }) =>
    `text-base ${isActive ? '' : 'text-slate-400'}`;

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 justify-between fixed top-0 bottom-0 left-0 z-30 transition-all duration-300" data-purpose="sidebar-container">
      <div className="flex flex-col h-full overflow-y-auto px-5 py-6">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
            <i className="fa-solid fa-graduation-cap text-lg"></i>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-800">Buddy<span className="text-brand-600">Judge</span></span>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Intelligent Learning</span>
          </div>
        </div>
        
        {/* Navigation Section: Main Menu */}
        <div className="space-y-6 flex-1">
          <div>
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
            <nav className="space-y-1">
              <NavLink to="/" className={linkClass} end>
                {({ isActive }) => (
                  <>
                    <i className={`fa-solid fa-house-chimney ${iconClass({ isActive })}`}></i>
                    <span>Home</span>
                    {isActive && <span className="ml-auto w-1.5 h-4 rounded-full bg-brand-600"></span>}
                  </>
                )}
              </NavLink>
              
              <NavLink to="/project-validation" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <i className={`fa-solid fa-rocket ${iconClass({ isActive })}`}></i>
                    <span>Project Validation</span>
                    {isActive && <span className="ml-auto w-1.5 h-4 rounded-full bg-brand-600"></span>}
                  </>
                )}
              </NavLink>

              <NavLink to="/lab-hub" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <i className={`fa-solid fa-flask ${iconClass({ isActive })}`}></i>
                    <span>Lab Hub</span>
                    {isActive && <span className="ml-auto w-1.5 h-4 rounded-full bg-brand-600"></span>}
                  </>
                )}
              </NavLink>

              <NavLink to="/ai-assistant" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <i className={`fa-solid fa-robot ${iconClass({ isActive })}`}></i>
                    <span>AI Assistant</span>
                    {isActive && <span className="ml-auto w-1.5 h-4 rounded-full bg-brand-600"></span>}
                  </>
                )}
              </NavLink>

              <NavLink to="/events-exams" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <i className={`fa-solid fa-calendar-days ${iconClass({ isActive })}`}></i>
                    <span>Events & Exams</span>
                    {isActive && <span className="ml-auto w-1.5 h-4 rounded-full bg-brand-600"></span>}
                  </>
                )}
              </NavLink>
            </nav>
          </div>
          
          {/* Navigation Section: Preferences & Support */}
          <div>
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preferences</p>
            <nav className="space-y-1">
              <NavLink to="/settings" className={linkClass}>
                {({ isActive }) => (
                  <>
                    <i className={`fa-solid fa-sliders ${iconClass({ isActive })}`}></i>
                    <span>Settings</span>
                    {isActive && <span className="ml-auto w-1.5 h-4 rounded-full bg-brand-600"></span>}
                  </>
                )}
              </NavLink>
            </nav>
          </div>
        </div>

        {/* Upgrade to Pro Card */}
        <div className="mt-8 pro-card-gradient border border-brand-100 p-4 rounded-2xl text-center relative overflow-hidden mb-4" data-purpose="pro-subscription-banner">
          <div className="w-10 h-10 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center text-brand-600 mb-2">
            <i className="fa-solid fa-bolt text-lg"></i>
          </div>
          <h4 className="font-bold text-slate-800 text-sm">Upgrade to Pro</h4>
          <p className="text-xs text-slate-500 mt-1 mb-3.5 leading-relaxed">Unlock 1,500+ masterclasses &amp; personal AI mentorship</p>
          <button className="w-full py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5">
            <span>Upgrade Now</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>

        {/* Logout Button */}
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm text-red-600 hover:bg-red-50 transition-all mt-auto"
        >
          <i className="fa-solid fa-right-from-bracket text-base"></i>
          <span>Logout</span>
        </button>

      </div>
    </aside>
  );
}
