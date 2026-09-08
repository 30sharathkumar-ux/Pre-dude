import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    college: '',
    branch: '',
    semester: '',
    usn: ''
  });

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error.message);
      } else if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          college: data.college || '',
          branch: data.branch || '',
          semester: data.semester || '',
          usn: data.usn || ''
        });
      }
      setIsLoading(false);
    }
    
    if (user?.id) fetchProfile();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
      full_name: formData.full_name,
      college: formData.college,
      branch: formData.branch,
      semester: formData.semester,
      usn: formData.usn
    });

    if (error) {
      console.error('Error saving profile:', error.message);
      alert('Failed to save profile');
    } else {
      setProfile(prev => ({ ...prev, ...formData }));
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const displayAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const displayEmail = profile?.email || user?.email;

  return (
    <div className="p-8 flex-1 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Student Profile</h1>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-brand-50 text-brand-600 hover:bg-brand-100 font-semibold text-sm rounded-xl transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-pen"></i>
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  full_name: profile?.full_name || '',
                  college: profile?.college || '',
                  branch: profile?.branch || '',
                  semester: profile?.semester || '',
                  usn: profile?.usn || ''
                });
              }}
              className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-sm rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 font-semibold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <i className="fa-solid fa-check"></i>
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft-card">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 shrink-0">
            <div className="relative">
              {displayAvatar ? (
                <img 
                  src={displayAvatar} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-3xl object-cover shadow-md ring-4 ring-slate-50"
                />
              ) : (
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-brand-400 to-indigo-500 flex items-center justify-center text-white text-4xl font-bold shadow-md ring-4 ring-slate-50">
                  {formData.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <span className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-check text-white text-xs"></i>
              </span>
            </div>
            <div className="text-center">
              <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-bold uppercase tracking-wider">Verified</span>
            </div>
          </div>

          {/* Details Section */}
          <div className="flex-1 w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                {isEditing ? (
                  <input 
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100 rounded-xl text-sm text-slate-700 transition-all"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-base font-semibold text-slate-800">{profile?.full_name || 'Not provided'}</p>
                )}
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="flex items-center gap-2">
                  <i className="fa-brands fa-google text-slate-400 text-sm"></i>
                  <p className="text-base font-semibold text-slate-600">{displayEmail}</p>
                </div>
              </div>

              {/* College */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">College / University</label>
                {isEditing ? (
                  <input 
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100 rounded-xl text-sm text-slate-700 transition-all"
                    placeholder="e.g. Stanford University"
                  />
                ) : (
                  <p className="text-base font-semibold text-slate-800">{profile?.college || 'Not provided'}</p>
                )}
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Branch / Major</label>
                {isEditing ? (
                  <input 
                    type="text"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100 rounded-xl text-sm text-slate-700 transition-all"
                    placeholder="e.g. Computer Science"
                  />
                ) : (
                  <p className="text-base font-semibold text-slate-800">{profile?.branch || 'Not provided'}</p>
                )}
              </div>

              {/* Semester */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Semester</label>
                {isEditing ? (
                  <select 
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100 rounded-xl text-sm text-slate-700 transition-all"
                  >
                    <option value="">Select Semester</option>
                    {[1,2,3,4,5,6,7,8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-base font-semibold text-slate-800">{profile?.semester ? `Semester ${profile.semester}` : 'Not provided'}</p>
                )}
              </div>

              {/* USN / Student ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student ID (USN)</label>
                {isEditing ? (
                  <input 
                    type="text"
                    name="usn"
                    value={formData.usn}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100 rounded-xl text-sm text-slate-700 transition-all uppercase"
                    placeholder="e.g. 1RV21CS001"
                  />
                ) : (
                  <p className="text-base font-semibold text-slate-800 uppercase">{profile?.usn || 'Not provided'}</p>
                )}
              </div>
            </div>
            
            {/* Read-Only Stats/Info Area */}
            {!isEditing && (
              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <h4 className="text-xl font-black text-slate-800">3</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Courses</span>
                </div>
                <div className="bg-brand-50/50 rounded-2xl p-4 text-center border border-brand-100/50">
                  <h4 className="text-xl font-black text-brand-600">18.5</h4>
                  <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">Hours</span>
                </div>
                <div className="bg-amber-50/50 rounded-2xl p-4 text-center border border-amber-100/50">
                  <h4 className="text-xl font-black text-amber-500">2</h4>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Certs</span>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
