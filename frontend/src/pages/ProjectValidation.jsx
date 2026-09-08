import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, X, FileText, ChevronRight, ChevronLeft,
  Rocket, Trophy, Presentation, Check, Info,
  AlertTriangle, ThumbsUp, ThumbsDown, Lightbulb,
  HelpCircle, RefreshCw, ArrowLeft, Loader2, Search
} from 'lucide-react';

// ---------------------------------------------------------------------------
// FileDropzone (unchanged)
// ---------------------------------------------------------------------------

const FileDropzone = ({ label, acceptedTypes, file, onFileChange }) => {
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onFileChange(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <div
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 ease-in-out
          ${file ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:border-brand-400 bg-slate-50 hover:bg-slate-100'}
          cursor-pointer flex flex-col items-center justify-center text-center`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept={acceptedTypes}
          className="hidden"
        />
        
        {file ? (
          <div className="flex items-center justify-between w-full max-w-sm bg-white p-4 rounded-xl shadow-sm border border-brand-200">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2 bg-brand-100 text-brand-600 rounded-lg shrink-0">
                <FileText size={20} />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title="Remove file"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 mb-3 group-hover:text-brand-500 group-hover:border-brand-200 transition-colors">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500">Accepted: {acceptedTypes}</p>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProjectValidation() {
  const [mode, setMode] = useState('selection'); // 'selection' | 'hackathon' | 'startup' | 'loading' | 'results' | 'error'
  const navigate = useNavigate();

  // Evaluation state
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluationError, setEvaluationError] = useState('');
  const [evaluationType, setEvaluationType] = useState(''); // 'hackathon' | 'startup'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Score ring animation
  const [animateScore, setAnimateScore] = useState(false);
  useEffect(() => {
    if (mode === 'results') {
      const timer = setTimeout(() => setAnimateScore(true), 150);
      return () => clearTimeout(timer);
    }
    setAnimateScore(false);
  }, [mode]);

  const categories = [
    "Agriculture", "Healthcare", "Education", "FinTech", "Environment",
    "AI / Machine Learning", "Cybersecurity", "Social Impact", "Smart City", "Other"
  ];

  const startupStages = [
    "Idea", "Prototype", "MVP", "Beta", "Launched"
  ];

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------

  const getScoreColor = (score) => {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ff6b6b';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Average';
    if (score >= 35) return 'Needs Work';
    return 'Critical';
  };

  const getScoreBg = (score) => {
    if (score >= 75) return 'bg-emerald-50';
    if (score >= 50) return 'bg-amber-50';
    return 'bg-red-50';
  };

  const severityConfig = {
    critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  };

  const findingTypeConfig = {
    missing: { bg: 'bg-slate-100', text: 'text-slate-700' },
    risk: { bg: 'bg-red-50', text: 'text-red-600' },
    weakness: { bg: 'bg-orange-50', text: 'text-orange-600' },
    strength: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    inconsistency: { bg: 'bg-purple-50', text: 'text-purple-600' },
    recommendation: { bg: 'bg-blue-50', text: 'text-blue-600' },
  };

  // ---------------------------------------------------------------------------
  // HACKATHON STATE & LOGIC
  // ---------------------------------------------------------------------------

  const [hackathonData, setHackathonData] = useState({
    projectName: '',
    category: '',
    problemStatement: '',
    solutionDescription: '',
    deployedUrl: '',
    githubUrl: '',
    hackathonName: '',
    challengeDetails: '',
    // Optional fields for richer API evaluation
    targetUsers: '',
    technologyStack: '',
    innovation: '',
    expectedImpact: '',
  });
  const [hackathonFiles, setHackathonFiles] = useState({
    guidelines: null,
    evaluationCriteria: null,
    officialProblem: null,
  });
  const [hackathonErrors, setHackathonErrors] = useState({});

  const handleHackathonChange = (e) => {
    const { name, value } = e.target;
    setHackathonData(prev => ({ ...prev, [name]: value }));
    if (hackathonErrors[name]) setHackathonErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleHackathonSubmit = async () => {
    const errors = {};
    if (!hackathonData.projectName.trim()) errors.projectName = 'Project name is required';
    if (!hackathonData.category) errors.category = 'Category is required';
    if (!hackathonData.problemStatement.trim()) errors.problemStatement = 'Problem statement is required';
    if (!hackathonData.solutionDescription.trim()) errors.solutionDescription = 'Solution description is required';

    if (Object.keys(errors).length > 0) {
      setHackathonErrors(errors);
      return;
    }

    setEvaluationType('hackathon');
    setMode('loading');
    setEvaluationResult(null);
    setEvaluationError('');

    // Build additional_information from optional context fields
    const additionalParts = [
      hackathonData.hackathonName && `Hackathon: ${hackathonData.hackathonName}`,
      hackathonData.challengeDetails && `Challenge Details: ${hackathonData.challengeDetails}`,
      hackathonData.category && `Category: ${hackathonData.category}`,
      hackathonData.deployedUrl && `Deployed URL: ${hackathonData.deployedUrl}`,
      hackathonData.githubUrl && `GitHub: ${hackathonData.githubUrl}`,
    ].filter(Boolean).join('\n');

    const body = {
      project_type: 'hackathon',
      project_name: hackathonData.projectName.trim(),
      problem_statement: hackathonData.problemStatement.trim(),
      solution_description: hackathonData.solutionDescription.trim(),
      target_users: hackathonData.targetUsers.trim() || 'Not specified',
      technology_stack: hackathonData.technologyStack.trim() || 'Not specified',
      innovation: hackathonData.innovation.trim() || 'Not specified',
      // Fallback to solution_description per user's approved mapping
      implementation: hackathonData.solutionDescription.trim(),
      impact: hackathonData.expectedImpact.trim() || 'Not specified',
      business_model: '',
      competitors: '',
      additional_information: additionalParts || '',
      deployed_url: hackathonData.deployedUrl.trim() || '',
      github_url: hackathonData.githubUrl.trim() || '',
    };

    await submitEvaluation(body);
  };

  // ---------------------------------------------------------------------------
  // STARTUP STATE & LOGIC
  // ---------------------------------------------------------------------------

  const [startupData, setStartupData] = useState({
    projectName: '',
    category: '',
    problem: '',
    solution: '',
    targetUsers: '',
    uniqueValue: '',
    websiteUrl: '',
    githubUrl: '',
    businessModel: '',
    currentStage: '',
    // Optional fields for richer API evaluation
    technologyStack: '',
    implementationPlan: '',
    expectedImpact: '',
    competitors: '',
  });
  const [startupFiles, setStartupFiles] = useState({
    pitchDeck: null,
    businessPlan: null,
    marketResearch: null,
    productDemo: null,
  });
  const [startupErrors, setStartupErrors] = useState({});

  const handleStartupChange = (e) => {
    const { name, value } = e.target;
    setStartupData(prev => ({ ...prev, [name]: value }));
    if (startupErrors[name]) setStartupErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleStartupSubmit = async () => {
    const errors = {};
    if (!startupData.projectName.trim()) errors.projectName = 'Project name is required';
    if (!startupData.category) errors.category = 'Category is required';
    if (!startupData.problem.trim()) errors.problem = 'Problem is required';
    if (!startupData.solution.trim()) errors.solution = 'Solution is required';
    if (!startupData.targetUsers.trim()) errors.targetUsers = 'Target users are required';

    if (Object.keys(errors).length > 0) {
      setStartupErrors(errors);
      return;
    }

    setEvaluationType('startup');
    setMode('loading');
    setEvaluationResult(null);
    setEvaluationError('');

    // Build additional_information from optional context fields
    const additionalParts = [
      startupData.currentStage && `Current Stage: ${startupData.currentStage}`,
      startupData.category && `Category: ${startupData.category}`,
      startupData.websiteUrl && `Website: ${startupData.websiteUrl}`,
      startupData.githubUrl && `GitHub: ${startupData.githubUrl}`,
    ].filter(Boolean).join('\n');

    const body = {
      project_type: 'startup',
      project_name: startupData.projectName.trim(),
      problem_statement: startupData.problem.trim(),
      solution_description: startupData.solution.trim(),
      target_users: startupData.targetUsers.trim(),
      technology_stack: startupData.technologyStack.trim() || 'Not specified',
      innovation: startupData.uniqueValue.trim() || 'Not specified',
      // Fallback to solution if implementation plan not provided
      implementation: startupData.implementationPlan.trim() || startupData.solution.trim(),
      impact: startupData.expectedImpact.trim() || 'Not specified',
      business_model: startupData.businessModel.trim() || '',
      competitors: startupData.competitors.trim() || '',
      additional_information: additionalParts || '',
      deployed_url: startupData.websiteUrl.trim() || '',
      github_url: startupData.githubUrl.trim() || '',
    };

    await submitEvaluation(body);
  };

  // ---------------------------------------------------------------------------
  // Shared submission logic
  // ---------------------------------------------------------------------------

  const submitEvaluation = async (body) => {
    const EVALUATE_URL = 'http://localhost:8000/api/projects/evaluate';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      console.log('[BuddyJudge] Submitting evaluation:', body.project_type, body.project_name);

      const res = await fetch(EVALUATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        let errorMessage = `Server error (${res.status})`;
        try {
          const errData = await res.json();
          if (Array.isArray(errData?.detail)) {
            // Pydantic validation errors
            errorMessage = 'Validation error: ' + errData.detail.map(e => e.msg).join('. ');
          } else if (typeof errData?.detail === 'object' && errData.detail?.error) {
            errorMessage = errData.detail.error;
          } else if (typeof errData?.detail === 'string') {
            errorMessage = errData.detail;
          }
        } catch {
          // Response wasn't JSON — use default message
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log('[BuddyJudge] Evaluation received:', data.judge_readiness_score);
      setEvaluationResult(data);
      setMode('results');
    } catch (err) {
      console.error('[BuddyJudge] Evaluation error:', err);

      if (err.name === 'AbortError') {
        setEvaluationError(
          'The evaluation timed out. The AI model might be under heavy load — please try again in a moment.'
        );
      } else if (
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('ERR_CONNECTION_REFUSED')
      ) {
        setEvaluationError(
          'Could not connect to the BuddyJudge backend. Make sure the FastAPI server is running on port 8000.'
        );
      } else {
        setEvaluationError(err.message || 'An unexpected error occurred. Please try again.');
      }
      setMode('error');
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const handleRetry = () => {
    if (evaluationType === 'hackathon') {
      handleHackathonSubmit();
    } else {
      handleStartupSubmit();
    }
  };

  const handleBackToForm = () => {
    setMode(evaluationType || 'selection');
    setEvaluationError('');
  };

  const handleJudgeAnother = () => {
    setHackathonData({
      projectName: '', category: '', problemStatement: '', solutionDescription: '',
      deployedUrl: '', githubUrl: '', hackathonName: '', challengeDetails: '',
      targetUsers: '', technologyStack: '', innovation: '', expectedImpact: '',
    });
    setStartupData({
      projectName: '', category: '', problem: '', solution: '', targetUsers: '',
      uniqueValue: '', websiteUrl: '', githubUrl: '', businessModel: '', currentStage: '',
      technologyStack: '', implementationPlan: '', expectedImpact: '', competitors: '',
    });
    setHackathonFiles({ guidelines: null, evaluationCriteria: null, officialProblem: null });
    setStartupFiles({ pitchDeck: null, businessPlan: null, marketResearch: null, productDemo: null });
    setEvaluationResult(null);
    setEvaluationError('');
    setMode('selection');
  };

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  // ---------------------------------------------------------------------------
  // Selection screen (unchanged)
  // ---------------------------------------------------------------------------

  const renderSelection = () => (
    <div className="animate-fade-in w-full max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Rocket size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">
          Project Validation
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto">
          Choose how you want BuddyJudge to evaluate your work.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: Hackathon Judge */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-soft-card hover:shadow-lg hover:border-brand-200 transition-all flex flex-col group h-full">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Trophy size={28} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Hackathon Judge</h3>
          <p className="text-slate-600 mb-6 flex-grow">
            Evaluate your hackathon project against the problem statement, judging criteria and competition expectations.
          </p>
          <ul className="space-y-2 mb-8">
            {['Problem Alignment', 'Innovation', 'Technical Feasibility', 'Impact', 'Judge Questions'].map(tag => (
              <li key={tag} className="flex items-center text-sm font-medium text-slate-700">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                {tag}
              </li>
            ))}
          </ul>
          <button 
            onClick={() => setMode('hackathon')}
            className="w-full bg-slate-50 hover:bg-blue-600 text-blue-600 hover:text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-blue-100 hover:border-transparent mt-auto"
          >
            Judge My Hackathon Project
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Card 2: Startup Judge */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-soft-card hover:shadow-lg hover:border-brand-200 transition-all flex flex-col group h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Rocket size={28} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Startup Judge</h3>
          <p className="text-slate-600 mb-6 flex-grow">
            Evaluate your startup idea, product, market opportunity and competitive strength before presenting it.
          </p>
          <ul className="space-y-2 mb-8">
            {['Problem-Solution Fit', 'Market Potential', 'Competition', 'Scalability', 'Business Potential'].map(tag => (
              <li key={tag} className="flex items-center text-sm font-medium text-slate-700">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-2"></div>
                {tag}
              </li>
            ))}
          </ul>
          <button 
            onClick={() => setMode('startup')}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm mt-auto"
          >
            Judge My Startup
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Card 3: PPT Analyzer */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-soft-card hover:shadow-lg hover:border-brand-200 transition-all flex flex-col group h-full">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Presentation size={28} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">PPT Analyzer</h3>
          <p className="text-slate-600 mb-6 flex-grow">
            Analyze your presentation for content, structure, storytelling, visuals and judge readiness.
          </p>
          <ul className="space-y-2 mb-8">
            {['Slide Structure', 'Content Quality', 'Visual Quality', 'Storytelling', 'Missing Information'].map(tag => (
              <li key={tag} className="flex items-center text-sm font-medium text-slate-700">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></div>
                {tag}
              </li>
            ))}
          </ul>
          <button 
            onClick={() => navigate('/ppt-analyzer')}
            className="w-full bg-slate-50 hover:bg-purple-600 text-purple-600 hover:text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-purple-100 hover:border-transparent mt-auto"
          >
            Analyze My PPT
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Hackathon form (with new optional fields)
  // ---------------------------------------------------------------------------

  const renderHackathonForm = () => (
    <div className="animate-fade-in w-full max-w-3xl mx-auto">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Trophy size={24} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Hackathon Project Judge</h2>
        <p className="text-slate-500">
          Tell BuddyJudge about your project and we'll evaluate how competition-ready it is.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-soft-card mb-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="projectName"
                value={hackathonData.projectName}
                onChange={handleHackathonChange}
                className={`w-full px-4 py-3 rounded-xl border ${hackathonErrors.projectName ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all`}
              />
              {hackathonErrors.projectName && <p className="mt-1 text-sm text-red-500">{hackathonErrors.projectName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={hackathonData.category}
                onChange={handleHackathonChange}
                className={`w-full px-4 py-3 rounded-xl border ${hackathonErrors.category ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all bg-white`}
              >
                <option value="" disabled>Select a category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {hackathonErrors.category && <p className="mt-1 text-sm text-red-500">{hackathonErrors.category}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Problem Statement <span className="text-red-500">*</span>
            </label>
            <textarea
              name="problemStatement"
              rows="3"
              value={hackathonData.problemStatement}
              onChange={handleHackathonChange}
              className={`w-full px-4 py-3 rounded-xl border ${hackathonErrors.problemStatement ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all resize-y`}
            />
            {hackathonErrors.problemStatement && <p className="mt-1 text-sm text-red-500">{hackathonErrors.problemStatement}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Solution Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="solutionDescription"
              rows="4"
              value={hackathonData.solutionDescription}
              onChange={handleHackathonChange}
              className={`w-full px-4 py-3 rounded-xl border ${hackathonErrors.solutionDescription ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all resize-y`}
            />
            {hackathonErrors.solutionDescription && <p className="mt-1 text-sm text-red-500">{hackathonErrors.solutionDescription}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Deployed Website URL <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                name="deployedUrl"
                value={hackathonData.deployedUrl}
                onChange={handleHackathonChange}
                placeholder="https://"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                GitHub Repository <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                name="githubUrl"
                value={hackathonData.githubUrl}
                onChange={handleHackathonChange}
                placeholder="https://github.com/..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Hackathon Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="hackathonName"
                value={hackathonData.hackathonName}
                onChange={handleHackathonChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Challenge Details <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="challengeDetails"
                value={hackathonData.challengeDetails}
                onChange={handleHackathonChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* --- New optional fields for richer AI evaluation --- */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">AI Evaluation Details</h3>
            <p className="text-sm text-slate-400 mb-4">These help BuddyJudge give you a more accurate evaluation.</p>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Target Users <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="targetUsers"
                    value={hackathonData.targetUsers}
                    onChange={handleHackathonChange}
                    placeholder="e.g. Students, Farmers, Healthcare workers"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Technology Stack <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="technologyStack"
                    value={hackathonData.technologyStack}
                    onChange={handleHackathonChange}
                    placeholder="e.g. React, Python, TensorFlow"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  What Makes It Innovative? <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  name="innovation"
                  rows="2"
                  value={hackathonData.innovation}
                  onChange={handleHackathonChange}
                  placeholder="What's unique about your approach compared to existing solutions?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Expected Impact <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  name="expectedImpact"
                  rows="2"
                  value={hackathonData.expectedImpact}
                  onChange={handleHackathonChange}
                  placeholder="e.g. Reduce water waste by 40% in urban households"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all resize-y"
                />
              </div>
            </div>
          </div>

          {/* Competition Evidence (unchanged) */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Competition Evidence <span className="text-sm text-slate-400 font-normal ml-2">(Optional)</span></h3>
            <FileDropzone 
              label="Upload Hackathon Guidelines" 
              acceptedTypes=".pdf,.docx"
              file={hackathonFiles.guidelines}
              onFileChange={(f) => setHackathonFiles(prev => ({...prev, guidelines: f}))}
            />
            <FileDropzone 
              label="Upload Evaluation Criteria" 
              acceptedTypes=".pdf,.docx"
              file={hackathonFiles.evaluationCriteria}
              onFileChange={(f) => setHackathonFiles(prev => ({...prev, evaluationCriteria: f}))}
            />
            <FileDropzone 
              label="Upload Official Problem Statement" 
              acceptedTypes=".pdf,.docx"
              file={hackathonFiles.officialProblem}
              onFileChange={(f) => setHackathonFiles(prev => ({...prev, officialProblem: f}))}
            />
          </div>
        </div>

        <div className="pt-8 mt-6 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setMode('selection')}
            className="text-slate-500 hover:text-slate-800 font-semibold py-3 px-4 rounded-xl flex items-center gap-2 transition-all hover:bg-slate-50"
          >
            <ChevronLeft size={20} />
            Back
          </button>
          <button
            onClick={handleHackathonSubmit}
            disabled={isSubmitting}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
          >
            {isSubmitting ? 'Evaluating...' : 'Evaluate My Project'}
            {!isSubmitting && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Startup form (with new optional fields)
  // ---------------------------------------------------------------------------

  const renderStartupForm = () => (
    <div className="animate-fade-in w-full max-w-3xl mx-auto">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-4">
          <Rocket size={24} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Startup Project Judge</h2>
        <p className="text-slate-500">
          See how strong your startup idea is from a product, market and business perspective.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-soft-card mb-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Startup / Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="projectName"
                value={startupData.projectName}
                onChange={handleStartupChange}
                className={`w-full px-4 py-3 rounded-xl border ${startupErrors.projectName ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all`}
              />
              {startupErrors.projectName && <p className="mt-1 text-sm text-red-500">{startupErrors.projectName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={startupData.category}
                onChange={handleStartupChange}
                className={`w-full px-4 py-3 rounded-xl border ${startupErrors.category ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all bg-white`}
              >
                <option value="" disabled>Select a category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {startupErrors.category && <p className="mt-1 text-sm text-red-500">{startupErrors.category}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Problem <span className="text-red-500">*</span>
            </label>
            <textarea
              name="problem"
              rows="3"
              value={startupData.problem}
              onChange={handleStartupChange}
              className={`w-full px-4 py-3 rounded-xl border ${startupErrors.problem ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all resize-y`}
            />
            {startupErrors.problem && <p className="mt-1 text-sm text-red-500">{startupErrors.problem}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Solution <span className="text-red-500">*</span>
            </label>
            <textarea
              name="solution"
              rows="4"
              value={startupData.solution}
              onChange={handleStartupChange}
              className={`w-full px-4 py-3 rounded-xl border ${startupErrors.solution ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all resize-y`}
            />
            {startupErrors.solution && <p className="mt-1 text-sm text-red-500">{startupErrors.solution}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Target Users <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="targetUsers"
              value={startupData.targetUsers}
              onChange={handleStartupChange}
              className={`w-full px-4 py-3 rounded-xl border ${startupErrors.targetUsers ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'} outline-none focus:ring-4 transition-all`}
            />
            {startupErrors.targetUsers && <p className="mt-1 text-sm text-red-500">{startupErrors.targetUsers}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Unique Value Proposition <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              name="uniqueValue"
              rows="2"
              value={startupData.uniqueValue}
              onChange={handleStartupChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Website URL <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                name="websiteUrl"
                value={startupData.websiteUrl}
                onChange={handleStartupChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                GitHub Repository <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                name="githubUrl"
                value={startupData.githubUrl}
                onChange={handleStartupChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Business Model <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="businessModel"
                value={startupData.businessModel}
                onChange={handleStartupChange}
                placeholder="e.g. B2B SaaS, Freemium"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Current Stage <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                name="currentStage"
                value={startupData.currentStage}
                onChange={handleStartupChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all bg-white"
              >
                <option value="">Select current stage</option>
                {startupStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </div>
          </div>

          {/* --- New optional fields for richer AI evaluation --- */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">AI Evaluation Details</h3>
            <p className="text-sm text-slate-400 mb-4">These help BuddyJudge give you a more accurate evaluation.</p>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Technology Stack <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="technologyStack"
                    value={startupData.technologyStack}
                    onChange={handleStartupChange}
                    placeholder="e.g. React, Node.js, PostgreSQL"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Competitors <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="competitors"
                    value={startupData.competitors}
                    onChange={handleStartupChange}
                    placeholder="e.g. Company A, Company B"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Implementation Plan <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  name="implementationPlan"
                  rows="2"
                  value={startupData.implementationPlan}
                  onChange={handleStartupChange}
                  placeholder="How will the solution be built and delivered?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Expected Impact <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  name="expectedImpact"
                  rows="2"
                  value={startupData.expectedImpact}
                  onChange={handleStartupChange}
                  placeholder="What measurable impact will your startup have?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all resize-y"
                />
              </div>
            </div>
          </div>
          
          {/* Evidence (unchanged) */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Evidence <span className="text-sm text-slate-400 font-normal ml-2">(Optional)</span></h3>
            <FileDropzone 
              label="Pitch Deck" 
              acceptedTypes=".pdf,.ppt,.pptx"
              file={startupFiles.pitchDeck}
              onFileChange={(f) => setStartupFiles(prev => ({...prev, pitchDeck: f}))}
            />
            <FileDropzone 
              label="Business Plan" 
              acceptedTypes=".pdf,.docx"
              file={startupFiles.businessPlan}
              onFileChange={(f) => setStartupFiles(prev => ({...prev, businessPlan: f}))}
            />
            <FileDropzone 
              label="Market Research" 
              acceptedTypes=".pdf,.docx"
              file={startupFiles.marketResearch}
              onFileChange={(f) => setStartupFiles(prev => ({...prev, marketResearch: f}))}
            />
            <FileDropzone 
              label="Product Demo (Video/Link in PDF)" 
              acceptedTypes=".pdf,.mp4"
              file={startupFiles.productDemo}
              onFileChange={(f) => setStartupFiles(prev => ({...prev, productDemo: f}))}
            />
          </div>
        </div>

        <div className="pt-8 mt-6 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setMode('selection')}
            className="text-slate-500 hover:text-slate-800 font-semibold py-3 px-4 rounded-xl flex items-center gap-2 transition-all hover:bg-slate-50"
          >
            <ChevronLeft size={20} />
            Back
          </button>
          <button
            onClick={handleStartupSubmit}
            disabled={isSubmitting}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
          >
            {isSubmitting ? 'Evaluating...' : 'Evaluate My Startup'}
            {!isSubmitting && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Loading screen
  // ---------------------------------------------------------------------------

  const renderLoading = () => (
    <div className="animate-fade-in w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-20">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center shadow-sm">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
        </div>
        <div className="absolute inset-0 w-24 h-24 bg-brand-200 rounded-full animate-ping opacity-20" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-800 mb-3">Analyzing your project...</h2>
      <p className="text-slate-500 text-lg mb-8">BuddyJudge is thinking like a judge.</p>
      <div className="flex gap-1.5 mb-8">
        <span className="w-2.5 h-2.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <span className="w-2.5 h-2.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
        <span className="w-2.5 h-2.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
      </div>
      <p className="text-sm text-slate-400 italic">This may take 15–30 seconds depending on the AI model.</p>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Error screen
  // ---------------------------------------------------------------------------

  const renderError = () => (
    <div className="animate-fade-in w-full max-w-xl mx-auto flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-800 mb-3 text-center">Evaluation Failed</h2>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 w-full mb-8">
        <p className="text-red-700 text-sm leading-relaxed text-center">{evaluationError}</p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={handleBackToForm}
          className="text-slate-500 hover:text-slate-800 font-semibold py-3 px-5 rounded-xl flex items-center gap-2 transition-all hover:bg-slate-50 border border-slate-200"
        >
          <ArrowLeft size={18} />
          Back to Form
        </button>
        <button
          onClick={handleRetry}
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
        >
          <RefreshCw size={18} />
          Try Again
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Results screen
  // ---------------------------------------------------------------------------

  const renderResults = () => {
    if (!evaluationResult) return null;

    const r = evaluationResult;
    const score = r.judge_readiness_score;
    const circumference = 2 * Math.PI * 50;
    const offset = animateScore ? circumference - (score / 100) * circumference : circumference;
    const scoreColor = getScoreColor(score);

    return (
      <div className="animate-fade-in w-full max-w-4xl mx-auto space-y-6 pb-12">

        {/* --- Header --- */}
        <div className="text-center mb-2">
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Trophy size={24} />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2">Evaluation Results</h1>
          <p className="text-slate-500">BuddyJudge AI Analysis — {evaluationType === 'hackathon' ? 'Hackathon' : 'Startup'} Project</p>
        </div>

        {/* --- A. Judge Readiness Score --- */}
        <div className={`bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-soft-card flex flex-col md:flex-row items-center gap-8`}>
          <div className="relative shrink-0">
            <svg className="w-40 h-40 md:w-48 md:h-48" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke={scoreColor} strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl md:text-5xl font-extrabold" style={{ color: scoreColor }}>
                {score.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/100</span>
            </div>
          </div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Judge Readiness Score</h2>
            <div className={`inline-block px-3 py-1 rounded-lg text-sm font-bold mb-3 ${getScoreBg(score)}`} style={{ color: scoreColor }}>
              {getScoreLabel(score)}
            </div>
            <p className="text-slate-500 text-sm">
              This score reflects how prepared your project is for evaluation by a panel of judges — not a prediction of winning.
            </p>
          </div>
        </div>

        {/* --- B. Overall Summary --- */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <Info size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Overall Summary</h3>
          </div>
          <p className="text-slate-600 leading-relaxed">{r.overall_summary}</p>
        </div>

        {/* --- C. Criteria Scores --- */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Trophy size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Criteria Scores</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {r.scores.map((s, idx) => {
              const barColor = getScoreColor(s.score * 10);
              return (
                <div key={idx} className="border border-slate-100 rounded-2xl p-4 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-sm">{s.criterion}</span>
                    <span className="font-bold text-sm" style={{ color: barColor }}>
                      {s.score.toFixed(1)}/10
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                    <div
                      className="h-2 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(s.score / 10) * 100}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed mb-2">{s.explanation}</p>
                  {s.evidence && s.evidence.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-50">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Evidence</p>
                      <ul className="space-y-1">
                        {s.evidence.map((e, eIdx) => (
                          <li key={eIdx} className="text-xs text-slate-500 flex items-start gap-1.5">
                            <span className="text-brand-400 mt-0.5 shrink-0">•</span>
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* --- D & E. Strengths & Weaknesses (side by side) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                <ThumbsUp size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {r.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3 bg-emerald-50/50 p-3 rounded-xl">
                  <Check className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span className="text-slate-700 text-sm leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                <ThumbsDown size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Weaknesses</h3>
            </div>
            <ul className="space-y-3">
              {r.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-3 bg-red-50/50 p-3 rounded-xl">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <span className="text-slate-700 text-sm leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* --- F. Recommendations --- */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <Lightbulb size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Recommendations</h3>
          </div>
          <ul className="space-y-3">
            {r.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 bg-brand-50/30 p-3 rounded-xl">
                <Lightbulb className="text-brand-500 shrink-0 mt-0.5" size={16} />
                <span className="text-slate-700 text-sm leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* --- G. Potential Judge Questions --- */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <HelpCircle size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Potential Judge Questions</h3>
          </div>
          <ul className="space-y-3">
            {r.judge_questions.map((q, i) => (
              <li key={i} className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-slate-700 text-sm leading-relaxed">{q}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* --- H. Findings --- */}
        {r.findings && r.findings.length > 0 && (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
                <Search size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Findings</h3>
              <span className="ml-auto bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                {r.findings.length} found
              </span>
            </div>
            <div className="space-y-4">
              {r.findings.map((f, i) => {
                const sev = severityConfig[f.severity] || severityConfig.medium;
                const ft = findingTypeConfig[f.finding_type] || findingTypeConfig.missing;
                return (
                  <div key={i} className="border border-slate-100 rounded-2xl p-4 hover:border-slate-200 transition-colors">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${sev.bg} ${sev.text}`}>
                        {f.severity?.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${ft.bg} ${ft.text}`}>
                        {f.finding_type?.replace('_', ' ')}
                      </span>
                      {f.source && (
                        <span className="text-xs text-slate-400 ml-auto">
                          Source: {f.source}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm mb-1">{f.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- Judge Another Project --- */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            onClick={handleJudgeAnother}
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
          >
            <RefreshCw size={18} />
            Judge Another Project
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  return (
    <div className="p-4 md:p-8 flex-1 w-full flex items-start justify-center min-h-[calc(100vh-80px)]">
      {mode === 'selection' && renderSelection()}
      {mode === 'hackathon' && renderHackathonForm()}
      {mode === 'startup' && renderStartupForm()}
      {mode === 'loading' && renderLoading()}
      {mode === 'error' && renderError()}
      {mode === 'results' && renderResults()}
    </div>
  );
}
