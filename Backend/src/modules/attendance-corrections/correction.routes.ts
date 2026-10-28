import { Router } from 'express';
import { requireRole } from '../../middleware/security.js';
import { objectIdInput, decisionInput } from '../../utils/workforce-validation.js';
import { correctionInput, correctionListInput } from './correction.validation.js';
import { requestCorrection, decideCorrection } from './correction.service.js';
import { listCorrections, correctionDetails } from './correction-query.service.js';
export function correctionRoutes() {
  const router = Router();
  router.post('/', requireRole('employee'), async (req, res) =>
    res
      .status(201)
      .json({ data: await requestCorrection(req.auth!, correctionInput.parse(req.body)) }),
  );
  router.get('/', async (req, res) =>
    res.json({ data: await listCorrections(req.auth!, correctionListInput.parse(req.query)) }),
  );
  router.get('/:id', async (req, res) =>
    res.json({ data: await correctionDetails(req.auth!, objectIdInput.parse(req.params.id)) }),
  );
  for (const [path, decision] of [
    ['approve', 'approved'],
    ['reject', 'rejected'],
  ] as const) {
    router.post(`/:id/${path}`, requireRole('hr'), async (req, res) =>
      res.json({
        data: await decideCorrection(
          req.auth!,
          objectIdInput.parse(req.params.id),
          decision,
          decisionInput.parse(req.body).comment,
        ),
      }),
    );
  }
  return router;
}
