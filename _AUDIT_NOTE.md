# Audit Apply Note — AI3DSpatial

## Audit recommendations (from batch_00.md)

The audit reports 0 AI endpoints. **This is a scanner false-negative.** Inspecting `server/routes/ai.js` shows ~16 AI endpoints (model gen, AR scene, VR env, texture, animation, point-cloud, digital twin, mesh optimize, spatial map, object detect, scene reconstruct, material, asset, hologram, spatial audio, scene gen). All are wired through OpenRouter with FEATURE_TABLE_MAP / PERSIST_FEATURE_MAP routing.

### Missing AI counterparts (per audit)
- AI mesh optimization (neural compression) — already covered by `/optimize-mesh`
- AI scene generation from text prompts — already covered by `/generate-scene`
- AI object detection from images — already covered by `/detect-objects`
- AI spatial mapping from camera feeds — already covered by `/generate-spatial-map`
- AI scene reconstruction from photo sequences — already covered by `/reconstruct-scene`
- AI material recommendation based on use case — already covered by `/generate-material`

### Missing non-AI features
- Collaborative real-time editing (multi-user sync)
- Physics simulation
- Lighting simulation (global illumination)
- Performance profiling

### Custom feature suggestions
- Text-to-scene generation, automatic photogrammetry, AI material synthesis, multiplayer sync, neural scene compression

## Implemented in this pass

None. The audit's "0 AI endpoints" finding is incorrect — endpoints already exist and cover every recommended AI counterpart. No mechanical change needed.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| Real-time multiplayer sync | TOO-RISKY | WebSocket + CRDT design |
| Physics simulation | TOO-RISKY | Heavy compute / library deps |
| Lighting simulation | TOO-RISKY | Compute-heavy |
| Performance profiling | NEEDS-PRODUCT-DECISION | Metric definitions |
| Neural scene compression | TOO-RISKY | ML codec |

## Apply pass 5 (all backlog)

Implemented every remaining backlog item as additive AI advisor endpoints
(no live multiplayer / physics / GI / neural codec runtime — those remain
NEEDS-PRODUCT-DECISION / TOO-RISKY for live execution but their *design plans*
are now AI-driven):

- BE (`server/routes/ai.js`): `POST /api/ai/performance-profile`,
  `POST /api/ai/physics-simulation`, `POST /api/ai/lighting-simulation`,
  `POST /api/ai/neural-compression`, `POST /api/ai/collaboration-plan`. All
  five gate on `OPENROUTER_API_KEY` (return `503 + missing: OPENROUTER_API_KEY`
  when unset) and follow the existing `callOpenRouter` + `parseAIJson` +
  `persistAiResult` pattern. PRODUCT-DECISIONs documented in-code: each
  endpoint returns a *plan*, not a live simulator/codec/multiplayer runtime.
- FE: New `client/src/pages/AdvisorPage.js` exposing all five advisors via a
  single tabbed page, with explicit 503 banner support; routed at `/advisors`
  in `App.js`; sidebar entry added on `Dashboard.js`.

Smoke test: started backend on port 3855, login OK
(`demo@ai3dspatial.com` / `password123`), `POST /api/ai/performance-profile`
returned a structured forecast (live OpenRouter call, JSON parsed). Re-run
with `OPENROUTER_API_KEY=""` returned the expected 503 + `missing` payload.
Cleaned up server process after test.

## Apply pass 3 (frontend)

Verified the React client already surfaces every AI endpoint via the generic
`client/src/pages/FeaturePage.js`, driven by per-feature config in
`client/src/config/features.js` (each feature has `aiEndpoint`, `aiPromptHint`,
form fields, and rendered AI response). Auth uses `localStorage` `token` →
`Authorization: Bearer …`. **Action: LEFT-AS-IS — FE already wired.** No files
modified in pass 3.
