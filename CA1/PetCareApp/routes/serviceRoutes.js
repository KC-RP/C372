const express = require('express');
const { isCustomer, isAdmin } = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');

const router = express.Router();

router.get('/services', isCustomer, serviceController.listServices);
router.get('/admin/services', isAdmin, serviceController.listAdminServices);
router.get('/admin/services/new', isAdmin, serviceController.showNewService);
router.post('/admin/services', isAdmin, serviceController.createService);
router.get('/admin/services/:id/edit', isAdmin, serviceController.showEditService);
router.post('/admin/services/:id/edit', isAdmin, serviceController.updateService);
router.post('/admin/services/:id/delete', isAdmin, serviceController.deleteService);

module.exports = router;
