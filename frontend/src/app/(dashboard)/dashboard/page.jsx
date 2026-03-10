'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Briefcase, FileText, TrendingUp, Plus, Loader2, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, usageRes] = await Promise.all([
          api.get('/jobs?page=1&limit=5'),
          api.get('/org/usage'),
        ]);
        setJobs(jobsRes.data.data || []);
        setUsage(usageRes.data);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const usagePercent = usage
    ? Math.min(100, Math.round((usage.resumesParsed / (usage.limit || 1)) * 100))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.email.split('@')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with your hiring pipeline.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{jobs.length}</p>
          <p className="text-sm text-gray-500 mt-1">Active Jobs</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{usage?.resumesParsed ?? '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Resumes Parsed</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {usage ? `${usagePercent}%` : '—'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Plan Usage</p>
        </div>
      </div>

      {/* Usage bar */}
      {usage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Resume Parse Usage</p>
            <p className="text-sm text-gray-500">
              {usage.resumesParsed} / {usage.limit === -1 ? '∞' : usage.limit}
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usagePercent >= 90
                  ? 'bg-red-500'
                  : usagePercent >= 70
                  ? 'bg-yellow-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Jobs</h2>
          <Link
            href="/jobs/new"
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No jobs yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create your first job posting to get started
            </p>
            <Link
              href="/jobs/new"
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Create Job
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(job.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {job.requiredSkills?.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full hidden sm:inline-flex"
                    >
                      {skill}
                    </span>
                  ))}
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {jobs.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100">
            <Link href="/jobs" className="text-sm text-indigo-600 font-medium hover:underline">
              View all jobs →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
