const Service = require('../models/serviceModel');
const Pet = require('../models/petModel');

function parseServiceInput(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const costInput = typeof body.cost === 'string' ? body.cost.trim() : '';
  const durationInput = typeof body.duration === 'string' ? body.duration.trim() : '';
  const cost = Number(costInput);
  const duration = Number(durationInput);

  if (!name || name.length > 100) return { error: 'Enter a service name of 1 to 100 characters.' };
  if (description.length > 65535) return { error: 'The service description is too long.' };
  if (!/^\d+(\.\d{1,2})?$/.test(costInput) || !Number.isFinite(cost) || cost < 0 || cost > 99999999.99) {
    return { error: 'Enter a valid service price with up to two decimal places.' };
  }
  if (!/^\d+$/.test(durationInput) || !Number.isInteger(duration) || duration < 1 || duration > 65535) {
    return { error: 'Enter a service duration between 1 and 65535 minutes.' };
  }

  return { name, description: description || null, cost, duration };
}

function listServices(req, res) {
  Service.findActive((err, services) => {
    if (err) {
      console.error('Error loading services:', err);
      return res.status(500).send('Unable to load services.');
    }

    Pet.findByOwnerId(req.session.user.id, (petErr, pets) => {
      if (petErr) {
        console.error('Error loading customer pets for services:', petErr);
        return res.status(500).send('Unable to load your pets.');
      }

      res.render('services', {
        services,
        pets,
        session: req.session,
        errors: req.flash('error'),
        messages: req.flash('success')
      });
    });
  });
}

function listAdminServices(req, res) {
  Service.findAll((err, services) => {
    if (err) {
      console.error('Error loading admin services:', err);
      return res.status(500).send('Unable to load services.');
    }

    res.render('adminServices', {
      services,
      session: req.session,
      errors: req.flash('error'),
      messages: req.flash('success')
    });
  });
}

function showNewService(req, res) {
  res.render('serviceForm', {
    service: null,
    action: '/admin/services',
    session: req.session,
    errors: req.flash('error')
  });
}

function createService(req, res) {
  const input = parseServiceInput(req.body);
  if (input.error) {
    req.flash('error', input.error);
    return res.redirect('/admin/services/new');
  }

  Service.create(input.name, input.description, input.cost, input.duration, (err) => {
    if (err) {
      console.error('Error creating service:', err);
      req.flash('error', 'Unable to create the service.');
      return res.redirect('/admin/services/new');
    }

    req.flash('success', 'Service added.');
    res.redirect('/admin/services');
  });
}

function showEditService(req, res) {
  const serviceId = Number(req.params.id);
  if (!Number.isSafeInteger(serviceId) || serviceId < 1) return res.status(404).send('Service not found.');

  Service.findById(serviceId, (err, results) => {
    if (err) {
      console.error('Error loading service for editing:', err);
      return res.status(500).send('Unable to load the service.');
    }
    if (!results.length || !results[0].is_active) return res.status(404).send('Service not found.');

    res.render('serviceForm', {
      service: results[0],
      action: `/admin/services/${serviceId}/edit`,
      session: req.session,
      errors: req.flash('error')
    });
  });
}

function updateService(req, res) {
  const serviceId = Number(req.params.id);
  if (!Number.isSafeInteger(serviceId) || serviceId < 1) return res.status(404).send('Service not found.');
  const input = parseServiceInput(req.body);
  if (input.error) {
    req.flash('error', input.error);
    return res.redirect(`/admin/services/${serviceId}/edit`);
  }

  Service.update(serviceId, input.name, input.description, input.cost, input.duration, (err, result) => {
    if (err) {
      console.error('Error updating service:', err);
      req.flash('error', 'Unable to update the service.');
      return res.redirect(`/admin/services/${serviceId}/edit`);
    }
    if (!result.affectedRows) return res.status(404).send('Active service not found.');

    req.flash('success', 'Service updated.');
    res.redirect('/admin/services');
  });
}

function deleteService(req, res) {
  const serviceId = Number(req.params.id);
  if (!Number.isSafeInteger(serviceId) || serviceId < 1) return res.status(404).send('Service not found.');

  Service.deactivate(serviceId, (err, result) => {
    if (err) {
      console.error('Error deactivating service:', err);
      req.flash('error', 'Unable to delete the service.');
      return res.redirect('/admin/services');
    }
    if (!result.affectedRows) {
      req.flash('error', 'The service was not found or is already inactive.');
      return res.redirect('/admin/services');
    }

    req.flash('success', 'Service removed from the customer catalogue.');
    res.redirect('/admin/services');
  });
}

module.exports = {
  listServices,
  listAdminServices,
  showNewService,
  createService,
  showEditService,
  updateService,
  deleteService
};
