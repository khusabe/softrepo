import { Router } from 'express';
import { authMiddleware, changePasswordHandler, loginHandler } from './auth';
import { ipAllowlistMiddleware } from './middleware';
import {
  createCategory,
  createSoftware,
  deleteCategory,
  deleteSoftware,
  downloadSoftware,
  getSoftware,
  listCategories,
  listSoftware,
  statsOverall,
  speedTest,
  ping,
  uploadTest,
  clientIp,
  updateCategory,
  updateSoftware,
  upload,
} from './controllers';

export const router = Router();

router.get('/', (_req, res) => res.json({ message: 'API ready' }));

// Auth
router.post('/auth/login', loginHandler);
router.post('/auth/change-password', authMiddleware, changePasswordHandler);

// Categories
router.get('/categories', listCategories);
router.post('/categories', authMiddleware, createCategory);
router.put('/categories/:id', authMiddleware, updateCategory);
router.delete('/categories/:id', authMiddleware, deleteCategory);

// Software
router.get('/software', listSoftware);
router.get('/software/:id', getSoftware);
router.post('/software', authMiddleware, upload.single('file'), createSoftware);
router.put('/software/:id', authMiddleware, upload.single('file'), updateSoftware);
router.delete('/software/:id', authMiddleware, deleteSoftware);
router.get('/software/:id/download', ipAllowlistMiddleware, downloadSoftware);

// Stats
router.get('/stats/overall', authMiddleware, statsOverall);
router.get('/speed-test', speedTest);
router.get('/speed-test/ping', ping);
router.post('/speed-test/upload', uploadTest);
router.get('/speed-test/ip', clientIp);


