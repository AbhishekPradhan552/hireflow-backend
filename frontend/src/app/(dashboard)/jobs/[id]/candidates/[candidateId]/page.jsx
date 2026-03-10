'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, getStatusColor, getParseStatusColor, getScoreColor } from '@/lib/utils';
import {
  ArrowLeft, Loader2, Upload, RefreshCw, Trash2,
  FileText, Download, CheckCircle2, XCircle, Clock, Mail, Phone
} from 'lucide-react';

const CANDIDATE_STATUSES = ['applied', 'screening', 'interview', 'hired', 'rejected'];

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id;
  const candidateId = params.candidateId;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [deletingResume, setDeletingResume] = useState(null);
  const [reparsingResume, setReparsingResume] = useState(null);
  const fileInputRef = useRef(null);

  const fetchCandidate = useCallback(async () => {
    try {
      const { data } = await api.get(`/candidates/${candidateId}`);
      setCandidate(data);
    } catch {
      toast.error('Candidate not found');
      router.push(`/jobs/${jobId}`);
    } finally {
      setLoading(false);
    }
  }, [candidateId, jobId, router]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const handleStatusChange = async (status) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/candidates/${candidateId}`, { status });
      setCandidate((prev) => prev ? { ...prev, status } : prev);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!confirm('Delete this candidate and all their resumes? This cannot be undone.')) return;
    try {
      await api.delete(`/candidates/${candidateId}`);
      toast.success('Candidate deleted');
      router.push(`/jobs/${jobId}?tab=Candidates`);
    } catch {
      toast.error('Failed to delete candidate');
    }
  };

  const handleUploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingResume(true);
    try {
      await api.post(`/candidates/${candidateId}/resumes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Resume uploaded and queued for processing');
      fetchCandidate();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteResume = async (resumeId) => {
    if (!confirm('Delete this resume?')) return;
    setDeletingResume(resumeId);
    try {
      await api.delete(`/resumes/${resumeId}`);
      toast.success('Resume deleted');
      fetchCandidate();
    } catch {
      toast.error('Failed to delete resume');
    } finally {
      setDeletingResume(null);
    }
  };

  const handleReparseResume = async (resumeId) => {
    setReparsingResume(resumeId);
    try {
      await api.post(`/resumes/${resumeId}/reparse`);
      toast.success('Resume queued for reprocessing');
      fetchCandidate();
    } catch {
      toast.error('Failed to reparse resume');
    } finally {
      setReparsingResume(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!candidate) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href={`/jobs/${jobId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Job
      </Link>

      {/* Candidate Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
              {candidate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{candidate.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail className="w-4 h-4" />
                  {candidate.email}
                </span>
                {candidate.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-4 h-4" />
                    {candidate.phone}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Added {formatDate(candidate.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 font-medium">Status:</label>
              <div className="relative">
                <select
                  value={candidate.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updatingStatus}
                  className="appearance-none pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {CANDIDATE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                {updatingStatus && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-indigo-500" />
                )}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(candidate.status)}`}>
                {candidate.status}
              </span>
            </div>

            <button
              onClick={handleDeleteCandidate}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Score */}
        {candidate.hybridScore != null && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Best Match Score:{' '}
              <span className={`text-lg font-bold ${getScoreColor(candidate.hybridScore)}`}>
                {Math.round(candidate.hybridScore)}%
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Resumes Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Resumes ({candidate.resumes?.length ?? 0})
          </h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleUploadResume}
              className="hidden"
              id="resume-upload"
            />
            <label
              htmlFor="resume-upload"
              className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition cursor-pointer ${uploadingResume ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {uploadingResume ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload Resume</>
              )}
            </label>
          </div>
        </div>

        {!candidate.resumes || candidate.resumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No resumes uploaded yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload a resume to start AI screening</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {candidate.resumes.map((resume) => (
              <div key={resume.id} className="p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{resume.originalName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(resume.fileSize / 1024).toFixed(1)} KB · Uploaded {formatDate(resume.createdAt)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getParseStatusColor(resume.parseStatus)}`}>
                          {resume.parseStatus === 'COMPLETED' ? (
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Parsed</span>
                          ) : resume.parseStatus === 'FAILED' ? (
                            <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>
                          ) : resume.parseStatus === 'PROCESSING' ? (
                            <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Processing</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
                          )}
                        </span>
                        {resume.aiStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getParseStatusColor(resume.aiStatus)}`}>
                            AI: {resume.aiStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-6">
                    {resume.hybridScore != null && (
                      <div className="text-center">
                        <p className={`text-xl font-bold ${getScoreColor(resume.hybridScore)}`}>
                          {Math.round(resume.hybridScore)}%
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Hybrid Score</p>
                      </div>
                    )}
                    {resume.semanticScore != null && (
                      <div className="text-center">
                        <p className={`text-xl font-bold ${getScoreColor(resume.semanticScore)}`}>
                          {Math.round(resume.semanticScore)}%
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Semantic</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {resume.downloadUrl && (
                        <a
                          href={resume.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleReparseResume(resume.id)}
                        disabled={reparsingResume === resume.id}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                        title="Reparse"
                      >
                        {reparsingResume === resume.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteResume(resume.id)}
                        disabled={deletingResume === resume.id}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingResume === resume.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {(resume.matchedSkills?.length > 0 || resume.missingSkills?.length > 0) && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                    {resume.matchedSkills?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Matched Skills ({resume.matchedSkills.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {resume.matchedSkills.map((skill) => (
                            <span key={skill} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {resume.missingSkills?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          Missing Skills ({resume.missingSkills.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {resume.missingSkills.map((skill) => (
                            <span key={skill} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
