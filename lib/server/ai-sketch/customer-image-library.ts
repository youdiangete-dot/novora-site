import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { deriveFirstPreviewGeneratedAssetId, FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES, isValidFirstPreviewAssetUuid as uuid, isValidFirstPreviewPublicReference as reference } from "./first-preview-generated-assets-contract";
import { hasPassedFirstPreviewAutomaticGateEvidence } from "./first-preview-visual-privacy-contract";
import { FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION } from "./first-preview-persistence-contract";
import { createFirstPreviewCustomerAccessProof, verifyFirstPreviewCustomerAccessProof } from "./first-preview-customer-access-contract";
import { isValidatedFirstPreviewPng, type FirstPreviewStorageClient } from "./supabase-first-preview-generated-assets";

export type LibraryOwner = Readonly<{ scope: string; identity: string }>;
export type LibraryReceipt = Readonly<{ briefId: string; publicReference: string }>;
export type LibraryCandidate = Readonly<{ receipt: LibraryReceipt; outputId: string }>;
export type LibrarySnapshot = Readonly<{ output: Record<string, unknown>; job: Record<string, unknown>; successor: Record<string, unknown> | null; currentLineageVerified: boolean }>;
export type LibraryRepository = Readonly<{
  deliveredCandidates(owner: LibraryOwner): Promise<readonly LibraryCandidate[] | null>;
  ownedReceipt(owner: LibraryOwner, publicReference: string): Promise<LibraryReceipt | null>;
  snapshot(outputId: string): Promise<LibrarySnapshot | null>;
}>;
const iso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT.*(?:Z|\+00:00)$/.test(v) && Number.isFinite(Date.parse(v));
const micros = (v: unknown) => iso(v) ? Date.parse(v) : NaN;
// Historical access is separate from the current-image/confirmation authorizer.
// Only explicit, transaction-verified supersession may retain read access.
export function safeLibraryOutput(s: LibrarySnapshot, receipt: LibraryReceipt) {
  const o=s.output,j=s.job, next=s.successor;
  if (!uuid(String(o.id)) || !uuid(String(o.job_id)) || o.concept_brief_id!==receipt.briefId || j.id!==o.job_id ||
      j.concept_brief_id!==receipt.briefId || j.status!=="succeeded" || j.generation_purpose!=="first_preview" || !iso(j.completed_at) ||
      o.bucket_name!=="novora-ai-sketches" || o.mime_type!=="image/png" || o.width_px!==1024 || o.height_px!==1024 ||
      !Number.isSafeInteger(o.byte_size) || Number(o.byte_size)<45 || Number(o.byte_size)>FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES ||
      typeof o.content_sha256!=="string" || !/^[a-f0-9]{64}$/.test(o.content_sha256) ||
      o.object_path!==deriveFirstPreviewGeneratedAssetId({conceptBriefId:receipt.briefId,jobId:String(o.job_id),outputId:String(o.id)}) ||
      o.asset_validation_status!=="passed" || o.automatic_gate_status!=="passed" || o.automatic_gate_policy_version!==FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION ||
      !hasPassedFirstPreviewAutomaticGateEvidence(o.automatic_gate_evidence,{conceptBriefId:receipt.briefId,jobId:String(o.job_id),outputId:String(o.id),contentSha256:o.content_sha256}) ||
      !iso(o.asset_created_at) || !iso(o.asset_validated_at) || !iso(o.automatic_gate_passed_at) || !iso(o.first_preview_ready_at) ||
      micros(o.asset_created_at)>micros(o.asset_validated_at) || micros(o.asset_validated_at)>micros(j.completed_at) || micros(j.completed_at)>micros(o.automatic_gate_passed_at) ||
      micros(o.automatic_gate_passed_at)>micros(o.first_preview_ready_at) || micros(j.completed_at)>micros(o.first_preview_ready_at) ||
      o.customer_history_state==="withdrawn") return null;
  const current=s.currentLineageVerified===true&&o.customer_history_state===null&&o.readiness_status==="first_preview_ready"&&o.is_current_customer_preview===true&&o.readiness_revoked_at===null;
  const historical=o.customer_history_state==="superseded"&&o.readiness_status==="revoked"&&o.is_current_customer_preview===false&&
    iso(o.readiness_revoked_at)&&next?.concept_brief_id===receipt.briefId&&next?.source_output_id===o.id&&next?.status==="succeeded"&&
    next?.superseded_at===o.readiness_revoked_at&&uuid(String(next?.id));
  if (!current&&!historical) return null;
  return {outputId:String(o.id),publicReference:receipt.publicReference,generatedAt:o.asset_created_at,current,
    // These values stay server-side; never return the object path or gate evidence.
    assetId:String(o.object_path),bytes:Number(o.byte_size),sha256:o.content_sha256};
}

