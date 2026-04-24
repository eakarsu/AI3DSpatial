const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'vr_environments', ['name', 'description', 'environment_type', 'platform', 'resolution', 'fps_target', 'interactive_elements', 'status']);
