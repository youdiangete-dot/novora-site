import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
const internals = Module as unknown as { _resolveFilename: (...args: any[]) => string };
const original = internals._resolveFilename;
internals._resolveFilename = function (request, ...args) { return request === "server-only" ? path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js") : original.call(this, request, ...args); };
const req = createRequire(path.join(process.cwd(), "tests/e2e/admin-commercial-orders.spec.ts"));
const orders = req("../../lib/server/admin-commercial-orders") as typeof import("../../lib/server/admin-commercial-orders");
const quotes = req("../../lib/server/commercial-quotation") as typeof import("../../lib/server/commercial-quotation");
internals._resolveFilename = original;
const React = req("react"), server = req("react-dom/server");
const brief = "123e4567-e89b-42d3-a456-426614174000", output = "223e4567-e89b-42d3-a456-426614174000", spec = "323e4567-e89b-42d3-a456-426614174000";
const reference = (type: string, n: number) => `NOVORA-${type}-${n.toString(16).toUpperCase().padStart(24,"0")}`;
function row(n=1, currency="USD", amount="1.23") {
  const specificationId = `323e4567-e89b-42d3-a456-${String(n).padStart(12,"0")}`;
  const snapshot=quotes.buildCommercialQuotationSnapshot(quotes.normalizeCommercialQuotationInput({currency,lineItems:[{description:"TEST item",amount}],validUntil:null,note:null})!);
  const minor=currency === "JPY" ? 1234 : currency === "KWD" ? 1230 : 123;
  return { order_reference:reference("O",n),order_version:"commercial_order_v1",commercial_payment_reference:reference("P",n),commercial_quotation_reference:reference("Q",n),amount_minor:minor,currency,created_at:"2026-11-04T01:00:00+00:00",
    payment:{payment_reference:reference("P",n),commercial_quotation_reference:reference("Q",n),payment_version:"commercial_payment_v1",status:"paid",amount_minor:String(minor),currency,paid_at:"2026-11-04T00:59:00Z",provider_payment_id:"TEST excluded provider"},
    quotation:{quote_reference:reference("Q",n),commercial_specification_confirmation_id:specificationId,quotation_version:"commercial_quotation_v1",quotation_snapshot:snapshot,quotation_sha256:quotes.hashCommercialQuotationSnapshot(snapshot),specification:{id:specificationId,concept_brief_id:brief,ai_sketch_output_id:output,brief:{id:brief,public_reference:"NOVORA-CB-20260811-M511",customerEmail:"excluded@example.com"},output:{id:output,concept_brief_id:brief,is_current_customer_preview:false,private_path:"TEST private path"}}}};
}
const read = (rows: unknown) => orders.readAdminCommercialOrders({readRows:async()=>rows});

test("reads durable historical orders with exact paid/quote/Brief binding and strips private fields",async()=>{
  const result=await read([row()]);expect(result).toMatchObject({ok:true,hasMore:false,orders:[{orderReference:reference("O",1),amount:"1.23",publicReference:"NOVORA-CB-20260811-M511",recordedAt:"2026-11-04T01:00:00.000Z"}]});
  for(const value of ["TEST excluded provider","excluded@example.com","TEST private path","is_current_customer_preview"])expect(JSON.stringify(result)).not.toContain(value);
});
for(const [name,mutate]of Object.entries({
  unpaid:(r:any)=>r.payment.status="pending",payment:(r:any)=>r.payment.payment_reference=reference("P",9),quote:(r:any)=>r.payment.commercial_quotation_reference=reference("Q",9),amount:(r:any)=>r.payment.amount_minor=124,currency:(r:any)=>r.payment.currency="TWD",snapshot:(r:any)=>r.quotation.quotation_snapshot.totalAmount="0.01",hash:(r:any)=>r.quotation.quotation_sha256="a".repeat(64),specification:(r:any)=>r.quotation.commercial_specification_confirmation_id=output,brief:(r:any)=>r.quotation.specification.brief.id=output,output:(r:any)=>r.quotation.specification.output.concept_brief_id=output,missing:(r:any)=>r.quotation.specification.output=null,unsafeAmount:(r:any)=>r.amount_minor="9007199254740992",date:(r:any)=>r.created_at="invalid",reference:(r:any)=>r.quotation.specification.brief.public_reference="unknown"
}))test(`fails closed for ${name} inconsistency`,async()=>{const value=row();mutate(value);expect(await read([value])).toEqual({ok:false,orders:[],hasMore:false});});
test("database failure is unavailable, verified empty is empty, with no mock fallback",async()=>{
  expect(await read([])).toEqual({ok:true,orders:[],hasMore:false});
  for(const value of [null,{},[row(),row()],Array(27).fill(row())])expect((await read(value)).ok).toBe(false);
  expect(await orders.readAdminCommercialOrders({readRows:async()=>{throw Error("TEST sensitive raw backend failure");}})).toEqual({ok:false,orders:[],hasMore:false});
});
test("bounded recent-order result reports additional records",async()=>{const result=await read(Array.from({length:26},(_,i)=>row(i+1)));expect(result.ok).toBe(true);expect(result.orders).toHaveLength(25);expect(result.hasMore).toBe(true);});
test("currency minor units are formatted without rounding",async()=>{for(const [currency,amount,expected]of [["JPY","1234","1234"],["KWD","1.23","1.230"]]){const r=await read([row(1,currency,amount)]);expect(r.ok).toBe(true);expect(r.orders[0]?.amount).toBe(expected);}});
test("repository uses only a bounded stable read with historical FK relations",async()=>{
  const calls:any[]=[];const query={select:(s:string)=>{calls.push(["select",s]);return query;},order:(...a:any[])=>{calls.push(["order",...a]);return query;},limit:async(n:number)=>{calls.push(["limit",n]);return {data:[],error:null};}};
  await orders.createAdminCommercialOrderReader({from:(table:string)=>{calls.push(["from",table]);return query;}} as never)();
  expect(calls).toContainEqual(["from","commercial_orders"]);expect(calls).toContainEqual(["limit",26]);expect(calls.filter(x=>x[0]==="order").map(x=>x[1])).toEqual(["created_at","id"]);
  expect(calls[1][1]).toContain("commercial_specification_confirmations_output_brief_fkey");expect(calls[1][1]).not.toContain("provider_payment_id");
});
async function render(cookie: string|undefined, result: unknown): Promise<{html?:string;error?:string;reads:number}> {
  let reads=0;const mod={exports:{} as any};
  const source=readFileSync("app/admin/orders/page.tsx","utf8");
  new Function("module","exports","require",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(mod,mod.exports,(id:string)=>{
    if(id==="next/link")return {__esModule:true,default:({href,children}:any)=>React.createElement("a",{href},children)};
    if(id==="next/headers")return {cookies:async()=>({get:()=>cookie?{value:cookie}:undefined})};
    if(id==="next/navigation")return {redirect:(url:string)=>{throw Error("REDIRECT "+url);}};
    if(id.endsWith("/admin-access"))return {ADMIN_ACCESS_COOKIE_NAME:"TEST cookie",isValidAdminAccessCookie:(value:string)=>value==="TEST valid"};
    if(id.endsWith("/admin-commercial-orders"))return {readAdminCommercialOrders:async()=>{reads++;return result;}};
    if(id.endsWith(".module.css"))return {__esModule:true,default:new Proxy({},{get:(_,key)=>key})};
    return req(id);
  });
  try{return {html:server.renderToStaticMarkup(await mod.exports.default()),reads};}catch(e){return {error:(e as Error).message,reads};}
}
test("no-cookie and invalid-cookie users cannot invoke the order reader",async()=>{for(const cookie of [undefined,"TEST invalid"]){expect(await render(cookie,{ok:true,orders:[]})).toEqual({error:"REDIRECT /admin/briefs",reads:0});}});
test("admin empty and unavailable UI states remain distinct",async()=>{
  const empty=await render("TEST valid",await read([])),failed=await render("TEST valid",{ok:false,orders:[],hasMore:false});
  expect(empty.reads).toBe(1);expect(empty.html).toContain("No recorded commercial orders");expect(failed.html).toContain("Order records unavailable");expect(failed.html).not.toContain("No recorded commercial orders");
  expect(readFileSync("app/admin/briefs/page.tsx","utf8")).toContain('href="/admin/orders"');
});
test("mobile browser shows verified order and existing Brief link without mutation controls",async({page})=>{
  const result=await render("TEST valid",await read([row()]));expect(result.error).toBeUndefined();
  await page.route("**/*",route=>route.abort());await page.route("http://novora.test/",route=>route.fulfill({contentType:"text/html; charset=utf-8",body:`<html><head><meta charset="utf-8"><style>${readFileSync("app/admin/briefs/admin-briefs.module.css","utf8")}</style></head><body>${result.html}</body></html>`}));
  await page.setViewportSize({width:375,height:812});await page.goto("http://novora.test/");
  await expect(page.getByRole("heading",{name:"Commercial orders",exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"NOVORA-CB-20260811-M511"})).toHaveAttribute("href","/admin/briefs/NOVORA-CB-20260811-M511");
  await expect(page.getByText("Paid order recorded — USD 1.23")).toBeVisible();await expect(page.getByRole("button")).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
