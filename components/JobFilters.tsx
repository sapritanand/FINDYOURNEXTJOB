// components/JobFilters.tsx
'use client';

import { X } from 'lucide-react';

export interface FilterState {
  remoteOnly: boolean;
  minSalary: number;
  experienceLevel: string[];
  techStack: string[];
}

interface JobFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableTags: string[];
}

const EXPERIENCE_LEVELS = ['Junior', 'Mid-level', 'Senior', 'Lead', 'Principal'];
const SALARY_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '$50k+', value: 50000 },
  { label: '$100k+', value: 100000 },
  { label: '$150k+', value: 150000 },
  { label: '$200k+', value: 200000 },
];

export default function JobFilters({ filters, onChange, availableTags }: JobFiltersProps) {
  const hasActiveFilters =
    filters.remoteOnly ||
    filters.minSalary > 0 ||
    filters.experienceLevel.length > 0 ||
    filters.techStack.length > 0;

  const clearFilters = () => {
    onChange({
      remoteOnly: false,
      minSalary: 0,
      experienceLevel: [],
      techStack: [],
    });
  };

  const toggleArrayFilter = (
    key: 'experienceLevel' | 'techStack',
    value: string
  ) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: updated });
  };

  // Get top 10 most common tags
  const topTags = availableTags.slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Remote Only */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.remoteOnly}
            onChange={(e) => onChange({ ...filters, remoteOnly: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">Remote Only</span>
        </label>

        {/* Salary Filter */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Minimum Salary
          </label>
          <select
            value={filters.minSalary}
            onChange={(e) => onChange({ ...filters, minSalary: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            {SALARY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Experience Level */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Experience Level
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => toggleArrayFilter('experienceLevel', level)}
                className={`px-3 py-1 text-xs rounded-full border transition ${
                  filters.experienceLevel.includes(level)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        {topTags.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Tech Stack
            </label>
            <div className="flex flex-wrap gap-2">
              {topTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleArrayFilter('techStack', tag)}
                  className={`px-3 py-1 text-xs rounded-full border transition ${
                    filters.techStack.includes(tag)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
