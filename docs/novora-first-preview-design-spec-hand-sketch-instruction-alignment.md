# NOVORA First Preview Design Spec And Hand Sketch Instruction Alignment

## 1. Purpose

This document plans how a submitted customer Concept Brief should be transformed
into fixed Design Spec JSON and a fixed Hand Sketch Instruction before any
future first-preview image generation.

This is planning only:

- No image generation is implemented.
- No prompt is executed.
- No OpenAI or image API is connected.
- No app route or UI is changed.
- No SQL or Supabase change occurs.
- No logo, image, or asset file is created or modified.

The required planning chain is:

```text
raw customer brief
-> normalized customer intent
-> fixed Design Spec JSON
-> validation / missing-field handling
-> fixed Hand Sketch Instruction
-> first-preview prompt package
-> generated first preview
-> customer feedback
-> human correction / regeneration
```

Raw customer natural language must not be used directly as the final
image-generation instruction.

## 2. Confirmed Product Direction

Confirmed direction from recent owner and Agent 61 planning:

- Customers should see the first AI-generated hand-sketch concept as soon as
  possible after submitting a Concept Brief.
- Limited beta remains invite-only.
- Limited beta size is 5-10 users.
- Target language options are English and Traditional Chinese.
- Automatic submission response is desired.
- Human correction focuses on structure logic, jewelry construction, craft,
  production feasibility, view consistency, setting logic, proportions,
  customer request mismatch, unsafe claims, correction, and regeneration.
- The first sketch is a concept preview only. It is not CAD, not a quote, not
  order approval, not payment approval, and not production approval.

This direction updates the future product path from earlier email-only
planning, but it does not make AI sketches final, production-ready, or approved
for CAD, quote, payment, order, or production.

## 3. Required Transformation Pipeline

Future first-preview generation should use a controlled transformation pipeline:

1. Preserve the raw customer brief as source input and audit context.
2. Normalize customer intent into structured, contact-independent design
   meaning.
3. Create fixed Design Spec JSON with explicit unknowns, constraints, avoid
   rules, language, and version fields.
4. Validate the Design Spec for required fields, contradictions, unsafe claims,
   private data leakage, and missing information.
5. Create a fixed Hand Sketch Instruction from the Design Spec, not directly
   from the raw brief.
6. Assemble a first-preview prompt package from the Design Spec, Hand Sketch
   Instruction, reference image summaries, safety rules, NOVORA brand/style
   rules, output metadata, and version identifiers.
7. Generate the first preview only in a future separately approved generation
   implementation.
8. Capture customer feedback without overwriting original customer intent.
9. Route structure, craft, feasibility, mismatch, or safety issues to human
   correction or regeneration.

The final prompt package must be traceable to structured artifacts and version
records. It must not be a pasted customer note with light wrapper text.

## 4. Design Spec JSON Planning

Future Design Spec JSON for first preview generation should be an internal,
versioned, structured artifact. Field names below are planning candidates unless
already implemented by later code or schema work.

Candidate top-level sections:

- `metadata`: source type, public reference when available, artifact id,
  creation path, schema version, prompt policy version, and units.
- `customer_language`: original customer-selected language, normalized
  processing language, and customer-facing summary language.
- `piece_type`: ring, pendant, necklace, bracelet, bangle, earrings, or other
  custom piece.
- `design_goal`: concept purpose, wearer, occasion, emotion, must-have details,
  and nice-to-have details.
- `target_customer_style`: style keywords, mood, silhouette, surface language,
  complexity, and cultural or era references when safe.
- `metal`: metal color direction, material preference, finish, uncertainty, and
  unsupported material notes.
- `stone_plan`: no stone, center stone, repeated stones, multi-stone layout, or
  unknown.
- `center_stone`: family, color direction, shape, size relationship, lab or
  natural preference if known, and setting direction.
- `side_stones`: layout, count direction, size relationship, shape, color, and
  setting direction.
- `setting_plan`: prong, bezel, pave, channel, invisible setting, flush,
  cluster, or other planned setting logic.
- `motif_elements`: symbols, initials, botanical elements, zodiac elements,
  texture, engraving, or other motif direction.
- `structure`: piece construction, connections, support logic, shank, bail,
  loop, hinge, clasp, station, or articulation notes.
