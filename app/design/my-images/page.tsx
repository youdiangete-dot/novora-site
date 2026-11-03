"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import InvitationAccess, { type BrowserInvitationState } from "../../../components/InvitationAccess";
import styles from "./page.module.css";
type Item={outputId:string;publicReference:string;generatedAt:string;current:boolean};

export default function MyImages(){
 const [access,setAccess]=useState<BrowserInvitationState>({state:"checking"}),[items,setItems]=useState<Item[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[image,setImage]=useState<string|null>(null);
 const epoch=useRef(0),url=useRef<string|null>(null),controller=useRef<AbortController|null>(null);
 const reset=useCallback(()=>{epoch.current++;controller.current?.abort();if(url.current)URL.revokeObjectURL(url.current);url.current=null;setImage(null);setItems([]);setBusy(false);},[]);
 const onAccess=useCallback((next:BrowserInvitationState)=>{reset();setAccess(next);setMessage("");},[reset]);
 useEffect(()=>()=>{epoch.current++;controller.current?.abort();if(url.current)URL.revokeObjectURL(url.current);},[]);
 async function run(action:(headers:Record<string,string>,signal:AbortSignal,valid:()=>boolean)=>Promise<void>){
  if(access.state!=="verified"||busy)return;const version=epoch.current,c=new AbortController();controller.current=c;setBusy(true);setMessage("");
  const valid=()=>epoch.current===version&&!c.signal.aborted;
  try{await action({Authorization:`Bearer ${access.access.credential}`},c.signal,valid);}catch{if(valid())setMessage("Access is unavailable. Re-enter your invitation if needed; no new design or image was submitted.");}finally{if(valid())setBusy(false);}
 }
 async function recover(){await run(async(headers,signal,valid)=>{const r=await fetch("/api/customer-image-library",{headers,signal,cache:"no-store"});const b=await r.json();
  if(!r.ok||!Array.isArray(b.items)||b.items.length>48||b.items.some((v:Item)=>!/^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/.test(v.publicReference)||!/^[a-f0-9-]{36}$/.test(v.outputId)||!Number.isFinite(Date.parse(v.generatedAt))||typeof v.current!=="boolean"))throw Error("unavailable");
  if(valid()){setItems(b.items);setMessage(b.items.length?"Your safely delivered images are available below.":"No safely delivered images are available for this invitation yet.");}});}
 async function open(item:Item,kind:"view"|"download"|"current") {await run(async(headers,signal,valid)=>{
  const session=await fetch("/api/customer-image-library",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({publicReference:item.publicReference}),signal,cache:"no-store"});if(!session.ok||!valid())throw Error("unavailable");
  if(kind==="current"){window.location.assign(`/design/preview/${encodeURIComponent(item.publicReference)}`);return;}
  const params=new URLSearchParams({publicReference:item.publicReference,outputId:item.outputId,download:kind==="download"?"1":"0"});
  const r=await fetch(`/api/customer-image-library?${params}`,{headers,signal,cache:"no-store"});if(!r.ok||r.headers.get("content-type")!=="image/png")throw Error("unavailable");
  const blob=await r.blob();if(!valid())return;
  const object=URL.createObjectURL(blob);if(url.current)URL.revokeObjectURL(url.current);url.current=object;setImage(object);
  if(kind==="download"){const a=document.createElement("a");a.href=object;a.download=`${item.publicReference}-${item.outputId}.png`;a.click();setMessage("Download requested. Check your browser's downloads and save a personal backup.");}
 });}
 return <main className={styles.page}>
  <h1>My design images</h1>
  <p>Enter your own invitation to recover safely delivered images, including earlier versions. Closing this page does not delete your images.</p>
  <p>Please download and save your own copies. Online access depends on the invitation and service remaining available; this is not a permanent backup guarantee. The generation trial period is separate from image storage.</p>
  <InvitationAccess onChange={onAccess} disabled={busy}/>
  <button type="button" disabled={busy||access.state!=="verified"} onClick={()=>void recover()}>{busy?"Checking...":"Recover my images"}</button>
  <p role="status">{message}</p>
  <ul className={styles.list}>{items.map(item=><li key={item.outputId}>
   <h2>{item.publicReference}</h2><p>{item.current?"Current version":"Earlier safely delivered version — view only"} · <time dateTime={item.generatedAt}>{item.generatedAt}</time></p>
   <div className={styles.actions}><button disabled={busy} onClick={()=>void open(item,"view")}>View image</button><button disabled={busy} onClick={()=>void open(item,"download")}>Download PNG</button><button disabled={busy} onClick={()=>void open(item,"current")}>Current design, feedback and confirmation</button></div>
  </li>)}</ul>
  {image?<img className={styles.image} src={image} alt="Your selected AI hand-drawn concept sketch"/>:null}
  <p>AI concept direction only; not CAD, a quotation, payment confirmation, order or production approval.</p>
  <Link href="/design/start">Start a design brief</Link>
 </main>;
}
