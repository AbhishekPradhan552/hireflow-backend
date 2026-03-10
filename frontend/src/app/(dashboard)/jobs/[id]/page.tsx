'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Job, Candidate, CandidatesResponse, JobStats, Pipeline } from '@/types';
import { formatDate, getStatusColor, getScoreColor, cn } from '@/lib/utils';
import {
  ArrowLeft, Loader2, Users, BarChart2, Settings,
  Plus, ChevronLeft, ChevronRight, X, TrendingUp, Clock, CheckCircle2, Star
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const TABS = ['Overview', 'Candidates', 'Settings'] as const;
type Tab = typeof TABS[number];

const editJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
});
type EditJobForm = z.infer<typeof editJobSchema>;

const addCandidateSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
});
type AddCandidateForm = z.infer<typeof addCandidateSchema>;

const PIPELINE_COLORS: Record<string, string> = {
  APPLIED: '#6366f1',
  SCREENING: '#f59e0b',
  INTERVIEW: '#8b5cf6',
  HIRED: '#10b981',
  REJECTED: '#ef4444',
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [job, setJob] = useState<Job | null>(null);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidatePage, setCandidatePage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditJobForm>({ resolver: zodResolver(editJobSchema) });

  const {
    register: registerCandidate,
    handleSubmit: handleCandidateSubmit,
    reset: resetCandidate,
    formState: { errors: candidateErrors },
  } = useForm<AddCandidateForm>({ resolver: zodResolver(addCandidateSchema) });

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}`);
      setJob(data);
      resetEdit({ title: data.title, description: data.description });
    } catch {
      toast.error('Job not found');
      router.push('/jobs');
    }
  }, [jobId, resetEdit, router]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}/stats`);
      setStats(data);
    } catch {
      // optional
    }
  }, [jobId]);

  const fetchPipeline = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}/pipeline`);
      setPipeline(data);
    } catch {
      // optional
    }
  }, [jobId]);

  const fetchCandidates = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}/candidates?page=${candidatePage}&limit=10`);
      setCandidates(data);
    } catch {
      // optional
    }
  }, [jobId, candidatePage]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchJob(), fetchStats(), fetchPipeline()]);
      setLoading(false);
    };
    init();
  }, [fetchJob, fetchStats, fetchPipeline]);

  useEffect(() => {
    if (activeTab === 'Candidates') {
      fetchCandidates();
    }
  }, [activeTab, fetchCandidates]);

  const onEditSubmit = async (data: EditJobForm) => {
    setSavingJob(true);
    try {
      await api.put(`/jobs/${jobId}`, data);
      toast.success('Job updated!');
      fetchJob();
    } catch {
      toast.error('Failed to update job');
    } finally {
      setSavingJob(false);
    }
  };

  const onDeleteJob = async () => {
    if (!confirm('Delete this job and all its candidates? This cannot be undone.')) return;
    setDeletingJob(true);
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success('Job deleted');
      router.push('/jobs');
    } catch {
      toast.error('Failed to delete job');
      setDeletingJob(false);
    }
  };

  const onAddCandidate = async (data: AddCandidateForm) => {
    setAddingCandidate(true);
    try {
      await api.post(`/jobs/${jobId}/candidates`, data);
      toast.success('Candidate added!');
      resetCandidate();
      setShowAddModal(false);
      fetchCandidates();
      fetchStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to add candidate');
    } finally {
      setAddingCandidate(false);
    }
  };

  const pipelineChartData = pipeline
    ? Object.entries(pipeline.pipeline).map(([key, val]) => ({ name: key, count: val }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="p-8">
      {/* Back + Header */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <p className="text-sm text-gray-500 mt-1">Created {formatDate(job.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {job.requiredSkills?.slice(0, 6).map((skill) => (
            <span key={skill} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab === 'Overview' && <BarChart2 className="w-4 h-4" />}
              {tab === 'Candidates' && <Users className="w-4 h-4" />}
              {tab === 'Settings' && <Settings className="w-4 h-4" />}
              {tab}
              {tab === 'Candidates' && stats && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {stats.totalCandidates}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Candidates', value: stats?.totalCandidates ?? '—', icon: Users, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
              { label: 'Parsed Resumes', value: stats?.parsedResumes ?? '—', icon: CheckCircle2, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
              { label: 'Avg. Score', value: stats?.averageScore ? `${Math.round(stats.averageScore)}%` : '—', icon: TrendingUp, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
              { label: 'Top Score', value: stats?.topScore ? `${Math.round(stats.topScore)}%` : '—', icon: Star, iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
            ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Pending */}
          {stats && stats.pendingResumes > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>{stats.pendingResumes}</strong> resume{stats.pendingResumes !== 1 ? 's' : ''} are still being processed.
              </p>
            </div>
          )}

          {/* Pipeline chart */}
          {pipelineChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-6">Candidate Pipeline</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelineChartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pipelineChartData.map((entry) => (
                      <Cell key={entry.name} fill={PIPELINE_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Job Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Job Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>
        </div>
      )}

      {/* CANDIDATES TAB */}
      {activeTab === 'Candidates' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {candidates?.meta.total ?? 0} candidate{candidates?.meta.total !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Candidate
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {!candidates || candidates.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No candidates yet</p>
                <p className="text-sm text-gray-400 mt-1">Add candidates to start screening</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 rounded-t-xl border-b border-gray-100">
                  <div className="col-span-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Candidate</div>
                  <div className="col-span-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Score</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Added</div>
                  <div className="col-span-1" />
                </div>
                <div className="divide-y divide-gray-50">
                  {candidates.data.map((c: Candidate) => (
                    <div key={c.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                      <div className="col-span-4">
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">{c.email}</p>
                      </div>
                      <div className="col-span-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="col-span-2">
                        {c.hybridScore != null ? (
                          <span className={`text-sm font-semibold ${getScoreColor(c.hybridScore)}`}>
                            {Math.round(c.hybridScore)}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </div>
                      <div className="col-span-2 text-sm text-gray-500">{formatDate(c.createdAt)}</div>
                      <div className="col-span-1 flex justify-end">
                        <Link
                          href={`/jobs/${jobId}/candidates/${c.id}`}
                          className="text-xs text-indigo-600 font-medium hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {candidates.meta.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Page {candidates.meta.page} of {candidates.meta.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCandidatePage((p) => Math.max(1, p - 1))}
                        disabled={candidatePage === 1}
                        className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setCandidatePage((p) => Math.min(candidates.meta.totalPages, p + 1))}
                        disabled={candidatePage === candidates.meta.totalPages}
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
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'Settings' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-6">Edit Job</h2>
            <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  {...registerEdit('title')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                {editErrors.title && (
                  <p className="mt-1.5 text-sm text-red-600">{editErrors.title.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  {...registerEdit('description')}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
                {editErrors.description && (
                  <p className="mt-1.5 text-sm text-red-600">{editErrors.description.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={savingJob}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {savingJob ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-base font-semibold text-red-700 mb-2">Danger Zone</h2>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete this job and all associated candidates and resumes. This action cannot be undone.
            </p>
            <button
              onClick={onDeleteJob}
              disabled={deletingJob}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
            >
              {deletingJob ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Delete Job'}
            </button>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add Candidate</h2>
              <button
                onClick={() => { setShowAddModal(false); resetCandidate(); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCandidateSubmit(onAddCandidate)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...registerCandidate('name')}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                {candidateErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{candidateErrors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  {...registerCandidate('email')}
                  type="email"
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                {candidateErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{candidateErrors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (optional)</label>
                <input
                  {...registerCandidate('phone')}
                  type="tel"
                  placeholder="+1 555 000 0000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={addingCandidate}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {addingCandidate ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add Candidate'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetCandidate(); }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
