export const GATEWAY_CONTRACT_VERSION =
  "novora_gateway_first_preview_v1" as const;

export type GatewayProviderName = "mock" | "openai";

export type GatewayStatus =
  | "success"
  | "provider_error"
  | "timeout"
  | "invalid_request"
  | "unauthorized";

export type DesignSpec = Readonly<{
  spec_version: "1";
  language: "en" | "zh-Hant" | "ja";
  piece_type:
    | "ring"
    | "necklace"
    | "pendant"
    | "earrings"
    | "bracelet"
    | "other";
  normalized_intent_summary: string;
  design_direction: Readonly<{
    style_keywords: readonly string[];
    form: string;
    composition: string;
  }>;
  materials: readonly Readonly<{
    type: "platinum" | "gold" | "silver" | "other" | "unknown";
    color: string;
    finish: string;
  }>[];
  stones: readonly Readonly<{
    role: "center" | "accent" | "other";
    type: string;
    shape: string;
    color: string;
    setting: string;
    quantity: number;
  }>[];
  dimensions: Readonly<{
    summary: string;
    unknown_or_to_confirm: readonly string[];
  }>;
  production_constraints: readonly string[];
  unresolved_items: readonly string[];
}>;

export type HandSketchInstruction = Readonly<{
  instruction_version: "1";
  design_spec_version: "1";
  language: DesignSpec["language"];
  views: readonly Readonly<{
    view: "front" | "side" | "top" | "perspective" | "detail";
    required: boolean;
    instruction: string;
  }>[];
  sheet_style: Readonly<{
    line_style: string;
    background: string;
    branding: string;
  }>;
  drawing_instructions: readonly string[];
  annotations: readonly string[];
  must_include: readonly string[];
  must_avoid: readonly string[];
  disclaimer: string;
}>;

export type ReferenceAsset = Readonly<{
  asset_id: string;
  purpose: "inspiration" | "composition" | "detail";
  media_type: "image/png" | "image/jpeg" | "image/webp";
  sha256: string;
  byte_length: number;
  fetch_url: string;
}>;

export type GenerationOptions = Readonly<{
  size: "1024x1024" | "1024x1536" | "1536x1024";
  quality: "low" | "medium" | "high";
  output_format: "png";
  background: "opaque" | "transparent";
}>;

export type FirstPreviewGatewayRequest = Readonly<{
  contract_version: typeof GATEWAY_CONTRACT_VERSION;
  request_id: string;
  design_spec: DesignSpec;
  hand_sketch_instruction: HandSketchInstruction;
  reference_assets: readonly ReferenceAsset[];
  generation_options: GenerationOptions;
}>;

export type GatewayOutput = Readonly<{
  output_id: string;
  media_type: "image/png";
  encoding: "base64";
  data_base64: string;
  sha256: string;
  byte_length: number;
  width: number;
  height: number;
}>;

export type GatewayUsage = Readonly<{
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  image_count: number;
}>;

export type GatewayErrorCode =
  | "unauthorized"
  | "invalid_request"
  | "provider_timeout"
  | "provider_failure"
  | "unexpected_internal_failure";

export type GatewayError = Readonly<{
  code: GatewayErrorCode;
  message: string;
  retryable: boolean;
}>;

export type FirstPreviewGatewayResponse = Readonly<{
  contract_version: typeof GATEWAY_CONTRACT_VERSION;
  request_id: string | null;
  status: GatewayStatus;
  provider: GatewayProviderName | null;
  provider_request_id: string | null;
  model: string | null;
  outputs: readonly GatewayOutput[];
  usage: GatewayUsage | null;
  error: GatewayError | null;
}>;
