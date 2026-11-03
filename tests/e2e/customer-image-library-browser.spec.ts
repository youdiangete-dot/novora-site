import {test,expect,type Page} from "@playwright/test";
import {createSyntheticFirstPreviewPng} from "../fixtures/ai-sketch/fake-first-preview-storage-client";
const ref="NOVORA-CB-20261103-LB01",id="323e4567-e89b-42d3-a456-426614174000";
async function mocks(page:Page){
 await page.route("**/api/invitation-access",r=>r.fulfill({status:r.request().headers().authorization?200:401,json:r.request().headers().authorization?{state:"verified",partition:"a".repeat(64)}:{state:"required"}}));
 await page.route("**/api/customer-image-library**",r=>{const u=new URL(r.request().url());if(r.request().method()==="POST")return r.fulfill({json:{state:"ready"}});if(u.search)return r.fulfill({contentType:"image/png",body:Buffer.from(createSyntheticFirstPreviewPng())});return r.fulfill({json:{items:[{publicReference:ref,outputId:id,generatedAt:"2026-11-03T01:00:00.000Z",current:false},{publicReference:ref,outputId:"423e4567-e89b-42d3-a456-426614174000",generatedAt:"2026-11-03T02:00:00.000Z",current:true}]}});});
}
test("mobile customer recovers history after page closure, views and downloads without persisting credential",async({page,context})=>{
 await page.setViewportSize({width:375,height:812});await mocks(page);await page.goto("/design/my-images");await expect(page.getByRole("link",{name:"My images",exact:true})).toBeVisible();
 await page.getByLabel("Invitation code").fill("SYNTHETIC_"+"a".repeat(43));await page.getByRole("button",{name:"Use invitation"}).click();await page.getByRole("button",{name:"Recover my images"}).click();
 await expect(page.getByText("Earlier safely delivered version",{exact:false})).toBeVisible();await expect(page.getByText("Current version",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:"View image",exact:true}).first().click();await expect(page.getByAltText("Your selected AI hand-drawn concept sketch")).toBeVisible();
 const download=page.waitForEvent("download");await page.getByRole("button",{name:"Download PNG"}).first().click();expect((await download).suggestedFilename()).toBe(`${ref}-${id}.png`);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 expect(await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]))).not.toContain("SYNTHETIC_");
 await page.close();const reopened=await context.newPage();await mocks(reopened);await reopened.goto("/design/my-images");await expect(reopened.getByRole("button",{name:"Recover my images"})).toBeDisabled();
 await reopened.getByLabel("Invitation code").fill("SYNTHETIC_"+"a".repeat(43));await reopened.getByRole("button",{name:"Use invitation"}).click();await reopened.getByRole("button",{name:"Recover my images"}).click();await expect(reopened.getByText("Earlier safely delivered version",{exact:false})).toBeVisible();await expect(reopened.getByText("this is not a permanent backup guarantee",{exact:false})).toBeVisible();
});
