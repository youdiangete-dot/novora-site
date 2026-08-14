import type { enDictionary } from "./en";

type WidenDictionaryValues<Value> = Value extends string
  ? string
  : Value extends readonly (infer Item)[]
    ? readonly WidenDictionaryValues<Item>[]
    : Value extends object
      ? { [Key in keyof Value]: WidenDictionaryValues<Value[Key]> }
      : Value;

export type Dictionary = WidenDictionaryValues<typeof enDictionary>;
