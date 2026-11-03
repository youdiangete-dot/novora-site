import "server-only";
import { createSupabaseAdminClientOrNull } from "../supabase";
import { authenticateScopedReceiptRequest, isScopedReceiptOwnerActive } from "./beta-admission";
import { createFirstPreviewStorageClient } from "./supabase-first-preview-generated-assets";
import { createCustomerImageLibrary, type LibraryRepository, type LibrarySnapshot } from "./customer-image-library";
import { createFirstPreviewCustomerViewDatabaseClient, createSupabaseFirstPreviewCustomerViewStateSource } from "./supabase-first-preview-customer-view";

const columns="id,job_id,concept_brief_id,bucket_name,object_path,mime_type,byte_size,width_px,height_px,content_sha256,asset_created_at,asset_validated_at,asset_validation_status,automatic_gate_status,automatic_gate_evidence,automatic_gate_policy_version,automatic_gate_passed_at,readiness_status,is_current_customer_preview,readiness_revoked_at,first_preview_ready_at,customer_history_state";
export function createProductionCustomerImageLibrary() {
  if(process.env.NOVORA_CUSTOMER_IMAGE_LIBRARY_ENABLED!=="true"||process.env.NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED!=="true"||
     process.env.SUPABASE_STORAGE_BUCKET_AI_SKETCHES!=="novora-ai-sketches")return null;
  const db=createSupabaseAdminClientOrNull(),secret=process.env.NOVORA_FIRST_PREVIEW_ACCESS_SIGNING_SECRET;
  if(!db||!secret)return null;
  const repository:LibraryRepository={
    async deliveredCandidates(owner){
      // Bound eligible OUTPUT rows, never total receipts. Denied/no-output briefs
      // cannot displace delivered images by consuming a receipt-count limit.
      const r=await db.from("ai_sketch_outputs").select("id,concept_brief_id,brief:concept_briefs!inner(public_reference,owner_receipts:m2_scoped_submission_receipts!inner(scope_sha256,invitation_identity))")
        .eq("brief.owner_receipts.scope_sha256",owner.scope).eq("brief.owner_receipts.invitation_identity",owner.identity)
        .eq("asset_validation_status","passed").eq("automatic_gate_status","passed")
        .or("and(readiness_status.eq.first_preview_ready,is_current_customer_preview.eq.true,readiness_revoked_at.is.null),and(customer_history_state.eq.superseded,readiness_status.eq.revoked,is_current_customer_preview.eq.false)")
        .order("created_at",{ascending:false}).order("id").limit(48);
      if(r.error||!r.data)return null;
      const rows=r.data as unknown as {id:string;concept_brief_id:string;brief:{public_reference:string}|{public_reference:string}[]}[];
      return rows.map(x=>{const b=Array.isArray(x.brief)?x.brief.length===1?x.brief[0]:null:x.brief;return {outputId:x.id,receipt:{briefId:x.concept_brief_id,publicReference:b?.public_reference??""}};});
    },
    async ownedReceipt(owner,ref){
      const r=await db.from("m2_scoped_submission_receipts").select("concept_brief_id,public_reference")
        .eq("scope_sha256",owner.scope).eq("invitation_identity",owner.identity).eq("public_reference",ref).limit(2);
      return r.error||r.data?.length!==1?null:{briefId:r.data[0].concept_brief_id,publicReference:r.data[0].public_reference};
    },
    async snapshot(id){
      const r=await db.from("ai_sketch_outputs").select(columns).eq("id",id).maybeSingle();if(r.error||!r.data)return null;
      const o=r.data,j=await db.from("ai_sketch_jobs").select("id,concept_brief_id,status,generation_purpose,completed_at,source_output_id").eq("id",o.job_id).maybeSingle();if(j.error||!j.data)return null;
      let successor:LibrarySnapshot["successor"]=null,currentLineageVerified=false;
      if(o.customer_history_state==="superseded"){
        const next=await db.from("ai_sketch_jobs").select("id,status,source_output_id,concept_brief_id").eq("source_output_id",id).eq("concept_brief_id",o.concept_brief_id).eq("status","succeeded").limit(2);
        if(next.error||next.data?.length!==1)return null;
        const published=await db.from("ai_sketch_outputs").select("id,first_preview_ready_at").eq("job_id",next.data[0].id).eq("concept_brief_id",o.concept_brief_id).limit(2);
        if(published.error||published.data?.length!==1)return null;
        successor={...next.data[0],id:published.data[0].id,superseded_at:published.data[0].first_preview_ready_at};
      }else if(o.is_current_customer_preview===true){
        const b=await db.from("concept_briefs").select("public_reference").eq("id",o.concept_brief_id).maybeSingle();if(b.error||!b.data)return null;
        const view=await createSupabaseFirstPreviewCustomerViewStateSource(createFirstPreviewCustomerViewDatabaseClient(db)).readExactCustomerPreviewState({conceptBriefId:o.concept_brief_id,publicReference:b.data.public_reference});
        currentLineageVerified=!!view&&typeof view==="object"&&"state" in view&&view.state==="ready"&&"outputId" in view&&view.outputId===id;
      }
      return {output:o,job:j.data,successor,currentLineageVerified};
    },
  };
  return createCustomerImageLibrary({authenticate:authenticateScopedReceiptRequest,repository,storage:createFirstPreviewStorageClient(db),signingSecret:secret,active:isScopedReceiptOwnerActive});
}
