# Operations and trust boundary

Normal startup is non-destructive. Run `scripts/bootstrap.sh`, configure `.env`, apply `scripts/migrate.sh`, then use `start.sh`. Demo fixtures require `CONFIRM_DEMO_SEED=YES` and are refused in production.

Only authentication, health, and the governed conversion workflow are supported by default. Historical generated/demo routes return `410 prototype_route_quarantined`. A local developer can explicitly opt in with `ENABLE_LEGACY_PROTOTYPE_ROUTES=true`; production rejects that setting.

`/api/asset-conversion-workflows` records a checksum-addressed, size/geometry/scale/axis validated conversion manifest under a tenant. It caps compute, constrains formats and targets, and requires a separate reviewer before dispatch. Uploaded bytes must remain in quarantined object storage and GPU/render workers must enforce the approved manifest; their credentials and availability are external configuration. Approval does not claim geometry or texture fidelity until a real worker returns validation evidence.
