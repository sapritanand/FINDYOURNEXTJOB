// app/dashboard/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ResumeUpload from '@/components/ResumeUpload';
import JobCard from '@/components/JobCard';
import SearchBar from '@/components/SearchBar';
import JobSort, { SortOption } from '@/components/JobSort';
import JobFilters, { FilterState } from '@/components/JobFilters';
import JobSection from '@/components/JobSection';
import JobDetailsModal from '@/components/JobDetailsModal';
import { Briefcase, RefreshCw, Sparkles, LogOut, Loader2, Zap } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scrapingJobs, setScrapingJobs] = useState(false);
  
  // Auto-match state
  const [autoMatching, setAutoMatching] = useState(false);
  const [matchProgress, setMatchProgress] = useState({ current: 0, total: 0 });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('matchScore');
  const [filters, setFilters] = useState<FilterState>({
    remoteOnly: false,
    minSalary: 0,
    experienceLevel: [],
    techStack: [],
  });

  // Modal state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const key = localStorage.getItem('groq_api_key');
    if (!key) {
      router.push('/');
      return;
    }
    setApiKey(key);

    // Load initial jobs
    loadJobs();
  }, [router]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scrape-jobs');
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-match all jobs function
  const handleAutoMatchAllJobs = async (uploadedResumeId: string) => {
    if (!apiKey || jobs.length === 0) return;

    setAutoMatching(true);
    setMatchProgress({ current: 0, total: jobs.length });

    // Process jobs in batches of 3 to avoid rate limits
    const batchSize = 3;
    const jobsCopy = [...jobs];

    for (let i = 0; i < jobsCopy.length; i += batchSize) {
      const batch = jobsCopy.slice(i, i + batchSize);
      
      const promises = batch.map(async (job) => {
        try {
          const response = await fetch('/api/match-jobs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Groq-API-Key': apiKey,
            },
            body: JSON.stringify({ resumeId: uploadedResumeId, jobId: job.id }),
          });

          if (!response.ok) {
            console.error(`Failed to match job ${job.id}`);
            return { jobId: job.id, matchScore: null, error: true };
          }

          const data = await response.json();
          return { jobId: job.id, matchScore: data.matchScore, matchAnalysis: data.matchAnalysis };
        } catch (error) {
          console.error(`Error matching job ${job.id}:`, error);
          return { jobId: job.id, matchScore: null, error: true };
        }
      });

      const results = await Promise.all(promises);

      // Update jobs with match scores progressively
      setJobs(prevJobs =>
        prevJobs.map(job => {
          const result = results.find(r => r.jobId === job.id);
          if (result && result.matchScore !== null) {
            return { ...job, matchScore: result.matchScore, matchAnalysis: result.matchAnalysis };
          }
          return job;
        })
      );

      setMatchProgress({ current: Math.min(i + batchSize, jobsCopy.length), total: jobsCopy.length });

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < jobsCopy.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setAutoMatching(false);
  };

  const handleResumeUpload = (id: string, data: any) => {
    setResumeId(id);
    setResumeData(data);
    
    // Auto-match all jobs after resume upload
    if (jobs.length > 0) {
      handleAutoMatchAllJobs(id);
    }
  };

  const handleMatchJob = async (jobId: string) => {
    if (!resumeId || !apiKey) return;

    try {
      const response = await fetch('/api/match-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Groq-API-Key': apiKey,
        },
        body: JSON.stringify({ resumeId, jobId }),
      });

      const data = await response.json();

      // Update jobs with match score
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId
            ? { ...job, matchScore: data.matchScore, matchAnalysis: data.matchAnalysis }
            : job
        )
      );

      // Add to applications
      setApplications(prev => [...prev, data]);
    } catch (error) {
      console.error('Failed to match job:', error);
    }
  };

  const handleRefreshJobs = async () => {
    setScrapingJobs(true);
    try {
      const response = await fetch('/api/scrape-jobs', { method: 'POST' });
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to refresh jobs:', error);
    } finally {
      setScrapingJobs(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('groq_api_key');
    router.push('/');
  };

  // Handle viewing job details
  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
  };

  // Handle match from modal
  const handleModalMatch = async (jobId: string) => {
    await handleMatchJob(jobId);
    // Update selected job with new data
    setSelectedJob((prev: any) => {
      if (!prev || prev.id !== jobId) return prev;
      const updatedJob = jobs.find(j => j.id === jobId);
      return updatedJob || prev;
    });
  };

  // Parse salary string to number for comparison
  const parseSalary = (salary: string | undefined): number => {
    if (!salary) return 0;
    const match = salary.match(/\$?([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''));
    }
    return 0;
  };

  // Get all unique tags from jobs
  const availableTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    jobs.forEach(job => {
      job.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [jobs]);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(job =>
        job.title?.toLowerCase().includes(query) ||
        job.company?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Apply remote filter
    if (filters.remoteOnly) {
      result = result.filter(job =>
        job.location?.toLowerCase().includes('remote')
      );
    }

    // Apply salary filter
    if (filters.minSalary > 0) {
      result = result.filter(job => parseSalary(job.salary) >= filters.minSalary);
    }

    // Apply experience level filter
    if (filters.experienceLevel.length > 0) {
      result = result.filter(job => {
        const text = `${job.title} ${job.description}`.toLowerCase();
        return filters.experienceLevel.some(level => {
          if (level === 'Junior') return text.includes('junior') || text.includes('entry');
          if (level === 'Mid-level') return text.includes('mid') || text.includes('intermediate');
          if (level === 'Senior') return text.includes('senior') || text.includes('sr.');
          if (level === 'Lead') return text.includes('lead') || text.includes('principal');
          if (level === 'Principal') return text.includes('principal') || text.includes('staff');
          return false;
        });
      });
    }

    // Apply tech stack filter
    if (filters.techStack.length > 0) {
      result = result.filter(job =>
        job.tags?.some((tag: string) =>
          filters.techStack.some(tech => tag.toLowerCase() === tech.toLowerCase())
        )
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'matchScore':
          return (b.matchScore || 0) - (a.matchScore || 0);
        case 'newest':
          return new Date(b.scrapedAt || 0).getTime() - new Date(a.scrapedAt || 0).getTime();
        case 'salary':
          return parseSalary(b.salary) - parseSalary(a.salary);
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, searchQuery, filters, sortBy]);

  // Group jobs by match score
  const groupedJobs = useMemo(() => {
    const topMatches = filteredAndSortedJobs.filter(j => j.matchScore >= 90);
    const goodFits = filteredAndSortedJobs.filter(j => j.matchScore >= 70 && j.matchScore < 90);
    const others = filteredAndSortedJobs.filter(j => !j.matchScore || j.matchScore < 70);
    
    return { topMatches, goodFits, others };
  }, [filteredAndSortedJobs]);

  const hasMatchedJobs = jobs.some(j => j.matchScore !== undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">FindYourNextJob</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600 transition"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Resume Upload & Filters */}
          <div className="lg:col-span-1 space-y-6">
            <ResumeUpload onUploadComplete={handleResumeUpload} />

            {resumeData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Resume Summary</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Name:</span>{' '}
                    <span className="font-medium">{resumeData.name || 'N/A'}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">Email:</span>{' '}
                    <span className="font-medium">{resumeData.email || 'N/A'}</span>
                  </p>
                  <div>
                    <span className="text-gray-600">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {resumeData.skills?.slice(0, 8).map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Job Filters */}
            <JobFilters
              filters={filters}
              onChange={setFilters}
              availableTags={availableTags}
            />
          </div>

          {/* Right Content - Job Listings */}
          <div className="lg:col-span-2">
            {/* Auto-matching progress */}
            {autoMatching && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-indigo-600 animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium text-indigo-900">
                      Matching jobs to your resume...
                    </p>
                    <p className="text-sm text-indigo-700">
                      {matchProgress.current} of {matchProgress.total} jobs matched
                    </p>
                    <div className="w-full bg-indigo-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${(matchProgress.current / matchProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <SearchBar
                  onSearch={setSearchQuery}
                  resultCount={filteredAndSortedJobs.length}
                  totalCount={jobs.length}
                />
              </div>
              <JobSort value={sortBy} onChange={setSortBy} />
            </div>

            {/* Header with refresh button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Briefcase className="h-6 w-6 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Remote AI/ML Jobs ({filteredAndSortedJobs.length})
                </h2>
              </div>
              <button
                onClick={handleRefreshJobs}
                disabled={scrapingJobs}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
              >
                <RefreshCw className={`h-4 w-4 ${scrapingJobs ? 'animate-spin' : ''}`} />
                <span>{scrapingJobs ? 'Refreshing...' : 'Refresh Jobs'}</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredAndSortedJobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  {searchQuery || Object.values(filters).some(v => v.length > 0 || v === true || v > 0)
                    ? 'No jobs match your filters. Try adjusting your search.'
                    : 'No jobs found. Try refreshing!'}
                </p>
              </div>
            ) : hasMatchedJobs ? (
              // Show grouped sections when jobs are matched
              <>
                <JobSection
                  title="Top Matches"
                  icon="🎯"
                  jobs={groupedJobs.topMatches}
                  resumeId={resumeId || undefined}
                  onMatchClick={handleMatchJob}
                  onViewDetails={handleViewDetails}
                  defaultExpanded={true}
                  highlight={true}
                />
                <JobSection
                  title="Good Fits"
                  icon="💡"
                  jobs={groupedJobs.goodFits}
                  resumeId={resumeId || undefined}
                  onMatchClick={handleMatchJob}
                  onViewDetails={handleViewDetails}
                  defaultExpanded={true}
                />
                <JobSection
                  title="Other Jobs"
                  icon="📋"
                  jobs={groupedJobs.others}
                  resumeId={resumeId || undefined}
                  onMatchClick={handleMatchJob}
                  onViewDetails={handleViewDetails}
                  defaultExpanded={false}
                />
              </>
            ) : (
              // Show flat list when no jobs are matched yet
              <div className="space-y-4">
                {filteredAndSortedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    resumeId={resumeId || undefined}
                    onMatchClick={handleMatchJob}
                    matchScore={job.matchScore}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Job Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onMatch={handleModalMatch}
        resumeId={resumeId || undefined}
      />
    </div>
  );
}