export function createCustomerImageLibrary(deps: Readonly<{
  authenticate(request: Request): LibraryOwner | null;
  repository: LibraryRepository; storage: FirstPreviewStorageClient; signingSecret: string;
  now?:()=>number; active(owner:LibraryOwner):boolean;
}>) {
  const now=deps.now??(()=>Math.floor(Date.now()/1000));
  function ownerFor(request:Request) {
    const owner=deps.authenticate(request);if(!owner||!deps.active(owner))return null;
    return owner;
  }
  async function owned(request:Request,ref:string) {
    if(!reference(ref))return null;const owner=ownerFor(request);if(!owner)return null;
    const receipt=await deps.repository.ownedReceipt(owner,ref);
    return receipt&&uuid(receipt.briefId)&&receipt.publicReference===ref&&deps.active(owner)?{owner,receipt}:null;
  }
  async function selected(request:Request,ref:string,id:string) {
    if(!reference(ref)||!uuid(id))return null;
    const context=await owned(request,ref);if(!context)return null;const {receipt}=context;
    const snapshot=await deps.repository.snapshot(id),asset=snapshot&&safeLibraryOutput(snapshot,receipt);
    return asset?{...context,receipt,asset}:null;
  }
  return {
    async list(request:Request) {
      const owner=ownerFor(request);if(!owner)return null;
      const candidates=await deps.repository.deliveredCandidates(owner);if(!candidates||candidates.length>48)return null;
      const items=[],seen=new Set<string>();
      for(const candidate of candidates){
        if(!uuid(candidate.outputId)||seen.has(candidate.outputId))return null;seen.add(candidate.outputId);
        // Recheck exact scoped ownership; candidate joins are not authorization.
        const context=await owned(request,candidate.receipt.publicReference);
        if(!context||context.receipt.briefId!==candidate.receipt.briefId)continue;
        const s=await deps.repository.snapshot(candidate.outputId),a=s&&safeLibraryOutput(s,context.receipt);
        if(a)items.push({outputId:a.outputId,publicReference:a.publicReference,generatedAt:a.generatedAt,current:a.current});
      }
      return deps.active(owner)?items:null;
    },
    async session(request:Request,ref:string) {
      const context=await owned(request,ref);if(!context)return null;const r=context.receipt;
      return createFirstPreviewCustomerAccessProof({briefId:r.briefId,publicReference:ref,nonce:randomUUID().replaceAll("-",""),issuedAt:now()},deps.signingSecret);
    },
    async image(request:Request,ref:string,id:string,cookie:string|null) {
      const before=await selected(request,ref,id);if(!before||!cookie)return null;
      const proof=verifyFirstPreviewCustomerAccessProof(cookie,deps.signingSecret,now());
      if(!proof||proof.briefId!==before.receipt.briefId||proof.publicReference!==ref)return null;
      const bucket=await deps.storage.inspectBucket("novora-ai-sketches");
      if(bucket.error||bucket.data?.isPublic!==false)return null;
      const object=await deps.storage.inspectObject("novora-ai-sketches",before.asset.assetId);
      if(object.error||object.data?.byteSize!==before.asset.bytes||object.data?.mimeType!=="image/png"||Date.parse(object.data?.createdAt??"")!==Date.parse(before.asset.generatedAt))return null;
      const downloaded=await deps.storage.downloadObject("novora-ai-sketches",before.asset.assetId),bytes=downloaded.data;
      if(downloaded.error||!bytes)return null;
      if(bytes.byteLength!==before.asset.bytes||createHash("sha256").update(bytes).digest("hex")!==before.asset.sha256||!isValidatedFirstPreviewPng(bytes))return null;
      const after=await selected(request,ref,id);
      if(!after||JSON.stringify(after.asset)!==JSON.stringify(before.asset)||!verifyFirstPreviewCustomerAccessProof(cookie,deps.signingSecret,now()))return null;
      return new Uint8Array(bytes);
    },
  };
}
