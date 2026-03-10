'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Job, JobsResponse } from '@/types';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Briefcase, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function JobsPage() {
  const [jobsData, setJobsData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<JobsResponse>(`/jobs?page=${page}&limit=${limit}`);
      setJobsData(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = (jobsData?.data || []).filter(
    (job) =>
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.requiredSkills?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Manage your job postings and candidates</p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title or skill..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
        />
      </div>

      {/* Jobs list */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No jobs found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Try a different search term' : 'Create your first job posting'}
            </p>
            {!search && (
              <Link
                href="/jobs/new"
                className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" />
                Create Job
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <div className="col-span-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Title</div>
              <div className="col-span-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Skills</div>
              <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Created</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y divide-gray-50">
              {filteredJobs.map((job: Job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition items-center"
                >
                  <div className="col-span-5">
                    <p className="text-sm font-medium text-gray-900">{job.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{job.description}</p>
                  </div>
                  <div className="col-span-4 flex flex-wrap gap-1.5">
                    {job.requiredSkills?.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                    {(job.requiredSkills?.length || 0) > 4 && (
                      <span className="text-xs text-gray-400">
                        +{job.requiredSkills.length - 4}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-sm text-gray-500">{formatDate(job.createdAt)}</div>
                  <div className="col-span-1 flex justify-end">
                    <span className="text-xs text-indigo-600 font-medium">View →</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {jobsData && jobsData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Page {jobsData.meta.page} of {jobsData.meta.totalPages} ({jobsData.meta.total} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(jobsData.meta.totalPages, p + 1))}
                    disabled={page === jobsData.meta.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
