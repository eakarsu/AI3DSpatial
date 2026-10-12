BEGIN;
-- Add only an honest planning state; every original native authority state is retained.
ALTER TABLE asset_conversion_workflows DROP CONSTRAINT IF EXISTS asset_conversion_workflows_status_check;
ALTER TABLE asset_conversion_workflows ADD CONSTRAINT asset_conversion_workflows_status_check CHECK(status IN ('draft','validated','pending_approval','approved_for_worker','rejected','failed','verified','validation_failed'));
COMMIT;