- `dimensions_or_scale`: stated dimensions, broad scale, unknown sizes, and
  production-later caveats.
- `reference_image_summary`: count, roles, safe visual cues, copy-risk flags,
  and inspiration-only instructions.
- `constraints`: customer constraints, NOVORA MVP constraints, privacy
  constraints, production-awareness constraints, and beta constraints.
- `avoid_list`: customer dislikes, unsafe claims, impossible construction,
  exact copying, unsupported options, and known owner rules.
- `production_feasibility_notes`: early internal cautions only, not production
  approval.
- `customer_visible_summary`: concise concept direction summary in the selected
  language, excluding internal notes and private data.
- `internal_generation_notes`: sketch guidance, style guardrails, privacy
  guardrails, and human correction hints.
- `missing_information`: required and optional unknowns, safe defaults, and
  follow-up needs.
- `confidence_flags`: ambiguity, contradiction, stone risk, structure risk,
  reference-copying risk, and customer-expectation risk.
- `version`: Design Spec schema version, transformation policy version, source
  snapshot version, and stale/superseded state when later implemented.

The Design Spec must not include customer contact details, protected storage
paths, provider keys, raw admin notes, reviewer notes, or production approval
language.

## 5. Jewelry-Type Specific Fields

Type-specific fields should be included only when relevant and should preserve
unknowns instead of inventing precision.

Ring candidates:

- Ring size system and value if known.
- Band width and width uncertainty.
- Band profile, such as flat, rounded, knife-edge, domed, or unknown.
- Center stone size direction.
- Prong count and prong type.
- Side stone layout.
- Shank structure, shoulders, split shank, bypass, or halo relationship.
- Comfort and wearability notes.
- Height and snag-risk notes.

Pendant / necklace candidates:

- Pendant dimensions or broad scale.
- Bail, loop, hidden bail, integrated bail, or connector structure.
- Chain relationship if applicable.
- Front, side, and thickness notes.
- Chain length, chain type, station spacing, or manual chain confirmation when
  applicable.
- Bail strength and pendant weight cautions.

Bracelet / bangle candidates:

- Inner circumference, size system, or unknown wrist sizing.
- Bangle, cuff, chain bracelet, tennis bracelet, station bracelet, or other
  structure.
- Clasp, hinge, opening, safety chain, or closure logic.
- Stone repeat pattern, articulation, comfort, and snag-risk notes.

Earrings candidates:

- Single, pair, stud, hoop, huggie, drop, dangle, or climber form.
- Post, hook, clip, hinge, or closure direction.
- Pair symmetry, left/right variation, drop length, weight, and balance notes.
- Front view plus side/profile view when thickness or dangle structure matters.

Other custom piece candidates:

- Wear location and attachment logic.
- Required views needed to understand structure.
- Special scale, movement, safety, or manual review notes.
- Unsupported or out-of-model details that need human follow-up.

## 6. Stone And Setting Logic Planning

Structured stone and setting fields should cover:

- No stone.
- Center stone.
- Repeated stones.
- Multi-stone layout.
- Stone type or family.
- Natural versus lab preference if known.
- Color direction.
- Shape.
- Size relationship.
- Setting type.
- Prong logic.
- Bezel, pave, channel, invisible setting, flush, cluster, or other setting if
  applicable.
- Stone placement consistency across views.
- Owner-defined avoid rules for symbolically sensitive positions.

Known owner rule:

- For zodiac mouse designs, do not use ruby or red gemstones for the mouse's
  eyes because the owner considers it inauspicious. Use green, black,
  jadeite/emerald tone, or dark neutral stones for eyes instead when needed.

Stone and setting planning must not imply certification, sourcing confirmation,
availability, final quality, final price, CAD approval, or production approval.

## 7. Structure And Production Logic Checks

Before any future image generation, the system or reviewer should check:

- Main view and side/angle view consistency.
- Prong count and prong type consistency.
- Stone placement consistency.
- Metal support feasibility.
- Wearable thickness.
- Bail, loop, ring shank, clasp, hinge, or connector logic.
- Enamel, filigree, hard-gold, openwork, or tiny-detail feasibility if
  requested.
