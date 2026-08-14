import { createHash } from "node:crypto";
import type { FirstPreviewGatewayRequest, GatewayOutput } from "../contracts.ts";
import type { FirstPreviewProvider, ProviderResult } from "./provider.ts";

const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export class MockFirstPreviewProvider implements FirstPreviewProvider {
  readonly name = "mock" as const;

  async generate(
    request: FirstPreviewGatewayRequest,
    signal: AbortSignal,
  ): Promise<ProviderResult> {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const bytes = Buffer.from(MOCK_PNG_BASE64, "base64");
    const output: GatewayOutput = {
      output_id: `mock_${request.request_id}`,
      media_type: "image/png",
      encoding: "base64",
      data_base64: MOCK_PNG_BASE64,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byte_length: bytes.length,
      width: 1,
      height: 1,
    };

    return {
      providerRequestId: `mock_${request.request_id}`,
      model: "mock-first-preview-v1",
      outputs: [output],
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        image_count: 1,
      },
    };
  }
}
