'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Subscription, OrgUsage } from '@/types';
import { CheckCircle2, Loader2, Zap, Star, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'FREE' as const,
    name: 'Free',
    price: '$0',
    period: '/month',
    icon: Zap,
    iconBg: 'bg-gray-50',
    iconColor: 'text-gray-600',
    features: [
      '50 resumes / month',
      '20 active jobs',
      'AI skill extraction',
      'Candidate ranking',
      'Basic analytics',
    ],
    limit: 50,
  },
  {
    id: 'PRO' as const,
    name: 'Pro',
    price: '$49',
    period: '/month',
    icon: Star,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    features: [
      '500 resumes / month',
      '50 active jobs',
      'AI skill extraction',
      'Advanced candidate ranking',
      'Pipeline analytics',
      'Priority support',
    ],
    limit: 500,
    popular: true,
  },
  {
    id: 'TEAM' as const,
    name: 'Team',
    price: '$149',
    period: '/month',
    icon: Building2,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    features: [
      'Unlimited resumes',
      'Unlimited jobs',
      'AI skill extraction',
      'Advanced candidate ranking',
      'Full analytics suite',
      'Team collaboration',
      'Priority support',
      'Custom integrations',
    ],
    limit: -1,
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<OrgUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, usageRes] = await Promise.all([
          api.get('/billing/current'),
          api.get('/org/usage'),
        ]);
        setSubscription(subRes.data);
        setUsage(usageRes.data);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpgrade = async (plan: 'PRO' | 'TEAM') => {
    setUpgrading(plan);
    try {
      await api.post('/billing/upgrade', { plan });
      toast.success(`Upgraded to ${plan} plan!`);
      const { data } = await api.get('/billing/current');
      setSubscription(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to upgrade plan');
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You\'ll be downgraded to the Free plan.')) return;
    setCanceling(true);
    try {
      await api.post('/billing/cancel');
      toast.success('Subscription canceled');
      const { data } = await api.get('/billing/current');
      setSubscription(data);
    } catch {
      toast.error('Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  const usagePercent = usage
    ? usage.limit === -1
      ? 0
      : Math.min(100, Math.round((usage.resumesParsed / usage.limit) * 100))
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Plan Banner */}
      {subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Current Plan</p>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{subscription.plan}</h2>
                <span
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium',
                    subscription.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : subscription.status === 'CANCELED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  )}
                >
                  {subscription.status}
                </span>
              </div>
            </div>
            {subscription.plan !== 'FREE' && (
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg border border-red-200 transition disabled:opacity-50 flex items-center gap-2"
              >
                {canceling ? <><Loader2 className="w-4 h-4 animate-spin" /> Canceling...</> : 'Cancel Subscription'}
              </button>
            )}
          </div>

          {/* Usage meter */}
          {usage && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Resume Parse Usage</p>
                <p className="text-sm text-gray-500">
                  {usage.resumesParsed} / {usage.limit === -1 ? '∞' : usage.limit} resumes
                </p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    usage.limit === -1
                      ? 'bg-green-500 w-0'
                      : usagePercent >= 90
                      ? 'bg-red-500'
                      : usagePercent >= 70
                      ? 'bg-yellow-500'
                      : 'bg-indigo-600'
                  )}
                  style={{ width: usage.limit === -1 ? '5%' : `${usagePercent}%` }}
                />
              </div>
              {usage.limit !== -1 && usagePercent >= 80 && (
                <p className="text-xs text-yellow-700 mt-2">
                  ⚠️ You&apos;ve used {usagePercent}% of your monthly resume allowance. Consider upgrading.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = subscription?.plan === plan.id;
          const Icon = plan.icon;
          const { iconBg, iconColor } = plan;

          return (
            <div
              key={plan.id}
              className={cn(
                'bg-white rounded-xl border p-6 relative flex flex-col',
                plan.popular
                  ? 'border-indigo-300 shadow-md shadow-indigo-100'
                  : 'border-gray-200',
                isCurrentPlan && 'ring-2 ring-indigo-500'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>

              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>

              <div className="mt-2 mb-6">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrentPlan ? (
                  <div className="w-full text-center py-2.5 bg-gray-50 text-gray-500 rounded-lg text-sm font-medium border border-gray-200">
                    Current Plan
                  </div>
                ) : plan.id === 'FREE' ? (
                  <div className="w-full text-center py-2.5 bg-gray-50 text-gray-400 rounded-lg text-sm font-medium border border-gray-200">
                    Downgrade
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading === plan.id}
                    className={cn(
                      'w-full py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2',
                      plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {upgrading === plan.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Upgrading...</>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
