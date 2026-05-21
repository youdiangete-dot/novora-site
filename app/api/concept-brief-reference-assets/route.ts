import { NextResponse } from "next/server";

import { uploadConceptBriefReferenceAssets } from "../../../lib/server/concept-brief-reference-assets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Reference image upload could not be processed.",
      },
      { status: 400 },
    );
  }

  const result = await uploadConceptBriefReferenceAssets(formData);

  if (result.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Reference images were attached for concept review.",
    assets: result.assets,
  });
}
