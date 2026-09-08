import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation, UploadCloud, X, FileText, ChevronLeft, ChevronRight, Check, Shield, AlertCircle } from 'lucide-react';

export default function PPTAnalyzer() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const fileInputRef = useRef(null);

  const [contextData, setContextData] = useState({
    presentationType: '',
    problemStatement: '',
    judgingCriteria: '',
    targetAudience: ''
  });

  const MAX_FILE_SIZE_MB = 20;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ACCEPTED_TYPES = '.ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (name) => {
    return name.slice((Math.max(0, name.lastIndexOf(".")) || Infinity) + 1).toUpperCase() || 'FILE';
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    if (!selectedFile) return;

    // Check size
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    // Since accept attribute doesn't perfectly catch all DND, do a manual check
    const validExtensions = ['PPT', 'PPTX', 'PDF'];
    const ext = getFileExtension(selectedFile.name);
    
    if (!validExtensions.includes(ext) && !selectedFile.type.includes('pdf') && !selectedFile.type.includes('powerpoint') && !selectedFile.type.includes('presentation')) {
      setError("Unsupported file format. Please upload a PPT, PPTX, or PDF.");
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleContextChange = (e) => {
    const { name, value } = e.target;
    setContextData(prev => ({ ...prev, [name]: value }));
  };

  const handleAnalyze = () => {
    if (file) {
      setIsSuccess(true);
    }
  };

  const checklist = [
    {
      title: "Content Quality",
      items: ["Problem clarity", "Solution clarity", "Completeness"]
    },
    {
      title: "Storytelling",
      items: ["Logical flow", "Narrative structure", "Persuasiveness"]
    },
    {
      title: "Visual Quality",
      items: ["Readability", "Text density", "Visual consistency"]
    },
    {
      title: "Technical Explanation",
      items: ["Architecture", "Technology", "Implementation clarity"]
    },
    {
      title: "Judge Readiness",
      items: ["Missing information", "Weak arguments", "Likely judge questions"]
    },
    {
      title: "Guideline Compliance",
      items: ["Required sections", "Problem alignment", "Evaluation criteria"]
    }
  ];

  if (isSuccess) {
    return (
      <div className="p-4 md:p-8 flex-1 w-full flex items-start justify-center min-h-[calc(100vh-80px)]">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-100 shadow-soft-card animate-fade-in text-center flex flex-col items-center max-w-2xl mx-auto mt-12 w-full">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <Check size={40} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Presentation ready for analysis</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
            AI analysis will be connected in the next development phase.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl w-full p-6 text-left mb-8 shadow-sm">
            <ul className="space-y-4">
              <li className="flex items-center text-slate-700 font-medium">
                <Check className="text-green-500 mr-3 shrink-0" size={20} />
                Presentation selected ({file?.name})
              </li>
              <li className="flex items-center text-slate-700 font-medium">
                <Check className="text-green-500 mr-3 shrink-0" size={20} />
                File format verified
              </li>
              <li className="flex items-center text-slate-700 font-medium">
                <Check className="text-green-500 mr-3 shrink-0" size={20} />
                Presentation context collected
              </li>
            </ul>
          </div>

          <button
            onClick={() => {
              setIsSuccess(false);
              setFile(null);
              setContextData({ presentationType: '', problemStatement: '', judgingCriteria: '', targetAudience: '' });
            }}
            className="text-brand-600 hover:text-brand-700 font-semibold hover:underline"
          >
            Analyze another presentation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 flex-1 w-full max-w-4xl mx-auto animate-fade-in pb-20">
      
      {/* Header */}
      <div className="mb-10 text-center">
        <button
          onClick={() => navigate('/project-validation')}
          className="inline-flex items-center text-slate-500 hover:text-slate-800 font-semibold mb-6 transition-colors"
        >
          <ChevronLeft size={20} className="mr-1" />
          Back to Project Validation
        </button>
        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Presentation size={32} />
        </div>
        <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
          AI Presentation Review
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">
          PPT Analyzer
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Get an AI-powered review of your presentation before you present it to judges, investors, or your audience.
        </p>
      </div>

      {/* Main Upload Area */}
      <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-soft-card mb-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Upload your presentation</h2>
          <p className="text-slate-500 mt-2">Upload your PPT, PPTX, or PDF and BuddyJudge will analyze your presentation.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start text-sm border border-red-100">
            <AlertCircle className="mr-2 shrink-0 mt-0.5" size={18} />
            {error}
          </div>
        )}

        {!file ? (
          <div
            className="border-2 border-dashed border-slate-200 hover:border-purple-400 bg-slate-50 hover:bg-slate-100 rounded-2xl p-10 transition-all duration-200 ease-in-out cursor-pointer flex flex-col items-center justify-center text-center group"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleChange}
              accept={ACCEPTED_TYPES}
              className="hidden"
            />
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 mb-4 group-hover:text-purple-500 group-hover:border-purple-200 transition-colors">
              <UploadCloud size={32} />
            </div>
            <p className="text-lg font-bold text-slate-800 mb-2">Drag & drop your file here</p>
            <p className="text-slate-500 mb-4">or <span className="text-purple-600 font-semibold underline decoration-purple-200 underline-offset-4">Browse files</span></p>
            <p className="text-xs text-slate-400 font-medium bg-white px-3 py-1 rounded-full border border-slate-100">
              Accepted: PPT, PPTX, PDF • Max {MAX_FILE_SIZE_MB}MB
            </p>
          </div>
        ) : (
          <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4 overflow-hidden w-full">
              <div className="p-4 bg-white text-purple-600 rounded-xl shrink-0 shadow-sm border border-purple-50">
                <FileText size={32} />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-lg font-bold text-slate-800 truncate" title={file.name}>{file.name}</p>
                <div className="flex items-center mt-1 space-x-2 text-sm text-slate-500 font-medium">
                  <span className="uppercase">{getFileExtension(file.name)}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0 justify-end mt-4 sm:mt-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-purple-600 hover:bg-purple-100 bg-white border border-purple-200 font-semibold py-2 px-4 rounded-xl transition-colors text-sm"
              >
                Replace file
              </button>
              <button
                onClick={() => { setFile(null); setError(null); }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100 rounded-xl transition-colors shrink-0"
                title="Remove file"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleChange}
              accept={ACCEPTED_TYPES}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Optional Context Area */}
      <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-soft-card mb-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Add context for a better analysis</h3>
          <p className="text-slate-500 mt-1">Optional information helps BuddyJudge evaluate your presentation against the right expectations.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Presentation Type
            </label>
            <select
              name="presentationType"
              value={contextData.presentationType}
              onChange={handleContextChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all bg-white"
            >
              <option value="">Select presentation type (Optional)</option>
              <option value="Hackathon">Hackathon</option>
              <option value="Startup Pitch">Startup Pitch</option>
              <option value="College Project">College Project</option>
              <option value="Research Presentation">Research Presentation</option>
              <option value="Business Presentation">Business Presentation</option>
              <option value="Academic Presentation">Academic Presentation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Problem Statement
            </label>
            <textarea
              name="problemStatement"
              rows="2"
              value={contextData.problemStatement}
              onChange={handleContextChange}
              placeholder="Paste the problem statement your presentation is addressing."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Judging Criteria / Requirements
            </label>
            <textarea
              name="judgingCriteria"
              rows="2"
              value={contextData.judgingCriteria}
              onChange={handleContextChange}
              placeholder="Paste judging criteria, evaluation requirements, or presentation guidelines."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Target Audience
            </label>
            <input
              type="text"
              name="targetAudience"
              value={contextData.targetAudience}
              onChange={handleContextChange}
              placeholder="Who will evaluate or watch this presentation?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Analysis Checklist */}
      <div className="mb-10">
        <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">What BuddyJudge will analyze</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {checklist.map((section, idx) => (
            <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 mr-2 shrink-0"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Section */}
      <div className="flex flex-col items-center mt-12 border-t border-slate-200 pt-10">
        <button
          onClick={handleAnalyze}
          disabled={!file}
          className={`w-full max-w-md font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm
            ${file 
              ? 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
        >
          Analyze My Presentation
          <ChevronRight size={20} />
        </button>

        {/* Trust Message */}
        <div className="mt-8 flex items-start max-w-md bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <Shield className="text-slate-400 mr-3 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-1">Your presentation stays under your control</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              BuddyJudge will only use the presentation and context you provide for the analysis.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
