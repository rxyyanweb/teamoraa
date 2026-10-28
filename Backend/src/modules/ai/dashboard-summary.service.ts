import { getAdminAnalytics, getHrAnalytics } from '../analytics/analytics.service.js';
import { getCompanyPolicyContext, formatPolicySystemPrompt } from './policy.service.js';
import type { GeminiProvider } from './providers/gemini.provider.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import { ApiError } from '../../utils/api-error.js';

export async function generateDashboardSummary(
  actor: AuthenticatedUser,
  gemini: GeminiProvider,
  departmentFilter?: string,
): Promise<{ insights: string[]; generatedAt: string; department: string }> {
  if (actor.role === 'employee') {
    throw new ApiError(403, 'FORBIDDEN', 'Executive dashboard summaries are reserved for Admin and HR.');
  }

  const policyContext = await getCompanyPolicyContext(actor.companyId);
  const systemPrompt = formatPolicySystemPrompt(policyContext);

  let rawMetrics: Record<string, any>;
  if (actor.role === 'admin') {
    rawMetrics = await getAdminAnalytics(actor.companyId);
  } else {
    rawMetrics = await getHrAnalytics(actor.companyId);
  }

  // Filter metrics by department if requested
  if (departmentFilter && departmentFilter !== 'all') {
    rawMetrics.filteredDepartment = departmentFilter;
    if (rawMetrics.headcountByDepartment) {
      rawMetrics.headcountByDepartment = rawMetrics.headcountByDepartment.filter(
        (d: any) => d.department.toLowerCase() === departmentFilter.toLowerCase(),
      );
    }
  }

  const insights = await gemini.generateDashboardInsights(rawMetrics, actor.role, systemPrompt);

  return {
    insights,
    generatedAt: new Date().toISOString(),
    department: departmentFilter || 'All',
  };
}
