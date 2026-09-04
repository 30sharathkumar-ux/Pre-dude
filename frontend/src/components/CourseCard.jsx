export default function CourseCard({ category, title, description, instructorInitials, instructorName, price, rating, lessons, icon, colorTheme }) {
  const gradients = {
    amber: "from-amber-100 via-rose-100 to-violet-100",
    emerald: "from-emerald-100 via-teal-100 to-cyan-100",
    sky: "from-sky-100 via-indigo-100 to-purple-100",
    pink: "from-pink-100 via-rose-100 to-amber-100"
  };
  
  const textColors = {
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    sky: "text-indigo-500",
    pink: "text-pink-500"
  };

  const bgColors = {
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    sky: "bg-indigo-600",
    pink: "bg-rose-500"
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-100 p-4 shadow-soft-card hover:shadow-hover-card transition-all flex flex-col justify-between group">
      <div>
        <div className={`relative w-full h-40 rounded-xl bg-gradient-to-tr ${gradients[colorTheme]} flex items-center justify-center overflow-hidden mb-3.5`}>
          <div className={`w-20 h-20 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center ${textColors[colorTheme]} group-hover:scale-105 transition-all`}>
            <i className={`fa-solid ${icon} text-3xl`}></i>
          </div>
          <button className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all">
            <i className="fa-regular fa-bookmark text-xs"></i>
          </button>
          <span className={`absolute bottom-2.5 left-2.5 ${bgColors[colorTheme]} text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-md`}>
            {category}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-amber-500 text-xs flex items-center gap-1">
            <i className="fa-solid fa-star text-[11px]"></i> {rating}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-400">{lessons} Lessons</span>
        </div>
        <h4 className="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors line-clamp-1">
          {title}
        </h4>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
          {description}
        </p>
      </div>
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-600">
            {instructorInitials}
          </div>
          <span className="text-xs text-slate-600 font-medium">{instructorName}</span>
        </div>
        <span className="text-sm font-black text-brand-600">${price}</span>
      </div>
    </article>
  );
}