- No floating unsupported stones.
- No impossible pave layout.
- No contradictory dimensions.
- No customer request mismatch.
- No unsafe or misleading claim.
- No copy-exact reference image request.
- No customer contact or private data in generation-facing content.

These checks are production-aware guardrails only. Passing them does not make
the sketch production-ready.

## 8. Hand Sketch Instruction Template Planning

Future Hand Sketch Instructions should be generated from Design Spec JSON using
a fixed section order. Section names below are planning candidates unless later
implemented.

Candidate sections:

- `role_and_output_type`: internal role, customer concept preview target, and
  concept-only output boundary.
- `NOVORA_brand_style`: brand tone, sketch-sheet identity, subtle mark
  placement, and unified style version.
- `jewelry_concept_summary`: concise structured summary from the Design Spec.
- `required_views`: main view, side view, angle view, detail callouts, or type
  specific views.
- `composition`: layout, focal point, proportions, scale indicator, and
  annotation placement.
- `line_style`: clean jewelry hand sketch, consistent line weight, controlled
  hatching, and non-CAD looseness.
- `material_rendering`: metal color direction, finish, texture, and avoid
  final material claims.
- `stone_rendering`: shape, color direction, sparkle style, setting logic, and
  avoid over-rendered certification claims.
- `structural_callouts`: prongs, shank, bail, loop, hinge, clasp, thickness, or
  support notes.
- `customer_facing_disclaimer_requirement`: concept preview only, not CAD, not
  quote, not order/payment/production approval.
- `NOVORA_logo_watermark_requirement`: subtle non-intrusive brand mark or open
  asset decision.
- `avoid_list`: customer dislikes, owner rules, unsafe claims, exact copying,
  logo-as-jewelry, and impossible construction.
- `quality_checklist`: brief match, structure logic, stone logic, view
  consistency, branding placement, and disclaimer presence.
- `output_constraints`: no provider secrets, no private data, no raw storage
  paths, no final approval language.
- `version`: Hand Sketch Instruction template version, style guide version,
  brand placement version, disclaimer version, and prompt package version.

The instruction should be reviewable, deterministic, and stable enough for
future tests and version comparison.

## 9. NOVORA Logo / Branding Placement Plan

Future generated sketches should include subtle NOVORA branding, but the brand
mark must never become part of the jewelry design unless explicitly requested
later by a customer and separately reviewed.

Acceptable future placement concepts:

- Subtle corner watermark.
- Small footer signature.
- Branded sketch sheet frame.
- Title block or preview sheet label.
- Optional `NOVORA concept preview` label.

Requirements:

- The logo or brand mark must not be part of the jewelry structure.
- It must not be mistaken as engraving unless explicitly requested and
  reviewed.
- It must not cover the design.
- It must not cover annotations.
- It must not interfere with stone placement, proportions, structure, scale
  notes, or customer interpretation.
- If the official logo asset is unavailable, planning may use a text-only
  NOVORA brand mark or leave the asset path as an open decision.
- Future implementation should prefer an official asset if available.
- Customer-facing image output should still include concept-preview boundary
  wording near or around the sketch if implemented later.

No logo asset is created or modified by this planning task. Targeted repo
search found text NOVORA branding and image assets, but no documented official
NOVORA logo asset path for generated sketch branding.

## 10. Unified NOVORA Sketch Style Plan

Future first-preview sketches should use a recognizable NOVORA sketch identity:

- Clean luxury jewelry hand-sketch look.
- Warm white or light paper background.
- Consistent line weight.
- Controlled shading.
- Clear jewelry silhouette.
- Consistent stone sparkle rendering.
- Consistent metal hatching.
- Consistent annotation style.
- Consistent scale indicator.
- Consistent layout for main view plus optional side or angle detail.
- Consistent NOVORA brand mark placement.
- Consistent disclaimer or concept-preview label placement.

Different jewelry types may vary in composition, view requirements, and detail
callouts, but the overall NOVORA sketch identity should remain recognizable
between generations.

Style versioning should make future outputs comparable. A future style guide
could start with a planning label such as `novora_first_preview_sketch_style_v1`,
but the exact version name remains an open decision.

## 11. First Preview Prompt Package Planning

