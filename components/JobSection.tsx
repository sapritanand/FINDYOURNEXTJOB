// components/JobSection.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import JobCard from './JobCard';

interface JobSectionProps {
  title: string;
  icon: string;
  jobs: any[];
  resumeId?: string;
  onMatchClick?: (jobId: string) => void;
  onViewDetails?: (job: any) => void;
  defaultExpanded?: boolean;
  highlight?: boolean;
}

export default function JobSection({
  title,
  icon,
  jobs,
  resumeId,
  onMatchClick,
  onViewDetails,
  defaultExpanded = true,
  highlight = false,
}: JobSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (jobs.length === 0) return null;

  return (
    <div className={`mb-6 ${highlight ? 'bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4' : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-900">
            {title} ({jobs.length})
          </h3>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4 mt-3">
          {jobs.map((job) => (
            <div key={job.id} className={highlight ? 'relative' : ''}>
              {highlight && job.matchScore >= 95 && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                    ⭐ Top Match
                  </span>
                </div>
              )}
              <JobCard
                job={job}
                resumeId={resumeId}
                onMatchClick={onMatchClick}
                matchScore={job.matchScore}
                onViewDetails={onViewDetails}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
