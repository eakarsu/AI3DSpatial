const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'materials', ['name', 'description', 'material_type', 'shader_model', 'render_engine', 'pbr_workflow', 'transparency', 'status']);
