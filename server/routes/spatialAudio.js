const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'spatial_audio', ['name', 'description', 'audio_format', 'channels', 'sample_rate', 'spatialization', 'hrtf_enabled', 'duration_seconds', 'status']);
