import { Router } from 'express';
import type { MeasurementService } from '../services/measurements.js';
import {
  createSchema,
  idSchema,
  listSchema,
  paginationSchema,
  zoneSchema,
} from '../validators/schemas.js';
export function apiRouter(service: MeasurementService): Router {
  const router = Router();
  router.get('/measurements', (req, res) =>
    res.json(service.list(listSchema.parse(req.query))),
  );
  router.get('/measurements/:id', (req, res) =>
    res.json({ data: service.find(idSchema.parse(req.params.id)) }),
  );
  router.post('/measurements', async (req, res) => {
    const result = await service.create(createSchema.parse(req.body));
    res
      .location(`/api/v1/measurements/${result.id}`)
      .status(201)
      .json({ data: result });
  });
  router.get('/zones', (req, res) => {
    const q = paginationSchema.parse(req.query);
    res.json(service.listZones(q.page, q.limit));
  });
  router.post('/zones', (req, res) =>
    res
      .status(201)
      .json({ data: service.createZone(zoneSchema.parse(req.body)) }),
  );
  return router;
}
