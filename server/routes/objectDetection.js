const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'object_detection', ['name', 'description', 'detection_model', 'objects_detected', 'confidence_avg', 'processing_time', 'input_type', 'status']);
