import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Settings({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account Settings', icon: 'fa-user' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell' },
    { id: 'appearance', label: 'Appearance', icon: 'fa-palette' },
    { id: 'ai', label: 'AI Assistant', icon: 'fa-robot' }
  ];

  return (
    <div className="p-8 flex-1 max-w-5xl mx-auto w-full space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account preferences and application settings.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 bg-white rounded-3xl p-4 border border-slate-100 shadow-soft-card">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? '' : 'text-slate-400'}`}></i>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm text-red-600 hover:bg-red-50 transition-all"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              Logout
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-soft-card min-h-[500px]">
          
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Account Information</h3>
                <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400 text-xl">
                      <i className="fa-brands fa-google"></i>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Connected with Google</p>
                      <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-full">Active</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Profile Details</h3>
                <p className="text-sm text-slate-500 mb-4">Your name, college, and other personal information are managed in your profile.</p>
                <Link to="/profile" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-50 text-brand-600 hover:bg-brand-100 font-semibold text-sm rounded-xl transition-all">
                  Go to Profile
                  <i className="fa-solid fa-arrow-right"></i>
                </Link>
              </div>
              
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-slate-500 mb-4">Permanently delete your account and all associated data.</p>
                <button className="px-5 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm rounded-xl transition-all">
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6">Notification Preferences</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Email Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Receive updates about assignments and live classes.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Push Notifications</h4>
                      <p className="text-xs text-slate-500 mt-1">Get instantly notified in-browser for upcoming exams.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Marketing & Offers</h4>
                      <p className="text-xs text-slate-500 mt-1">Updates on new courses and premium discounts.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6">Theme</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border-2 border-brand-500 bg-slate-50 rounded-2xl p-4 cursor-pointer relative">
                    <div className="absolute top-3 right-3 text-brand-600">
                      <i className="fa-solid fa-circle-check"></i>
                    </div>
                    <div className="w-full h-24 bg-white rounded-lg border border-slate-200 mb-3 shadow-sm flex items-center justify-center text-slate-300">
                      <i className="fa-regular fa-sun text-2xl"></i>
                    </div>
                    <p className="text-sm font-bold text-center text-slate-800">Light Mode</p>
                  </div>
                  
                  <div className="border-2 border-transparent bg-slate-50 rounded-2xl p-4 cursor-pointer hover:border-slate-200 transition-all">
                    <div className="w-full h-24 bg-slate-900 rounded-lg border border-slate-700 mb-3 shadow-sm flex items-center justify-center text-slate-600">
                      <i className="fa-solid fa-moon text-2xl"></i>
                    </div>
                    <p className="text-sm font-bold text-center text-slate-500">Dark Mode</p>
                  </div>

                  <div className="border-2 border-transparent bg-slate-50 rounded-2xl p-4 cursor-pointer hover:border-slate-200 transition-all">
                    <div className="w-full h-24 bg-gradient-to-br from-white to-slate-900 rounded-lg border border-slate-300 mb-3 shadow-sm flex items-center justify-center text-slate-400">
                      <i className="fa-solid fa-desktop text-2xl"></i>
                    </div>
                    <p className="text-sm font-bold text-center text-slate-500">System Sync</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Assistant Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6">AI Buddy Preferences</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-slate-800 block mb-2">Teaching Style</label>
                    <select className="w-full max-w-sm px-4 py-2.5 bg-slate-50 border-transparent focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100 rounded-xl text-sm text-slate-700 transition-all">
                      <option>Socratic (Asks guiding questions)</option>
                      <option>Direct (Gives exact answers)</option>
                      <option>Supportive (Encouraging tone)</option>
                      <option>Strict (Focuses purely on logic)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between max-w-sm">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Proactive Suggestions</h4>
                      <p className="text-xs text-slate-500 mt-1">AI suggests topics based on errors.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                  
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl mt-6">
                    <div className="flex gap-3">
                      <i className="fa-solid fa-wand-magic-sparkles text-purple-500 mt-0.5"></i>
                      <div>
                        <h5 className="text-sm font-bold text-purple-900">AI Context Memory is ON</h5>
                        <p className="text-xs text-purple-700 mt-1">Your AI remembers your past projects and learning history to provide better personalized feedback.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
