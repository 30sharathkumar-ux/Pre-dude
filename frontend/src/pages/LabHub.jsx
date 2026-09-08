import React from 'react';

export default function LabHub() {
  return (
    <div className="p-8 flex-1">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft-card h-full flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
          <i className="fa-solid fa-flask"></i>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-4">Lab Hub</h1>
        <p className="text-slate-500 max-w-lg mb-8">
          Interactive coding environments and hands-on experiments will live here. Practice what you learn instantly.
        </p>
        <div className="px-4 py-2 bg-slate-100 rounded-full text-xs font-semibold text-slate-500">
          Coming Soon
        </div>
      </div>
    </div>
  );
}
