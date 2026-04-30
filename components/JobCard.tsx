// components/JobCard.tsx
'use client';

import { useState } from 'react';
import { MapPin, Building2, DollarSign, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { Job } from '@/lib/types';
import { cleanJobDescription, getDescriptionPreview } from '@/lib/text-cleaner';

interface JobCardProps {
  job: Job & { id: string };
  resumeId?: string;
  onMatchClick?: (jobId: string) => void;
  matchScore?: number;
  onViewDetails?: (job: Job & { id: string }) => void;
}

export default function JobCard({ job, resumeId, onMatchClick, matchScore, onViewDetails }: JobCardProps) {
  const [loading, setLoading] = useState(false);

  const handleMatch = async () => {
    if (!resumeId || !onMatchClick) return;
    setLoading(true);
    await onMatchClick(job.id);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border border-gray-200">
      {matchScore !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Match Score</span>
            <span className={`text-2xl font-bold ${
              matchScore >= 80 ? 'text-green-600' :
              matchScore >= 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {matchScore}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                matchScore >= 80 ? 'bg-green-600' :
                matchScore >= 60 ? 'bg-yellow-600' :
                'bg-red-600'
              }`}
              style={{ width: `${matchScore}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
        
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          <div className="flex items-center">
            <Building2 className="h-4 w-4 mr-1" />
            {job.company}
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {job.location}
          </div>
          {job.salary && (
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              {job.salary}
            </div>
          )}
        </div>
      </div>

      <p className="text-gray-700 text-sm mb-4 line-clamp-3">
        {getDescriptionPreview(cleanJobDescription(job.description))}
      </p>

      {job.tags && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {job.tags.slice(0, 5).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(job)}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            View Details
          </button>
        )}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-sm font-medium ${onViewDetails ? '' : 'flex-1'}`}
        >
          Apply
          <ExternalLink className="h-4 w-4 ml-2" />
        </a>
        
        {resumeId && onMatchClick && !matchScore && (
          <button
            onClick={handleMatch}
            disabled={loading}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition text-sm font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Matching...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Match
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
        <span>Source: {job.source}</span>
        {job.scrapedAt && (
          <span>{new Date(job.scrapedAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
