import type { Express, Request, Response } from "express";
import { pipeline } from "node:stream/promises";
import { sdk } from "./_core/sdk";
import { resolveCanonicalTenantForSubject, withTenantBranchTransaction } from "./db.pg";
import { localEvidenceStorage } from "./evidenceStorage";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeName=(name:string)=>name.replace(/[\r\n"\\/]/g,"_").slice(0,255)||"evidence";

export function registerSecureEvidenceRoutes(app:Express){
  app.get("/api/evidence/:id",async(req:Request,res:Response)=>{
    try{
      const user=await sdk.authenticateRequest(req); if(!user)return res.status(401).json({error:"Authentication required"});
      const identity=await resolveCanonicalTenantForSubject(user.openId); if(!["admin","technician"].includes(identity.tenantRole))return res.status(403).json({error:"Evidence access permission is required"});
      const branchId=String(req.query.branchId||""); const id=String(req.params.id||""); if(!uuid.test(branchId)||!uuid.test(id))return res.status(400).json({error:"Invalid evidence request"});
      const record=await withTenantBranchTransaction(identity.tenantId,branchId,async tx=>{const rows=await tx`SELECT storage_key AS "storageKey",file_name AS "fileName",content_type_detected AS "contentType",status FROM maintenance_evidence WHERE id=${id}::uuid`;if(rows.length!==1)return null;const value=rows[0] as any;if(value.status!=="AVAILABLE")return null;await tx`INSERT INTO evidence_events(tenant_id,branch_id,evidence_id,event_type,actor_external_subject,details) VALUES(${identity.tenantId}::uuid,${branchId}::uuid,${id}::uuid,${req.query.preview==="1"?"evidence_viewed":"evidence_downloaded"},${identity.externalSubject},'{}'::jsonb`;return value;});
      if(!record)return res.status(404).json({error:"Evidence was not found"});
      const preview=req.query.preview==="1"; if(preview&&!String(record.contentType).startsWith("image/"))return res.status(403).json({error:"Preview is not allowed"});
      res.setHeader("Content-Type",record.contentType);res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Cache-Control","private, no-store, max-age=0");res.setHeader("Content-Disposition",`${preview?"inline":"attachment"}; filename="${safeName(record.fileName)}"`);
      await pipeline(localEvidenceStorage.stream(record.storageKey),res);
    }catch{if(!res.headersSent)res.status(404).json({error:"Evidence was not found"});}
  });
}
