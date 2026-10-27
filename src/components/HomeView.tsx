import React, { useRef, useState } from 'react';
import {
  FileText,
  BookOpen,
  ClipboardCheck,
  Target,
  BarChart2,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  Mic,
  CloudCheck,
  Youtube,
  Upload,
  Camera,
  Compass,
} from 'lucide-react';
import type { StudyDocument } from '../types/study';
import type { ActiveTab } from './Navbar';
import type { StudySubMode } from './StudyView';

interface HomeViewProps {
  documents: StudyDocument[];
  onUploadPdf: (file: File) => Promise<void>;
  onSubmitTextNotes: (title: string, rawText: string) => Promise<void>;
  onSubmitYouTubeUrl: (url: string) => Promise<void>;
  onSelectDocument: (
    doc: StudyDocument,
    targetMode?: StudySubMode
  ) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenVoiceTutor?: () => void;
  onOpenNotebookModal?: (tab?: 'scan' | 'voice' | 'notebook' | 'planner') => void;
  isProcessing: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

type UploadSourceTab = 'pdf' | 'notes' | 'youtube';

function formatRelativeTime(isoDate: string, index: number): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 2) return 'Last studied • Just now';
  if (diffMins < 60) return `Last studied • ${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24)
    return `Last studied • ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Last studied • 1 day ago';
  if (diffDays < 30) return `Last studied • ${diffDays} days ago`;
  return index === 0 ? 'Last studied • 2 hours ago' : `Last studied • ${index + 1} days ago`;
}

