import React from 'react';

export default function AIAssistant() {
  return (
    <div className="p-8 flex-1">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft-card h-full flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
          <i className="fa-solid fa-robot"></i>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-4">AI Assistant</h1>
        <p className="text-slate-500 max-w-lg mb-8">
          Your personal intelligent learning companion. Ask questions, debug code, and get personalized study plans.
        </p>
        <div className="px-4 py-2 bg-slate-100 rounded-full text-xs font-semibold text-slate-500">
          Coming Soon
        </div>
      </div>
    </div>
  );
}
