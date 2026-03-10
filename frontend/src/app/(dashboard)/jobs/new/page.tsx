'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Loader2, ArrowLeft, Sparkles } from 'lucide-react';

const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters'),
});

type JobForm = z.infer<typeof jobSchema>;

export default function NewJobPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobForm>({
    resolver: zodResolver(jobSchema),
  });

  const onSubmit = async (data: JobForm) => {
    setIsLoading(true);
    try {
      const { data: job } = await api.post('/jobs', data);
      toast.success('Job created successfully!');
      router.push(`/jobs/${job.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to create job');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
        <p className="text-gray-500 mt-1">Post a new job and let AI screen your candidates.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              placeholder="e.g. Senior Software Engineer"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
            />
            {errors.title && (
              <p className="mt-1.5 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Job Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                {...register('description')}
                rows={8}
                placeholder="Describe the role, responsibilities, requirements, and qualifications..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition resize-none"
              />
            </div>
            {errors.description && (
              <p className="mt-1.5 text-sm text-red-600">{errors.description.message}</p>
            )}
            {/* AI hint */}
            <div className="mt-2 flex items-start gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-700">
                <strong>AI Skill Extraction:</strong> HireFlow will automatically extract required skills from your job description and use them to rank and match candidates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Job'
              )}
            </button>
            <Link
              href="/jobs"
              className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