export const HomeView: React.FC<HomeViewProps> = ({
  documents,
  onUploadPdf,
  onSubmitTextNotes,
  onSubmitYouTubeUrl,
  onSelectDocument,
  onNavigateTab,
  onOpenVoiceTutor,
  onOpenNotebookModal,
  isProcessing,
  errorMessage,
  onClearError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceTab, setSourceTab] = useState<UploadSourceTab>('pdf');
  const [quickPasteText, setQuickPasteText] = useState('');
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadPdf(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onUploadPdf(file);
    }
  };

  const handleQuickPasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickPasteText.trim();
    if (!trimmed) {
      setPasteModalOpen(true);
      return;
    }
    const firstLine = trimmed.split('\n')[0]?.replace(/^[#*\-\s]+/, '').trim() || '';
    const autoTitle =
      firstLine.length >= 4 && firstLine.length <= 50
        ? firstLine
        : `Study Notes (${new Date().toLocaleDateString()})`;
    await onSubmitTextNotes(autoTitle, trimmed);
    setQuickPasteText('');
  };

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = youtubeUrlInput.trim();
    if (!trimmed) return;
    await onSubmitYouTubeUrl(trimmed);
  };

  const handleFullModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = customTitle.trim() || `Study Notes (${new Date().toLocaleDateString()})`;
    await onSubmitTextNotes(title, customNotes);
    setPasteModalOpen(false);
    setCustomTitle('');
    setCustomNotes('');
  };

  // Close Paste Notes modal on Escape
  React.useEffect(() => {
    if (!pasteModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPasteModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pasteModalOpen]);

  const visibleDocuments = showAllRecent ? documents : documents.slice(0, 3);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-[#FBFCFF] via-white to-[#F8FAFC]">
      {/* Ambient Google-colored Decorative Spheres (matching Reference Image 1) */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute -left-28 top-[300px] w-72 h-72 rounded-full opacity-90 hidden lg:block lm-ambient-glow"
        style={{
          background:
            'radial-gradient(circle at 35% 30%, #93C5FD 0%, #3B82F6 45%, #1D4ED8 85%, transparent 100%)',
          filter: 'blur(2px)',
          boxShadow: '0 25px 60px rgba(59, 130, 246, 0.26)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute -right-24 -bottom-24 w-96 h-96 rounded-full opacity-90 hidden lg:block lm-ambient-glow"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, #FDE047 0%, #FB923C 45%, #EA4335 85%, transparent 100%)',
          filter: 'blur(1px)',
          boxShadow: '0 25px 60px rgba(234, 67, 53, 0.22)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-0 top-24 w-80 h-80 rounded-full opacity-35 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #FDE047 0%, #86EFAC 50%, transparent 75%)',
        }}
      />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-12">
        {/* Hero Split Section matching Reference Image 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Multicolor Display Headline */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF6E0] border border-[#FDE68A]/70 text-xs font-semibold text-[#172033] shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#4285F4]" />
              <span>AI-Powered Study Companion</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight leading-[1.08] text-[#172033]">
              <span className="text-[#172033]">Upload. </span>
              <span className="text-[#4285F4]">Learn.</span>
              <br />
              <span className="text-[#EA4335]">Practice. </span>
              <span className="text-[#34A853]">Improve.</span>
            </h1>

            <div className="space-y-2">
              <p className="text-base sm:text-lg font-bold text-[#1A73E8] tracking-tight">
                What will you learn today?
              </p>
              <p className="text-base sm:text-[17px] text-[#64748B] max-w-[46ch] leading-relaxed font-normal">
                Turn your PDFs, handwritten notes, voice lectures, and YouTube videos into a personalized AI learning, practice, and creative experience.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onOpenNotebookModal?.('scan')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#E8F0FE] border border-slate-200/90 text-xs sm:text-sm font-semibold text-[#172033] hover:text-[#1A73E8] shadow-xs lm-btn-press cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#4285F4]" />
                <span>Scan Notes</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenNotebookModal?.('voice')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#FCE8E6] border border-slate-200/90 text-xs sm:text-sm font-semibold text-[#172033] hover:text-[#EA4335] shadow-xs lm-btn-press cursor-pointer"
              >
                <Mic className="w-4 h-4 text-[#EA4335]" />
                <span>Record Voice Note</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('explore')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#E6F4EA] border border-slate-200/90 text-xs sm:text-sm font-semibold text-[#172033] hover:text-[#137333] shadow-xs lm-btn-press cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[#34A853]" />
                <span>Browse Courses</span>
              </button>
            </div>
          </div>

          {/* Right Column: Translucent Floating-Document Artwork & 3 Feature Cards (matching Reference Image 1) */}
          <div className="lg:col-span-6 relative flex flex-col sm:flex-row items-center justify-center lg:justify-end gap-4 min-h-[250px]">
            {/* Ambient Glow Blobs behind glass cards */}
            <div
              aria-hidden="true"
              className="absolute left-8 w-64 h-64 rounded-full blur-2xl opacity-60 pointer-events-none lm-ambient-glow"
              style={{
                background:
                  'conic-gradient(from 45deg, #93C5FD, #FCA5A5, #FDE047, #86EFAC, #93C5FD)',
              }}
            />

            {/* Floating Translucent Document Stack (PDF + Video + Image + AI Sparkle) */}
            <div className="relative w-64 h-56 flex items-center justify-center shrink-0">
              {/* Orbital Ring SVG */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 280 220"
                fill="none"
              >
                <ellipse
                  cx="140"
                  cy="115"
                  rx="125"
                  ry="46"
                  transform="rotate(-14 140 115)"
                  stroke="url(#orbitGrad)"
                  strokeWidth="1.75"
                  strokeDasharray="260 60"
                />
                <path
                  d="M245 24L248 34L258 37L248 40L245 50L242 40L232 37L242 34L245 24Z"
                  fill="#4285F4"
                />
                <defs>
                  <linearGradient
                    id="orbitGrad"
                    x1="20"
                    y1="115"
                    x2="260"
                    y2="115"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#4285F4" stopOpacity="0.65" />
                    <stop offset="0.5" stopColor="#34A853" stopOpacity="0.45" />
                    <stop offset="1" stopColor="#4285F4" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Back Tilted Glass Video & Notes Card */}
              <div
                aria-hidden="true"
                style={{ '--lm-rot': '10deg' } as React.CSSProperties}
                className="lm-float-card relative w-36 h-44 rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 shadow-lg p-3.5 translate-x-9 -translate-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-5 rounded-md bg-[#EA4335] text-white flex items-center justify-center shadow-2xs">
                      <Youtube className="w-3.5 h-3.5" />
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200/80" />
                  <div className="h-2 w-5/6 rounded-full bg-slate-200/80" />
                  {/* Mini colorful chart bars */}
                  <div className="pt-2 flex items-end gap-1.5 h-9">
                    <div className="w-2.5 h-4 rounded-t bg-[#EA4335]/75" />
                    <div className="w-2.5 h-6 rounded-t bg-[#FBBC05]/85" />
                    <div className="w-2.5 h-7 rounded-t bg-[#34A853]/85" />
                    <div className="w-2.5 h-9 rounded-t bg-[#4285F4]" />
                  </div>
                </div>
                <div className="self-end w-10 h-10 rounded-xl bg-[#E6F4EA] border border-white flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-4 h-4 text-[#34A853]" />
                </div>
              </div>

              {/* Front Tilted Glass PDF Document Card */}
              <div
                aria-hidden="true"
                style={{ '--lm-rot': '-11deg', animationDelay: '0.8s' } as React.CSSProperties}
                className="lm-float-card absolute w-36 h-44 rounded-2xl bg-white/88 backdrop-blur-xl border border-white shadow-xl p-3.5 -translate-x-8 translate-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-[#EA4335] text-white text-[10px] font-bold tracking-wider shadow-2xs">
                    PDF
                  </span>
                  <div className="space-y-1.5 pt-1">
                    <div className="h-2 w-3/4 rounded-full bg-slate-300/85" />
                    <div className="h-2 w-full rounded-full bg-slate-200/90" />
                    <div className="h-2 w-5/6 rounded-full bg-slate-200/90" />
                    <div className="h-2 w-2/3 rounded-full bg-slate-200/90" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-full bg-blue-100" />
                  <div className="h-2 w-4/5 rounded-full bg-emerald-100" />
                </div>
              </div>
            </div>

            {/* 3 Interactive Floating Feature Cards on the Right (matching Reference Image 1) */}
            <div className="flex flex-col gap-2.5 z-10 w-full sm:w-auto min-w-[255px] max-w-xs">
              <button
                type="button"
                onClick={() => {
                  if (documents[0]) onSelectDocument(documents[0], 'explain');
                  else onNavigateTab('study');
                }}
                className="group flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/95 hover:bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)] text-left lm-card-interactive cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-[#E8F0FE] text-[#4285F4] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#172033] truncate">
                      Ask anything with Gemini
                    </p>
                    <p className="text-[11px] text-[#64748B] truncate">
                      Instant explanations &amp; Q&amp;A
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1A73E8] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenVoiceTutor) {
                    onOpenVoiceTutor();
                  } else if (documents[0]) {
                    onSelectDocument(documents[0], 'explain');
                  }
                }}
                className="group flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/95 hover:bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)] text-left lm-card-interactive cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-[#E6F4EA] text-[#34A853] flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#172033] truncate">
                      Learn with voice tutoring
                    </p>
                    <p className="text-[11px] text-[#64748B] truncate">
                      Natural, interactive audio guide
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#137333] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('dashboard')}
                className="group flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/95 hover:bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)] text-left lm-card-interactive cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-[#FEF7E0] text-[#D97706] flex items-center justify-center shrink-0">
                    <CloudCheck className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#172033] truncate">
                      Your progress is saved securely
                    </p>
                    <p className="text-[11px] text-[#64748B] truncate">
                      Synced to your account
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#D97706] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Prominent Central Upload, Paste-Notes & YouTube Lecture Card (matching Reference Image 1) */}
        <div className="relative mt-4 max-w-[740px] mx-auto">
          {/* Floating Multicolor Cloud Upload Icon on Top Edge */}
          <div className="flex justify-center -mb-6 relative z-20">
            <div className="w-16 h-14 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center">
              <svg
                width="44"
                height="34"
                viewBox="0 0 48 38"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M36.5 16.5C35.8 9.5 29.9 4 22.8 4C16.9 4 11.8 7.7 9.9 13C4.9 13.8 1 18.1 1 23.3C1 29.2 5.8 34 11.7 34H35.8C40.9 34 45 29.9 45 24.8C45 20.1 41.3 16.8 36.5 16.5Z"
                  stroke="url(#cloudGrad)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="white"
                />
                <path
                  d="M24 28V16M24 16L19 21M24 16L29 21"
                  stroke="#4285F4"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient
                    id="cloudGrad"
                    x1="2"
                    y1="6"
                    x2="44"
                    y2="34"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#34A853" />
                    <stop offset="0.33" stopColor="#FBBC05" />
                    <stop offset="0.66" stopColor="#EA4335" />
                    <stop offset="1" stopColor="#4285F4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`lm-rainbow-frame rounded-[30px] shadow-[0_20px_50px_rgba(66,133,244,0.10)] transition-all ${
              isDragOver ? 'ring-4 ring-blue-200 scale-[1.01]' : ''
            }`}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-[28px] p-3">
              <div className="border-2 border-dashed border-[#C7DDFD] rounded-[22px] px-5 sm:px-9 pt-8 pb-6 text-center space-y-4 bg-gradient-to-b from-blue-50/20 via-white to-emerald-50/15">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#64748B]">
                    Drag &amp; drop your file here, or click to upload
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#172033]">
                    Upload your study material
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    PDF (up to 20 pages), paste study notes, or import a public YouTube lecture
                  </p>
                </div>

                {/* 3 Source Action Buttons: Upload PDF | Paste Notes | YouTube Link */}
                <div
                  role="tablist"
                  aria-label="Study Material Source Type"
                  className="flex flex-wrap items-center justify-center gap-2.5 pt-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sourceTab === 'pdf'}
                    disabled={isProcessing}
                    onClick={() => {
                      setSourceTab('pdf');
                      fileInputRef.current?.click();
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all lm-btn-press cursor-pointer ${
                      sourceTab === 'pdf'
                        ? 'bg-[#1A73E8] text-white shadow-[0_6px_18px_rgba(26,115,232,0.28)]'
                        : 'bg-white border border-slate-200 text-[#172033] hover:bg-slate-50'
                    }`}
                  >
                    {isProcessing && sourceTab === 'pdf' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>Upload PDF</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={sourceTab === 'notes'}
                    onClick={() => {
                      setSourceTab('notes');
                      setPasteModalOpen(true);
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all lm-btn-press cursor-pointer ${
                      sourceTab === 'notes'
                        ? 'bg-[#1A73E8] text-white shadow-[0_6px_18px_rgba(26,115,232,0.28)]'
                        : 'bg-white border border-slate-200 text-[#172033] hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-[#4285F4]" />
                    <span>Paste Notes</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={sourceTab === 'youtube'}
                    onClick={() => setSourceTab('youtube')}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all lm-btn-press cursor-pointer ${
                      sourceTab === 'youtube'
                        ? 'bg-[#EA4335] text-white shadow-[0_6px_18px_rgba(234,67,53,0.25)]'
                        : 'bg-white border border-slate-200 text-[#172033] hover:bg-slate-50'
                    }`}
                  >
                    <Youtube className="w-4 h-4 text-[#EA4335]" />
                    <span>YouTube Link</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Upload PDF file"
                />

                {sourceTab === 'youtube' ? (
                  /* YouTube Lecture URL Input */
                  <div className="space-y-2.5 pt-1 max-w-xl mx-auto">
                    <form
                      onSubmit={handleYouTubeSubmit}
                      className="flex items-center gap-2 bg-[#F8FAFC] border border-slate-200/90 rounded-full pl-4 pr-1.5 py-1.5 focus-within:border-[#EA4335] focus-within:ring-2 focus-within:ring-red-100 transition-all"
                    >
                      <Youtube className="w-4 h-4 text-[#EA4335] shrink-0" />
                      <input
                        type="url"
                        value={youtubeUrlInput}
                        onChange={(e) => setYoutubeUrlInput(e.target.value)}
                        disabled={isProcessing}
                        placeholder="Paste public YouTube lecture URL (https://www.youtube.com/watch?v=...)"
                        aria-label="Paste public YouTube lecture URL"
                        className="w-full bg-transparent text-sm text-[#172033] placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isProcessing || !youtubeUrlInput.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EA4335] hover:bg-[#D93025] text-white text-xs font-semibold transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <span>Analyze Video</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Quick Paste Notes Input Row */
                  <form
                    onSubmit={handleQuickPasteSubmit}
                    className="flex items-center gap-2 max-w-xl mx-auto bg-[#F8FAFC] border border-slate-200/90 rounded-full pl-4 pr-1.5 py-1.5 focus-within:border-[#4285F4] focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                  >
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={quickPasteText}
                      onChange={(e) => setQuickPasteText(e.target.value)}
                      disabled={isProcessing}
                      placeholder="Or paste your study notes right here..."
                      aria-label="Paste your notes here"
                      className="w-full bg-transparent text-sm text-[#172033] placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      aria-label="Submit pasted notes"
                      className="w-8 h-8 rounded-full bg-[#4285F4] hover:bg-[#1A73E8] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {/* Supported Format Chips matching Reference Image 1 */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 text-xs text-[#64748B]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200/70 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <span className="px-1.5 py-0.2 rounded bg-[#EA4335] text-white text-[10px] font-bold">
                      PDF
                    </span>
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/70 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <span className="px-1.5 py-0.2 rounded bg-[#4285F4] text-white text-[10px] font-bold">
                      DOC
                    </span>
                    <span>Notes / Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenNotebookModal?.('scan')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/70 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <span className="px-1.5 py-0.2 rounded bg-[#34A853] text-white text-[10px] font-bold">
                      OCR
                    </span>
                    <span>Images</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceTab('youtube')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200/70 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <Youtube className="w-3.5 h-3.5 text-[#EA4335]" />
                    <span>YouTube Link</span>
                  </button>
                </div>

                {/* Validation / Friendly Error Alert with Retry Action */}
                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-left text-sm text-red-700"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#EA4335] shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onClearError();
                          if (sourceTab === 'pdf') fileInputRef.current?.click();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                      <button
                        type="button"
                        onClick={onClearError}
                        aria-label="Dismiss error"
                        className="text-red-500 hover:text-red-800 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Four Main Workspace Cards (Learn, Practice, Create, Explore) */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Learn */}
          <button
            type="button"
            onClick={() => {
              if (documents[0]) onSelectDocument(documents[0], 'explain');
              else onNavigateTab('study');
            }}
            className="group text-left rounded-2xl bg-[#F3F7FE] hover:bg-[#E8F0FE] p-4 flex items-start gap-3.5 lm-card-interactive border border-blue-100/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285F4]"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#DCE8FD] text-[#4285F4] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-[#172033]">Learn</h3>
              <p className="text-[13px] text-[#64748B] leading-snug">
                AI Tutor, Quick Revise sticky notes, flashcards &amp; mind maps
              </p>
            </div>
          </button>

          {/* 2. Practice */}
          <button
            type="button"
            onClick={() => onNavigateTab('practice')}
            className="group text-left rounded-2xl bg-[#FDF4F4] hover:bg-[#FCE8E6] p-4 flex items-start gap-3.5 lm-card-interactive border border-red-100/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285F4]"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#FADAD8] text-[#EA4335] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-[#172033]">Practice</h3>
              <p className="text-[13px] text-[#64748B] leading-snug">
                JEE, NEET, CUET, Board &amp; University Exam Simulator + Analytics
              </p>
            </div>
          </button>

          {/* 3. PDF Workspace */}
          <button
            type="button"
            onClick={() => onNavigateTab('pdf-workspace')}
            data-testid="home-card-pdf-workspace"
            className="group text-left rounded-2xl bg-[#FEF9EE] hover:bg-[#FEF3D6] p-4 flex items-start gap-3.5 lm-card-interactive border border-amber-100/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285F4]"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#FDE8B8] text-[#D97706] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-[#172033]">PDF Workspace</h3>
              <p className="text-[13px] text-[#64748B] leading-snug">
                Read, highlight, draw, add notes &amp; download annotated PDFs
              </p>
            </div>
          </button>

          {/* 4. Explore */}
          <button
            type="button"
            onClick={() => onNavigateTab('explore')}
            className="group text-left rounded-2xl bg-[#F2FBF6] hover:bg-[#E6F4EA] p-4 flex items-start gap-3.5 lm-card-interactive border border-emerald-100/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285F4]"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#D1F4E0] text-[#34A853] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-[#172033]">Explore</h3>
              <p className="text-[13px] text-[#64748B] leading-snug">
                Daily Current Affairs Newspaper, Course Library &amp; Study Maps
              </p>
            </div>
          </button>
        </div>

        {/* Recent Materials at the Bottom (Real Saved Documents Only) */}
        {documents.length > 0 && (
          <div className="mt-8 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[#172033]">Recent Materials</h2>
                <button
                  type="button"
                  onClick={() => onSelectDocument(documents[0], 'explain')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1A73E8] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Continue Learning: {documents[0].title}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (documents.length > 3) {
                    setShowAllRecent((prev) => !prev);
                  } else {
                    onNavigateTab('dashboard');
                  }
                }}
                className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#1A73E8] hover:text-[#1557B0] transition-colors cursor-pointer"
              >
                <span>{showAllRecent ? 'Show Less' : 'Open Student Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleDocuments.map((doc, idx) => {
                const colorThemes = [
                  {
                    bg: 'bg-[#FCE8E6]',
                    iconColor: 'text-[#EA4335]',
                  },
                  {
                    bg: 'bg-[#E8F0FE]',
                    iconColor: 'text-[#4285F4]',
                  },
                  {
                    bg: 'bg-[#E6F4EA]',
                    iconColor: 'text-[#34A853]',
                  },
                ];
                const theme = colorThemes[idx % colorThemes.length];

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => onSelectDocument(doc, 'explain')}
                    className="bg-white hover:bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 text-left lm-card-interactive group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285F4]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl ${theme.bg} ${theme.iconColor} flex items-center justify-center shrink-0`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-[#172033] truncate group-hover:text-[#1A73E8] transition-colors">
                          {doc.title}
                        </p>
                        <p className="text-xs text-[#64748B] truncate mt-0.5">
                          {formatRelativeTime(doc.lastStudiedAt, idx)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Page Study Notes Paste Modal (Closes on Outside Click or Escape) */}
      {pasteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Paste Study Notes"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPasteModalOpen(false);
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#172033]">Paste Your Study Notes</h3>
                <p className="text-xs text-[#64748B]">
                  LearnMate automatically indexes your notes into pages and extracts key topics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFullModalSubmit} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="notes-title-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Document Title
                </label>
                <input
                  id="notes-title-input"
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry Chapter 4 — Reaction Mechanisms"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#172033] focus:outline-none focus:border-[#4285F4]"
                />
              </div>

              <div>
                <label
                  htmlFor="notes-content-textarea"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Study Material Content (Tip: Use &quot;--- Page 1 ---&quot;, &quot;--- Page 2 ---&quot; or paragraphs)
                </label>
                <textarea
                  id="notes-content-textarea"
                  rows={9}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Paste lecture notes, textbook excerpts, or study guides here (minimum 40 characters)..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#172033] focus:outline-none focus:border-[#4285F4] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasteModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white text-sm font-semibold shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Indexing & Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Studying</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