The final first-preview prompt package should be assembled from controlled
sources:

- Design Spec JSON.
- Hand Sketch Instruction.
- Reference image summaries, not raw protected storage internals.
- Safety and avoid list.
- NOVORA brand style.
- Unified sketch style version.
- Logo or branding placement instruction.
- Disclaimer and concept-preview boundary instruction.
- Output metadata fields.

Candidate package metadata:

- `design_spec_schema_version`
- `hand_sketch_instruction_template_version`
- `novora_sketch_style_version`
- `brand_placement_instruction_version`
- `disclaimer_copy_version`
- `prompt_package_version`
- `generation_purpose`
- `concept_brief_public_reference`
- `customer_language`
- `provider_model_parameters` if later approved

This document does not write provider-specific API code and does not call any
image API.

## 12. Bilingual Input And Output Planning

Future English and Traditional Chinese support should:

- Preserve original customer language.
- Store a structured spec language field.
- Avoid losing jewelry meaning during translation.
- Allow customer-facing summary in the selected language.
- Allow internal generation prompts to use a stable language if needed.
- Keep disclaimers and feedback labels bilingual-ready.
- Preserve Traditional Chinese terminology where the customer selected it.
- Avoid mixing translated customer meaning with unsupported claims or invented
  details.

The exact prompt language strategy remains an open decision. If internal prompts
use a stable language, the system should still preserve customer-selected
language and customer-facing summary language for display and feedback.

## 13. Reference Image Handling

Reference images should affect the Design Spec and Hand Sketch Instruction
through reviewed summaries and roles, not through unchecked copying.

Planned handling:

- Summarize visual cues.
- Avoid copying protected designs exactly.
- Capture style direction.
- Capture motifs and material cues.
- Capture silhouette, scale, texture, stone layout, or mood when safe.
- Preserve customer intent.
- Avoid overfitting to reference images.
- Flag copy-risk when the customer asks for an exact match.
- Never expose storage internals, protected URLs, private file names, or raw
  reference metadata to customers.

Any future forwarding of reference images or image-derived content to an
external provider requires separate privacy, copy-risk, storage, and provider
approval.

## 14. Missing Information Handling

Future Design Spec JSON should represent missing information explicitly.

Planned handling:

- Required fields: piece type, broad design goal, customer language, concept
  boundary, Design Spec version, and enough structure to avoid generating a
  meaningless sketch.
- Optional fields: exact dimensions, exact stone size, exact carat weight,
  exact chain type, exact ring size, exact finish, and final material details.
- `not sure` handling: preserve as unknown or manual follow-up rather than
  forcing a choice.
- Safe defaults: broad visual composition defaults may be used only when they
  do not imply final specs, price, sourcing, production feasibility, or
  customer approval.
- Proceed with first preview when enough information exists for a safe concept
  direction and missing details can be labeled as concept-only.
- Ask follow-up or route to human review when missing details would make the
  sketch misleading, structurally impossible, symbolically risky, privacy
  sensitive, or likely to mismatch the customer request.
- Represent missing information in `missing_information`, `unknowns`, or
  `confidence_flags`.
- Reflect missing information in the prompt package with uncertainty language,
  not hallucinated certainty.

Never invent exact gemstone sizes, carat weights, CAD constraints, pricing,
delivery dates, production feasibility, customer approval, or final material
availability.

## 15. Human Correction Prompt Separation

First-preview prompts and correction/regeneration prompts should be separate
artifact types or prompt package purposes.

First preview prompt:

- Generates a fast concept direction.
- Uses the first reviewed Design Spec and Hand Sketch Instruction.
- Prioritizes broad design communication, brand style, structure sanity, and
  concept-preview disclaimers.

Correction or regeneration prompt:

- Uses customer feedback and/or human reviewer findings.
- Targets specific structure, craft, logic, proportion, view, setting, or
  mismatch errors.
- Preserves original customer intent unless a customer or reviewer explicitly
  changes it.
- Records what changed, why, and which prior output it supersedes.
- Keeps correction history traceable.

Correction prompts must not silently overwrite original customer intent, remove
boundary wording, remove NOVORA brand/style requirements, or turn feedback into
CAD, quote, payment, order, or production approval.

