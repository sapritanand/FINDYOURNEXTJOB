// components/JobDetailsModal.tsx
'use client';

import { useState } from 'react';
import { X, ExternalLink, FileText, MapPin, Building2, DollarSign, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Job } from '@/lib/types';
import { cleanJobDescription, getDescriptionPreview, formatDescriptionParagraphs } from '@/lib/text-cleaner';

interface MatchAnalysis {
  score: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  keySkillsMatch?: {
    matched: string[];
    missing: string[];
  };
}

interface JobDetailsModalProps {
  job: (Job & { id: string; matchScore?: number; matchAnalysis?: MatchAnalysis }) | null;
  onClose: () => void;
  onMatch?: (jobId: string) => Promise<void>;
  resumeId?: string;
}

export default function JobDetailsModal({
  job,
  onClose,
  onMatch,
  resumeId,
}: JobDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'description' | 'match'>('overview');
  const [matching, setMatching] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);

  if (!job) return null;

  const handleMatch = async () => {
    if (!onMatch) return;
    setMatching(true);
    await onMatch(job.id);
    setMatching(false);
  };

  const handleGenerateCoverLetter = async () => {
    if (!resumeId) return;
    
    setGeneratingCover(true);
    try {
      const apiKey = localStorage.getItem('groq_api_key');
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Groq-API-Key': apiKey || '',
        },
        body: JSON.stringify({
          jobId: job.id,
          resumeId,
        }),
      });
      
      const data = await response.json();
      if (data.coverLetter) {
        setCoverLetter(data.coverLetter);
      }
    } catch (error) {
      console.error('Failed to generate cover letter:', error);
    } finally {
      setGeneratingCover(false);
    }
  };

  const copyToClipboard = () => {
    if (coverLetter) {
      navigator.clipboard.writeText(coverLetter);
    }
  };

  // Clean description using shared utility
  const cleanDescription = cleanJobDescription(job.description);
  const descriptionParagraphs = formatDescriptionParagraphs(cleanDescription);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl font-bold text-gray-900 truncate">{job.title}</h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                <span className="flex items-center">
                  <Building2 className="h-4 w-4 mr-1" />
                  {job.company}
                </span>
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {job.location}
                </span>
                {job.salary && (
                  <span className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {job.salary}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Match Score Banner */}
          {job.matchScore !== undefined && (
            <div className={`px-6 py-3 ${
              job.matchScore >= 80 ? 'bg-green-50' :
              job.matchScore >= 60 ? 'bg-yellow-50' :
              'bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Match Score</span>
                <span className={`text-2xl font-bold ${
                  job.matchScore >= 80 ? 'text-green-600' :
                  job.matchScore >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {job.matchScore}%
                </span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6">
              {(['overview', 'description', 'match'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                    activeTab === tab
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Tags */}
                {job.tags && job.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Skills & Technologies</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Summary</h3>
                  <p className="text-gray-600 text-sm line-clamp-6">{getDescriptionPreview(cleanDescription, 400)}</p>
                </div>

                {/* Source */}
                <div className="text-xs text-gray-500">
                  Source: {job.source} • Posted {job.scrapedAt ? new Date(job.scrapedAt).toLocaleDateString() : 'Recently'}
                </div>
              </div>
            )}

            {activeTab === 'description' && (
              <div className="prose prose-sm max-w-none space-y-3">
                {descriptionParagraphs.map((paragraph, index) => (
                  <p key={index} className="text-gray-700 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {activeTab === 'match' && (
              <div className="space-y-6">
                {job.matchAnalysis ? (
                  <>
                    {/* Strengths */}
                    <div>
                      <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                        <Check className="h-4 w-4 mr-1" />
                        Strengths
                      </h3>
                      <ul className="space-y-1">
                        {job.matchAnalysis.strengths?.map((strength, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Gaps */}
                    <div>
                      <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Areas to Improve
                      </h3>
                      <ul className="space-y-1">
                        {job.matchAnalysis.gaps?.map((gap, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start">
                            <span className="text-orange-500 mr-2">!</span>
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Skills Match */}
                    {job.matchAnalysis.keySkillsMatch && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Matched Skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {job.matchAnalysis.keySkillsMatch.matched?.map((skill, i) => (
                              <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Missing Skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {job.matchAnalysis.keySkillsMatch.missing?.map((skill, i) => (
                              <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cover Letter */}
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        Cover Letter
                      </h3>
                      {coverLetter ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700 whitespace-pre-line">{coverLetter}</p>
                          <button
                            onClick={copyToClipboard}
                            className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            Copy to clipboard
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleGenerateCoverLetter}
                          disabled={generatingCover || !resumeId}
                          className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 disabled:opacity-50 transition flex items-center"
                        >
                          {generatingCover ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Generate Cover Letter
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      {resumeId 
                        ? 'Click "Match" to see how well you fit this role.'
                        : 'Upload your resume to see match analysis.'}
                    </p>
                    {resumeId && (
                      <button
                        onClick={handleMatch}
                        disabled={matching}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center mx-auto"
                      >
                        {matching ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          'Analyze Match'
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Apply Now
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
