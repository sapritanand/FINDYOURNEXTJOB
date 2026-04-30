// components/JobSort.tsx
'use client';

import { ArrowUpDown } from 'lucide-react';

export type SortOption = 'matchScore' | 'newest' | 'salary' | 'company';

interface JobSortProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export default function JobSort({ value, onChange }: JobSortProps) {
  return (
    <div className="flex items-center space-x-2">
      <ArrowUpDown className="h-4 w-4 text-gray-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
      >
        <option value="matchScore">Best Match</option>
        <option value="newest">Newest First</option>
        <option value="salary">Highest Salary</option>
        <option value="company">Company A-Z</option>
      </select>
    </div>
  );
}