## 16. Quality Checklist Before Generation

Before any future image generation, confirm:

- Design Spec is valid enough.
- Hand Sketch Instruction is generated.
- Required disclaimers are included.
- NOVORA brand/style version is included.
- Logo or watermark placement instruction is included.
- Customer language is preserved.
- Jewelry type is identified.
- Stone and setting logic is not contradictory.
- Known avoid rules are applied.
- Reference images are inspiration-only.
- Missing information is represented without hallucinated certainty.
- Private customer contact data is excluded.
- Output remains concept preview only.

If these checks fail, generation should pause for validation, human review,
customer clarification, or manual fallback.

## 17. Output Review Checklist After Generation

After future generation, review the output for:

- Sketch matches the piece type.
- NOVORA logo or brand mark appears in the correct non-intrusive location.
- Sketch style is broadly NOVORA-consistent.
- Structure is plausible.
- Stone setting logic is plausible.
- Main and side views do not contradict each other.
- Disclaimers or concept-preview labels are present where required.
- No CAD, quote, payment, order, or production approval is implied.
- No unsafe or misleading claims appear.
- No private customer data, protected storage path, provider payload, or raw
  prompt content appears.
- No reference image appears copied exactly.
- Obvious errors are routed to human correction or regeneration.

Generation success alone must not equal production approval, gallery approval,
CAD approval, quote approval, order approval, or payment approval.

## 18. Versioning Plan

Future first-preview work should version:

- Design Spec schema.
- Concept Brief to Design Spec transformation policy.
- Hand Sketch Instruction template.
- NOVORA sketch style guide.
- Logo / brand placement instruction.
- Disclaimer copy.
- Prompt package.
- Reference image handling policy.
- Missing information policy.
- Human correction prompt policy.
- Model/provider parameters if later used.

Version identifiers should be recorded with artifacts and outputs so future
teams can compare generations, detect stale artifacts, reproduce prompt
packages where appropriate, and improve the sketch style without losing audit
history.

## 19. Implementation Sequencing

Recommended future agents:

- Agent 61E: SQL packet draft for preview lifecycle and feedback records.
- Agent 61F: customer preview route skeleton behind mock states, no live image
  generation.
- Agent 61G: Design Spec JSON helper and fake fixture planning or
  implementation.
- Agent 61H: Hand Sketch Instruction builder planning or implementation.
- Agent 61I: server-side generation orchestration plan.
- Later agent: live image API integration only after env, storage, rate-limit,
  cost, error handling, privacy, disclaimers, branding, and data model are
  ready.

Keep SQL, UI, API, provider integration, storage, feedback, privacy/legal,
assets, and Production verification in separate approval boundaries unless a
future task explicitly narrows that scope.

## 20. Open Decisions

Unresolved decisions:

- Exact official NOVORA logo asset path.
- Whether generated image should include logo as raster watermark, SVG overlay,
  text mark, or post-processing frame.
- Exact brand mark placement.
- Exact unified sketch style version name.
- Exact Design Spec JSON schema.
- Exact Hand Sketch Instruction template.
- Exact provider/model.
- Exact prompt language strategy.
- Exact preview route.
- Exact feedback fields.
- Exact generation budget.
- Maximum sketches per brief.
- Maximum retries per brief.
- Exact Privacy / Terms timing.
- Final go/no-go owner.
- Whether first preview can show before human review and what automated gates
  must pass if so.
- Exact access token or signed-link strategy for customer preview assets.

Do not invent these answers during implementation.

## 21. Stop Conditions

Stop before any request to:

- Call an image API in this planning task.
- Use raw customer brief text directly as the final generation prompt.
- Remove the Design Spec or Hand Sketch Instruction step.
- Generate a sketch without NOVORA branding or style constraints after the
  owner requested them.
- Make the logo part of the jewelry design without explicit customer request
  and separate review.
- Present first preview as CAD, quote, order, payment, or production approval.
- Remove disclaimers.
- Remove the human correction path.
- Expose provider keys client-side.
- Mutate Supabase or Production data.
- Execute SQL or create migrations.
- Create, edit, or move logo/image assets.
- Launch broad public traffic before beta gates, privacy, rate-limit, cost, and
  abuse controls are resolved.
