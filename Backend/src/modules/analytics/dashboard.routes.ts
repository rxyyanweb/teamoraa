import { Router } from 'express';
import { Company } from '../organization/company.model.js';
import { User, publicUser } from '../users/user.model.js';

export function dashboardRoutes() {
  const router = Router();
  router.get('/', async (req, res) => {
    const actor = req.auth!;
    const company = await Company.findById(actor.companyId);
    const companyInfo = {
      name: company!.name,
      timezone: company!.timezone,
      officeStart: company!.officeStart,
      officeEnd: company!.officeEnd,
    };
    if (actor.role === 'employee') return res.json({ data: { company: companyInfo, user: actor } });
    const scope = { companyId: actor.companyId, role: 'employee' };
    const [totalEmployees, activeEmployees, recentEmployees, hrAccounts] = await Promise.all([
      User.countDocuments(scope),
      User.countDocuments({ ...scope, active: true }),
      User.find(scope).sort({ createdAt: -1 }).limit(5),
      actor.role === 'admin'
        ? User.countDocuments({ companyId: actor.companyId, role: 'hr' })
        : Promise.resolve(undefined),
    ]);
    return res.json({
      data: {
        company: companyInfo,
        statistics: {
          totalEmployees,
          activeEmployees,
          departments: company!.departments.length,
          ...(hrAccounts !== undefined ? { hrAccounts } : {}),
        },
        recentEmployees: recentEmployees.map(publicUser),
      },
    });
  });
  return router;
}
