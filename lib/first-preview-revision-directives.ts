// A closed design vocabulary, not free-text reviewer notes or printed labels.
export const REVISION_DIRECTIVES = {
  lower_setting: "Lower the setting profile while preserving safe stone clearance and consistent views.",
  raise_setting: "Raise the setting profile while keeping the stone supported and all views consistent.",
  narrower_band: "Use a visually narrower band while retaining a continuous supported jewelry structure.",
  wider_band: "Use a visually wider band while preserving the selected design direction.",
  vertical_center_stone: "Orient the center stone vertically in every view; keep its shape unchanged.",
  horizontal_center_stone: "Orient the center stone horizontally in every view; keep its shape unchanged.",
  simplify_motif: "Simplify decorative motifs while preserving the selected main structure and stone arrangement.",
  reduce_accent_stones: "Reduce accent-stone coverage without changing the selected center stone.",
} as const;
export type RevisionDirective = keyof typeof REVISION_DIRECTIVES;
export function readRevisionDirectives(value: unknown): RevisionDirective[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8 ||
    value.some(code => typeof code !== "string" || !Object.hasOwn(REVISION_DIRECTIVES, code)) ||
    new Set(value).size !== value.length) return null;
  const codes = value as RevisionDirective[];
  for (const pair of [["lower_setting", "raise_setting"], ["narrower_band", "wider_band"], ["vertical_center_stone", "horizontal_center_stone"]]) {
    if (pair.every(code => codes.includes(code as RevisionDirective))) return null;
  }
  return [...codes];
}
export function parseRevisionDirectives(value: unknown): RevisionDirective[] | null {
  return typeof value === "string" && value.length <= 2000
    ? readRevisionDirectives(value.split(/[,;\n]+/).map(code => code.trim().toLowerCase().replace(/\s+/g, "_"))) : null;
}
