import { NextResponse } from "next/server";
import { createProductionCustomerImageLibrary } from "../../../lib/server/ai-sketch/customer-image-library-runtime";
import { FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES as attributes, FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME as name } from "../../../lib/server/ai-sketch/first-preview-customer-access-contract";
import { checkPublicApiRateLimit } from "../../../lib/server/public-api-rate-limit";

export function createCustomerImageLibraryHandlers(factory=createProductionCustomerImageLibrary, rateLimit=checkPublicApiRateLimit) {
  const deny=()=>NextResponse.json({state:"unavailable"},{status:404,headers:{"Cache-Control":"private, no-store",Vary:"Authorization, Cookie"}});
  return {async handle(request:Request){try{
    const u=new URL(request.url);
    if(request.headers.get("origin")&&request.headers.get("origin")!==u.origin)return deny();
    if(!(await rateLimit({request,routeName:"/api/customer-image-library",policy:{limit:30,windowSeconds:600,keyPrefix:"rl:v1:customer-image-library"}})).allowed)return deny();
    const service=factory();if(!service)return deny();
    if(request.method==="POST"){
      const raw=await request.text();if(raw.length>256)return deny();const b=JSON.parse(raw);
      if(!b||Object.keys(b).join(",")!=="publicReference")return deny();const proof=await service.session(request,b.publicReference);if(!proof)return deny();
      const r=NextResponse.json({state:"ready"},{headers:{"Cache-Control":"private, no-store"}});r.cookies.set(name,proof,attributes);return r;
    }
    if(request.method!=="GET")return deny();
    if(!u.search){const items=await service.list(request);return items?NextResponse.json({items},{headers:{"Cache-Control":"private, no-store",Vary:"Authorization, Cookie"}}):deny();}
    if([...u.searchParams.keys()].sort().join(",")!=="download,outputId,publicReference"||!["0","1"].includes(u.searchParams.get("download")??""))return deny();
    const ref=u.searchParams.get("publicReference")!,id=u.searchParams.get("outputId")!;
    const cookie=request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(name+"="))?.slice(name.length+1)??null;
    const bytes=await service.image(request,ref,id,cookie);if(!bytes)return deny();
    return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"image/png","Content-Length":String(bytes.length),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",Vary:"Authorization, Cookie","Content-Disposition":`${u.searchParams.get("download")==="1"?"attachment":"inline"}; filename="${ref}-${id}.png"`}});
  }catch{return deny();}}};
}
