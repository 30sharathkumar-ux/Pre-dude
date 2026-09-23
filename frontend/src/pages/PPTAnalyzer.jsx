import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Presentation, UploadCloud, X, FileText, ChevronLeft, ChevronRight,
  Check, Shield, AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp,
  HelpCircle, Lightbulb, ThumbsUp, ThumbsDown, AlertTriangle, Star,
  BookOpen, Layout, Target, Zap
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// In production VITE_API_BASE_URL is unset → empty string → same-origin /api/... paths.
// In local dev set VITE_API_BASE_URL=http://localhost:8000 in frontend/.env.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = '.pptx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation';
const VALID_EXTENSIONS = ['PPTX', 'PDF'];
const ANALYSIS_TIMEOUT_MS = 120_000;

// Loading stage messages shown during analysis
const LOADING_STAGES = [
  'Extracting slides…',
  'Checking template requirements…',
  'Evaluating content quality…',
  'Assessing judge readiness…',
  'Preparing recommendations…',
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileExtension = (name) =>
  (name?.slice((Math.max(0, name.lastIndexOf('.')) || Infinity) + 1) || 'FILE').toUpperCase();

const validateFile = (file) => {
  if (!file) return 'No file provided.';
  if (file.size === 0) return 'File is empty. Please upload a valid .pptx or .pdf file.';
  if (file.size > MAX_FILE_SIZE_BYTES)
    return `File is too large (${formatFileSize(file.size)}). Maximum is ${MAX_FILE_SIZE_MB} MB.`;
  const ext = getFileExtension(file.name);
  if (!VALID_EXTENSIONS.includes(ext))
    return `Unsupported format ".${ext.toLowerCase()}". Please upload a .pptx or .pdf file.`;
  return null;
};

const parseApiError = async (response) => {
  if (response.status === 413) return 'File is too large. Maximum size is 20 MB per file.';
  if (response.status === 408) return 'The analysis took too long. Please try again with a smaller presentation.';
  try {
    const data = await response.json();
    if (data?.detail && typeof data.detail === 'string') return data.detail;
    if (data?.detail?.error) return data.detail.error;
  } catch (_) { /* ignore */ }
  if (response.status === 400) return 'The presentation could not be read. Please check the file and try again.';
  if (response.status === 502) return 'The AI returned an unexpected response. Please try again.';
  if (response.status === 503) return 'The AI evaluation service is temporarily unavailable. Please try again in a few minutes.';
  return `Analysis failed (error ${response.status}). Please try again.`;
};

// ---------------------------------------------------------------------------
// ScoreRing – circular score display
// ---------------------------------------------------------------------------

const ScoreRing = ({ score, max = 100, size = 120, label, color = '#7c3aed' }) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score / max, 0), 1);
  const dash = pct * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="mt-[-72px] flex flex-col items-center pointer-events-none select-none" style={{ marginTop: -(size * 0.6) }}>
        <span className="text-2xl font-extrabold text-slate-800">{score.toFixed(1)}</span>
        <span className="text-xs text-slate-400 font-medium">/ {max}</span>
      </div>
      {label && <p className="mt-3 text-sm font-semibold text-slate-600 text-center">{label}</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ScoreBar – horizontal bar for criteria
// ---------------------------------------------------------------------------

const ScoreBar = ({ score, max = 10 }) => {
  const pct = Math.min(Math.max(score / max, 0), 1) * 100;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 w-12 text-right">{score.toFixed(1)}/{max}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StatusBadge – for requirement match status
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  matched:           { label: 'Met',           cls: 'bg-emerald-100 text-emerald-700', icon: Check },
  partially_matched: { label: 'Partial',        cls: 'bg-amber-100 text-amber-700',    icon: AlertTriangle },
  missing:           { label: 'Missing',        cls: 'bg-red-100 text-red-600',         icon: X },
  not_applicable:    { label: 'N/A',            cls: 'bg-slate-100 text-slate-500',     icon: null },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_applicable;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      {Icon && <Icon size={11} />}
      {cfg.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// SeverityBadge – for findings
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-700 border border-red-200' },
  high:     { label: 'High',     cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  medium:   { label: 'Medium',   cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  low:      { label: 'Low',      cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
};

const SeverityBadge = ({ severity }) => {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
};

// ---------------------------------------------------------------------------
// FindingIcon
// ---------------------------------------------------------------------------

const FINDING_ICONS = {
  missing:        { Icon: X,            cls: 'text-red-500 bg-red-50 border-red-100' },
  risk:           { Icon: AlertTriangle, cls: 'text-orange-500 bg-orange-50 border-orange-100' },
  weakness:       { Icon: ThumbsDown,   cls: 'text-amber-500 bg-amber-50 border-amber-100' },
  strength:       { Icon: ThumbsUp,     cls: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
  inconsistency:  { Icon: AlertCircle,  cls: 'text-purple-500 bg-purple-50 border-purple-100' },
  recommendation: { Icon: Lightbulb,   cls: 'text-blue-500 bg-blue-50 border-blue-100' },
};

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

const Section = ({ title, icon: Icon, count, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-soft-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 md:p-6 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          {Icon && <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><Icon size={17} /></div>}
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          {count != null && (
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
      </button>
      {open && <div className="px-5 md:px-6 pb-6">{children}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// FileUploadCard – reusable for both student + template
// ---------------------------------------------------------------------------

const FileUploadCard = ({ label, description, badge, file, onFileChange, onError, optional = false }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const processFile = useCallback((f) => {
    const err = validateFile(f);
    if (err) { onError(err); return; }
    onError(null);
    onFileChange(f);
  }, [onFileChange, onError]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold text-slate-700">{label}</label>
        {optional && (
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
        )}
      </div>
      {description && <p className="text-xs text-slate-500 mb-3 leading-relaxed">{description}</p>}

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-2xl p-7 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center group
            ${dragging ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-purple-400 bg-slate-50 hover:bg-slate-100'}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input type="file" ref={inputRef} onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }} accept={ACCEPTED_TYPES} className="hidden" />
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 border transition-colors
            ${dragging ? 'bg-purple-100 border-purple-300 text-purple-600' : 'bg-white border-slate-100 text-slate-400 group-hover:text-purple-500 group-hover:border-purple-200'}`}>
            <UploadCloud size={24} />
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">Drop file or <span className="text-purple-600 underline decoration-purple-300 underline-offset-2">browse</span></p>
          <p className="text-xs text-slate-400">PPTX, PDF • max {MAX_FILE_SIZE_MB} MB</p>
          {badge && <span className="mt-3 text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">{badge}</span>}
        </div>
      ) : (
        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-3 bg-white text-purple-600 rounded-xl shrink-0 shadow-sm border border-purple-100">
              <FileText size={22} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {getFileExtension(file.name)} · {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => inputRef.current?.click()}
              className="text-xs font-semibold text-purple-600 hover:bg-purple-100 bg-white border border-purple-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              Replace
            </button>
            <button
              onClick={() => { onFileChange(null); onError(null); }}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100 rounded-xl transition-colors"
              title="Remove"
            >
              <X size={16} />
            </button>
          </div>
          <input type="file" ref={inputRef} onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }} accept={ACCEPTED_TYPES} className="hidden" />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// LoadingView
// ---------------------------------------------------------------------------

const LoadingView = ({ hasTemplate }) => {
  const [stageIdx, setStageIdx] = useState(0);

  React.useEffect(() => {
    const stages = hasTemplate ? LOADING_STAGES : LOADING_STAGES.filter((_, i) => i !== 1);
    const interval = setInterval(() => {
      setStageIdx(prev => (prev + 1 < stages.length ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, [hasTemplate]);

  const stages = hasTemplate ? LOADING_STAGES : LOADING_STAGES.filter((_, i) => i !== 1);

  return (
    <div className="p-6 md:p-12 flex-1 w-full flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
          <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Presentation size={32} className="text-purple-500" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Analyzing your presentation…</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          BuddyJudge is extracting slides, evaluating content quality, and preparing judge-focused feedback.
          {hasTemplate && ' Checking template compliance too.'}
        </p>
        <div className="space-y-2">
          {stages.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 text-sm font-medium
              ${i < stageIdx ? 'text-emerald-600' : i === stageIdx ? 'text-purple-700 bg-purple-50 border border-purple-100' : 'text-slate-300'}`}>
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {i < stageIdx
                  ? <Check size={14} className="text-emerald-500" />
                  : i === stageIdx
                  ? <Loader2 size={14} className="animate-spin text-purple-500" />
                  : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
              </div>
              {s}
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-slate-400">This may take up to 2 minutes.</p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ResultView
// ---------------------------------------------------------------------------

const ResultView = ({ result, hasTemplate, onReset }) => {
  const { overall_score, overall_summary, template_compliance_score,
          scores = [], template_requirements = [], requirement_matches = [],
          slide_analysis = [], strengths = [], weaknesses = [],
          recommendations = [], judge_questions = [], findings = [] } = result;

  const overallColor = overall_score >= 70 ? '#10b981' : overall_score >= 40 ? '#f59e0b' : '#ef4444';
  const complianceColor = template_compliance_score >= 70 ? '#10b981' : template_compliance_score >= 40 ? '#f59e0b' : '#ef4444';

  // Map matches by requirement_id for easy lookup
  const matchMap = Object.fromEntries(requirement_matches.map(m => [m.requirement_id, m]));

  return (
    <div className="p-4 md:p-8 flex-1 w-full max-w-5xl mx-auto animate-fade-in pb-20">

      {/* Header bar */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">Analysis Complete</div>
          <h1 className="text-3xl font-extrabold text-slate-800">Presentation Report</h1>
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-xl transition-colors border border-slate-200"
        >
          <RefreshCw size={15} />
          Analyze Another
        </button>
      </div>

      {/* Score cards */}
      <div className={`grid ${hasTemplate ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-6 mb-8`}>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft-card p-6 flex flex-col items-center text-center">
          <ScoreRing score={overall_score} max={100} label="Overall Score" color={overallColor} />
          {overall_summary && (
            <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-sm">{overall_summary}</p>
          )}
        </div>

        {hasTemplate ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft-card p-6 flex flex-col items-center text-center">
            <ScoreRing score={template_compliance_score} max={100} label="Template Compliance" color={complianceColor} />
            <p className="mt-4 text-xs text-slate-400 leading-relaxed max-w-xs">
              Based on the reference template requirements.
            </p>
            {requirement_matches.length > 0 && (
              <div className="mt-4 flex gap-4 text-xs font-semibold">
                <span className="text-emerald-600">{requirement_matches.filter(m => m.status === 'matched').length} met</span>
                <span className="text-amber-600">{requirement_matches.filter(m => m.status === 'partially_matched').length} partial</span>
                <span className="text-red-500">{requirement_matches.filter(m => m.status === 'missing').length} missing</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center hidden sm:flex">
            <BookOpen size={32} className="text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-400">Template check not performed</p>
            <p className="text-xs text-slate-400 mt-1">Upload a reference template to check compliance.</p>
          </div>
        )}
      </div>

      <div className="space-y-5">

        {/* Criteria Scores */}
        {scores.length > 0 && (
          <Section title="Criteria Scores" icon={Target} count={scores.length} defaultOpen={true}>
            <div className="space-y-5">
              {scores.map((s) => (
                <div key={s.criterion}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-slate-700">{s.criterion}</span>
                  </div>
                  <ScoreBar score={s.score} max={10} />
                  {s.explanation && (
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{s.explanation}</p>
                  )}
                  {s.evidence && s.evidence.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {s.evidence.map((ev, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5 text-purple-300">→</span>{ev}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Template Requirements */}
        {hasTemplate && requirement_matches.length > 0 && (
          <Section title="Template Requirements" icon={Layout} count={requirement_matches.length} defaultOpen={true}>
            <div className="space-y-4">
              {requirement_matches.map((match) => {
                const req = template_requirements.find(r => r.requirement_id === match.requirement_id);
                return (
                  <div key={match.requirement_id}
                    className={`rounded-xl border p-4 transition-colors
                      ${match.status === 'matched' ? 'bg-emerald-50 border-emerald-100'
                      : match.status === 'partially_matched' ? 'bg-amber-50 border-amber-100'
                      : match.status === 'missing' ? 'bg-red-50 border-red-100'
                      : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{match.requirement_title || req?.title}</p>
                        {req?.description && <p className="text-xs text-slate-500 mt-0.5">{req.description}</p>}
                      </div>
                      <StatusBadge status={match.status} />
                    </div>
                    {match.explanation && (
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{match.explanation}</p>
                    )}
                    {match.matching_slides?.length > 0 && (
                      <p className="text-xs text-slate-400">
                        Found on slide{match.matching_slides.length > 1 ? 's' : ''}: {match.matching_slides.join(', ')}
                      </p>
                    )}
                    {match.recommendations?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {match.recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                            <Lightbulb size={11} className="shrink-0 mt-0.5" />{r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Findings */}
        {findings.length > 0 && (
          <Section title="Key Findings" icon={AlertCircle} count={findings.length} defaultOpen={true}>
            <div className="space-y-3">
              {findings.map((f, i) => {
                const cfg = FINDING_ICONS[f.finding_type] || FINDING_ICONS.recommendation;
                const { Icon } = cfg;
                return (
                  <div key={i} className={`rounded-xl border p-4 flex gap-3 ${cfg.cls}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cfg.cls}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-bold text-slate-800">{f.title}</p>
                        <SeverityBadge severity={f.severity} />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{f.description}</p>
                      {f.source && <p className="text-xs text-slate-400 mt-1 italic">Source: {f.source}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Strengths + Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {strengths.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ThumbsUp size={14} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Strengths</h3>
              </div>
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {weaknesses.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                  <ThumbsDown size={14} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Weaknesses</h3>
              </div>
              <ul className="space-y-2">
                {weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />{w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Judge Questions */}
        {judge_questions.length > 0 && (
          <Section title="Questions Judges May Ask" icon={HelpCircle} count={judge_questions.length} defaultOpen={true}>
            <div className="space-y-3">
              {judge_questions.map((q, i) => (
                <div key={i} className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Section title="Recommendations" icon={Lightbulb} count={recommendations.length} defaultOpen={true}>
            <div className="space-y-3">
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Slide Analysis */}
        {slide_analysis.length > 0 && (
          <Section title="Slide-by-Slide Analysis" icon={Presentation} count={slide_analysis.length} defaultOpen={false}>
            <div className="space-y-4">
              {slide_analysis.map((slide) => (
                <SlideCard key={slide.slide_number} slide={slide} />
              ))}
            </div>
          </Section>
        )}

      </div>

      {/* Reset button */}
      <div className="mt-12 flex justify-center">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold text-sm hover:underline"
        >
          <RefreshCw size={15} />
          Analyze Another Presentation
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SlideCard – collapsible per-slide
// ---------------------------------------------------------------------------

const SlideCard = ({ slide }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 text-xs font-bold flex items-center justify-center shrink-0">
            {slide.slide_number}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{slide.title || `Slide ${slide.slide_number}`}</p>
            {!open && slide.summary && (
              <p className="text-xs text-slate-400 truncate max-w-xs">{slide.summary}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!slide.content_present && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">No text</span>
          )}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {slide.summary && <p className="text-sm text-slate-600">{slide.summary}</p>}

          {slide.visual_elements_detected?.length > 0 && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
              <span className="font-semibold text-slate-600">Visual elements detected:</span>{' '}
              {slide.visual_elements_detected.join(', ')}
              {slide.visual_elements_detected.some(v => v.toLowerCase().includes('unverifiable')) && (
                <span className="ml-1 italic text-slate-400">(semantic content unverifiable by text extraction)</span>
              )}
            </div>
          )}

          {slide.strengths?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1.5">Strengths</p>
              <ul className="space-y-1">
                {slide.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <Check size={11} className="text-emerald-500 shrink-0 mt-0.5" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {slide.weaknesses?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-1.5">Needs improvement</p>
              <ul className="space-y-1">
                {slide.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <AlertTriangle size={11} className="text-red-400 shrink-0 mt-0.5" />{w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PPTAnalyzer() {
  const navigate = useNavigate();

  // Files
  const [studentFile, setStudentFile] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);

  // Errors (per-slot + global)
  const [studentError, setStudentError] = useState(null);
  const [templateError, setTemplateError] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Context fields
  const [contextData, setContextData] = useState({
    presentationType: '',
    problemStatement: '',
    judgingCriteria: '',
    targetAudience: '',
  });

  // Abort controller ref for cancellation
  const abortRef = useRef(null);

  const handleContextChange = (e) => {
    const { name, value } = e.target;
    setContextData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setStudentFile(null);
    setTemplateFile(null);
    setStudentError(null);
    setTemplateError(null);
    setGlobalError(null);
    setIsLoading(false);
    setResult(null);
  };

  const handleAnalyze = async () => {
    setGlobalError(null);

    // Frontend guard: student file required
    if (!studentFile) {
      setStudentError('Please upload your presentation before analyzing.');
      return;
    }
    if (studentError || templateError) return;

    setIsLoading(true);

    // Build FormData
    const form = new FormData();
    form.append('student_file', studentFile, studentFile.name);
    if (templateFile) form.append('template_file', templateFile, templateFile.name);
    if (contextData.presentationType) form.append('presentation_type', contextData.presentationType);
    if (contextData.problemStatement) form.append('problem_statement', contextData.problemStatement);
    if (contextData.judgingCriteria) form.append('judging_criteria', contextData.judgingCriteria);
    if (contextData.targetAudience) form.append('target_audience', contextData.targetAudience);

    // Abort controller
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}/api/ppt/analyze`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
        // Do NOT set Content-Type — browser must set multipart boundary
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const msg = await parseApiError(response);
        throw new Error(msg);
      }

      const data = await response.json();
      setResult(data);

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setGlobalError('The analysis took too long. Please try again with a smaller or simpler presentation.');
      } else if (!navigator.onLine || err.message === 'Failed to fetch') {
        setGlobalError('Could not reach BuddyJudge backend. Please check that the backend server is running.');
      } else {
        setGlobalError(err.message || "BuddyJudge couldn't analyze this presentation right now. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return <LoadingView hasTemplate={!!templateFile} />;
  }

  // ---------------------------------------------------------------------------
  // Render: result
  // ---------------------------------------------------------------------------
  if (result) {
    return <ResultView result={result} hasTemplate={!!templateFile} onReset={handleReset} />;
  }

  // ---------------------------------------------------------------------------
  // Render: upload form
  // ---------------------------------------------------------------------------

  const canAnalyze = !!studentFile && !studentError && !templateError;

  const checklist = [
    { icon: Target, title: 'Content Quality', items: ['Problem clarity', 'Solution clarity', 'Completeness'] },
    { icon: Zap, title: 'Innovation', items: ['Originality', 'Technical depth', 'Architecture'] },
    { icon: Layout, title: 'Visual Quality', items: ['Readability', 'Text density', 'Slide flow'] },
    { icon: Star, title: 'Judge Readiness', items: ['Missing info', 'Weak arguments', 'Likely questions'] },
    { icon: BookOpen, title: 'Storytelling', items: ['Logical flow', 'Narrative arc', 'Persuasiveness'] },
    { icon: Shield, title: 'Template Compliance', items: ['Required sections', 'Guideline alignment', 'Structure'] },
  ];

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
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">PPT Analyzer</h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Get an AI-powered review of your presentation — including slide-by-slide analysis, judge questions, and template compliance.
        </p>
      </div>

      {/* Global error */}
      {globalError && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-2xl flex items-start gap-3 border border-red-100 shadow-sm">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold text-sm">Analysis failed</p>
            <p className="text-sm mt-0.5">{globalError}</p>
          </div>
        </div>
      )}

      {/* Upload area */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Upload Presentations</h2>
          <p className="text-slate-500 text-sm mt-1">Your student presentation is required. The reference template is optional.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <FileUploadCard
              label="Your Presentation"
              description="Upload the PPTX or PDF you want BuddyJudge to evaluate."
              file={studentFile}
              onFileChange={setStudentFile}
              onError={setStudentError}
            />
            {studentError && (
              <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />{studentError}
              </div>
            )}
          </div>

          <div>
            <FileUploadCard
              label="Reference Template"
              description="Optional. Upload the organizer's official template so BuddyJudge can check whether your slides follow the required structure."
              badge="Enables template compliance"
              optional
              file={templateFile}
              onFileChange={setTemplateFile}
              onError={setTemplateError}
            />
            {templateError && (
              <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />{templateError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-soft-card mb-6">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-800">Add context <span className="text-slate-400 font-normal text-sm">(optional)</span></h3>
          <p className="text-slate-500 text-sm mt-1">Help BuddyJudge evaluate your presentation against the right expectations.</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Presentation Type</label>
            <select
              name="presentationType"
              value={contextData.presentationType}
              onChange={handleContextChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all bg-white text-sm"
            >
              <option value="">Select type (optional)</option>
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
            <label className="block text-sm font-semibold text-slate-700 mb-1">Problem Statement</label>
            <textarea
              name="problemStatement"
              rows={2}
              value={contextData.problemStatement}
              onChange={handleContextChange}
              placeholder="Paste the problem statement your presentation addresses."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all resize-y text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Judging Criteria / Requirements</label>
            <textarea
              name="judgingCriteria"
              rows={2}
              value={contextData.judgingCriteria}
              onChange={handleContextChange}
              placeholder="Paste judging criteria, evaluation requirements, or presentation guidelines."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all resize-y text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Target Audience</label>
            <input
              type="text"
              name="targetAudience"
              value={contextData.targetAudience}
              onChange={handleContextChange}
              placeholder="Who will evaluate or watch this presentation?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* What BuddyJudge will analyze */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-slate-800 mb-5 text-center">What BuddyJudge will analyze</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {checklist.map(({ icon: Icon, title, items }) => (
            <div key={title} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className="text-purple-500 shrink-0" />
                <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
              </div>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item} className="flex items-start text-xs text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-300 mt-1 mr-2 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col items-center border-t border-slate-200 pt-8">
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={`w-full max-w-md font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm
            ${canAnalyze
              ? 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
        >
          Analyze My Presentation
          <ChevronRight size={20} />
        </button>

        {!studentFile && (
          <p className="mt-3 text-xs text-slate-400">Upload your presentation to continue.</p>
        )}

        <div className="mt-8 flex items-start max-w-md bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <Shield className="text-slate-400 mr-3 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-1">Your presentation stays under your control</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              BuddyJudge uses only the presentation and context you provide. Files are not stored after analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
