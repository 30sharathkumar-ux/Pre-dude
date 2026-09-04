import CourseCard from './CourseCard';

export default function Dashboard({ user }) {
  const firstName = (user?.user_metadata?.full_name || user?.user_metadata?.name || 'there').split(' ')[0]
  const popularCourses = [
    {
      category: "Design", rating: "4.9", lessons: "25",
      title: "UI/UX Design Fundamentals & Figma",
      description: "Learn core visual hierarchy, auto layout systems, and interactive wireframing from industry leads.",
      instructorInitials: "MR", instructorName: "Michael R.",
      price: "48.00", icon: "fa-bezier-curve", colorTheme: "amber"
    },
    {
      category: "Business", rating: "4.8", lessons: "32",
      title: "Startup Scale-Up & Lean Validation",
      description: "Master modern business mechanics, pitch preparation, and customer acquisition channels.",
      instructorInitials: "RT", instructorName: "Robert T.",
      price: "59.00", icon: "fa-rocket", colorTheme: "emerald"
    },
    {
      category: "DevOps", rating: "5.0", lessons: "18",
      title: "AWS & Cloud Native Microservices",
      description: "Hands-on deployment using Docker, Kubernetes, CI/CD pipelines and serverless patterns.",
      instructorInitials: "AK", instructorName: "Alexander K.",
      price: "64.00", icon: "fa-cloud-arrow-up", colorTheme: "sky"
    },
    {
      category: "Product", rating: "4.7", lessons: "20",
      title: "Agile Product Roadmap & OKR Strategy",
      description: "Frameworks for user research, scoping features, metric prioritization and stakeholder sync.",
      instructorInitials: "SL", instructorName: "Sarah Lee",
      price: "42.00", icon: "fa-chart-pie", colorTheme: "pink"
    }
  ];

  return (
    <main className="p-8 space-y-8 flex-1">
      {/* Hero Welcome Banner */}
      <section className="gradient-hero-bg rounded-3xl p-8 text-white relative overflow-hidden shadow-glow-purple" data-purpose="welcome-hero-banner">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute right-36 top-6 w-32 h-32 bg-purple-400/20 rounded-full blur-xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm inline-block mb-3">
            📚 Welcome back, {firstName}!
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Ready to keep learning today?
          </h1>
          <p className="mt-2.5 text-purple-100 text-sm leading-relaxed max-w-xl">
            You have 2 pending assignments and 1 live module coming up in 45 minutes. Continue your daily track to maintain your 3-day learning streak!
          </p>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <button className="px-5 py-2.5 bg-white text-brand-700 hover:bg-purple-50 font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2">
              <i className="fa-solid fa-circle-play text-brand-600"></i>
              Resume Last Course
            </button>
            <button className="px-5 py-2.5 bg-brand-700/40 hover:bg-brand-700/60 border border-white/20 text-white font-medium text-sm rounded-xl backdrop-blur-sm transition-all">
              Explore New Catalog
            </button>
          </div>
        </div>
        
        {/* 3D-Like Graphic Representation inside Hero */}
        <div className="hidden xl:flex absolute right-12 bottom-6 items-end gap-3 pointer-events-none">
          <div className="w-16 h-36 bg-amber-400 rounded-lg shadow-lg rotate-[-6deg] border-2 border-white/20 flex flex-col justify-between p-2">
            <div className="w-full h-1 bg-white/40 rounded"></div>
            <span className="text-[9px] font-bold text-slate-800 tracking-widest text-center transform -rotate-90">UX/UI</span>
            <div className="w-full h-2 bg-amber-500 rounded"></div>
          </div>
          <div className="w-16 h-48 bg-rose-400 rounded-lg shadow-xl -rotate-1 border-2 border-white/20 flex flex-col justify-between p-2">
            <div className="w-full h-1 bg-white/40 rounded"></div>
            <span className="text-[9px] font-bold text-white tracking-widest text-center transform -rotate-90">PYTHON</span>
            <div className="w-full h-2 bg-rose-500 rounded"></div>
          </div>
          <div className="w-20 h-40 bg-indigo-300 rounded-lg shadow-lg rotate-6 border-2 border-white/20 flex flex-col justify-between p-2">
            <div className="w-full h-1 bg-white/40 rounded"></div>
            <span className="text-[9px] font-bold text-indigo-900 tracking-widest text-center transform -rotate-90">DESIGN</span>
            <div className="w-full h-2 bg-indigo-400 rounded"></div>
          </div>
        </div>
      </section>
      
      {/* Quick Metrics 4-Column Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" data-purpose="learning-progress-metrics">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft-card flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
            <i className="fa-solid fa-book-bookmark"></i>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">Courses Completed</span>
            <h3 className="text-2xl font-black text-slate-800">3</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft-card flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg font-bold">
            <i className="fa-solid fa-award"></i>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">Certificates Earned</span>
            <h3 className="text-2xl font-black text-slate-800">2</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft-card flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-lg font-bold">
            <i className="fa-regular fa-clock"></i>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">Hours Learned</span>
            <h3 className="text-2xl font-black text-slate-800">18.5 <span className="text-xs font-semibold text-slate-400">hrs</span></h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft-card flex items-center gap-4 hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-lg font-bold">
            <i className="fa-solid fa-fire-flame-curved"></i>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">Daily Streak</span>
            <h3 className="text-2xl font-black text-slate-800">3 <span className="text-xs font-semibold text-slate-400">Days</span></h3>
          </div>
        </div>
      </section>

      {/* Main Layout Grid: Primary Content Area (2/3) + Secondary Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Continue Learning & Course Library (Span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Continue Learning Section */}
          <section data-purpose="continue-learning-widget">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Continue Learning</h2>
              <a className="text-xs font-semibold text-brand-600 hover:text-brand-700" href="#">View History</a>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-soft-card flex flex-col sm:flex-row items-center gap-5 hover:border-brand-200 transition-all">
              <div className="w-full sm:w-36 h-28 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col justify-center items-center text-white shrink-0 relative overflow-hidden">
                <i className="fa-brands fa-python text-4xl mb-1 text-white/90"></i>
                <span className="text-[10px] font-bold tracking-widest uppercase">Module 4 of 6</span>
                <span className="absolute top-2 left-2 bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">70% Completed</span>
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-full">Coding</span>
                  <span className="text-xs font-semibold text-slate-400">2 lessons left</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mt-1.5">Mastering Python Basics &amp; Architecture</h3>
                <p className="text-xs text-slate-500 mt-0.5">Next Topic: Object-Oriented Patterns &amp; Abstract Classes</p>
                <div className="mt-3.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
                    <span>Progress</span>
                    <span className="text-brand-600 font-bold">68%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 rounded-full w-[68%] transition-all duration-500"></div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <button className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2">
                  <span>Resume</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>
            </div>
          </section>

          {/* Popular Courses Catalog Grid */}
          <section data-purpose="popular-courses-grid">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Popular &amp; Recommended</h2>
                <p className="text-xs text-slate-400">Handpicked programs aligned with your goals</p>
              </div>
              <a className="text-xs font-semibold text-brand-600 hover:text-brand-700" href="#">View All</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {popularCourses.map((course, index) => (
                <CourseCard key={index} {...course} />
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Achievement Tracker & Best Selling/Instructors (Span 1) */}
        <div className="space-y-6">
          
          {/* Widget: Unlocks Achievement */}
          <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-soft-card" data-purpose="achievement-tracker">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Unlocks Achievement</h3>
                <p className="text-[11px] text-slate-400">Goal achieved unlocks premium tier</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  <i className="fa-solid fa-code"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-700">Code Master</span>
                    <span className="text-brand-600 font-bold">66%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 rounded-full w-[66%]"></div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 font-medium">7 days left</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  <i className="fa-solid fa-palette"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-700">Creative Flow</span>
                    <span className="text-amber-500 font-bold">22%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-[22%]"></div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 font-medium">12 days left</span>
              </div>
            </div>
          </section>

          {/* Widget: Best Sellers / Quick Enroll */}
          <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-soft-card" data-purpose="bestselling-classes">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Best Sellers</h3>
              <a className="text-xs font-semibold text-brand-600 hover:text-brand-700" href="#">View All</a>
            </div>
            
            <div className="space-y-3.5">
              {[
                { icon: "🌱", color: "emerald", title: "Grow Green: AgroTech", rating: "4.9", students: "1,240" },
                { icon: "🪴", color: "violet", title: "Interior Botany 101", rating: "4.8", students: "950" },
                { icon: "💬", color: "sky", title: "Public Speaking Core", rating: "4.7", students: "3,420" },
                { icon: "⏳", color: "rose", title: "Unplug: Deep Focus", rating: "5.0", students: "870" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${item.color}-100 text-${item.color}-600 flex items-center justify-center font-bold text-sm`}>
                      {item.icon}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{item.title}</h5>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <i className="fa-solid fa-star text-amber-400 text-[10px]"></i> {item.rating} • {item.students} enrolled
                      </p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 font-semibold text-xs rounded-lg transition-all">
                    Enroll
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Study Schedule Quick Calendar Box */}
          <section className="bg-gradient-to-br from-white to-brand-50/50 rounded-2xl border border-brand-100 p-5 shadow-soft-card" data-purpose="study-reminders">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-xs">
                <i className="fa-regular fa-calendar-check"></i>
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Upcoming Live Event</h4>
            </div>
            <p className="text-xs text-slate-600 font-medium">Design Systems Live Q&amp;A with Senior Staff Lead</p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-brand-100/60">
              <span className="flex items-center gap-1.5 font-semibold text-brand-600">
                <i className="fa-regular fa-clock"></i> Today, 4:00 PM
              </span>
              <button className="text-xs font-bold text-slate-700 hover:text-brand-600">Set Reminder</button>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
