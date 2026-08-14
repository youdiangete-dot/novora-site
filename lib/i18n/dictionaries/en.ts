import { customerUICopy } from "./customer-ui-copy";
import { commercialSpecificationFieldLabels } from "./commercial-specification-field-labels";

export const enDictionary = {
  common: {
    languageNames: {
      en: "English",
      "zh-TW": "繁體中文",
    },
    languageSwitcher: {
      label: "Switch language",
      shortNames: {
        en: "EN",
        "zh-TW": "繁中",
      },
    },
  },
  metadata: {
    root: {
      titleDefault: "NOVORA | Custom Jewelry Concept Brief Studio",
      titleTemplate: "%s | NOVORA",
      description:
        "Start a guided custom jewelry Concept Brief with NOVORA, then move into studio review and separate paid CAD discussion later.",
      applicationName: "NOVORA",
    },
    home: {
      title: "Start a Custom Jewelry Concept Brief",
      description:
        "Share a guided custom jewelry Concept Brief with NOVORA for studio review, illustrative concept direction, and separate paid CAD discussion later.",
      previewImageAlt: "NOVORA custom jewelry concept preview",
    },
  },
  ...customerUICopy,
  commercialSpecification: {
    ...customerUICopy.commercialSpecification,
    fieldLabels: commercialSpecificationFieldLabels.en,
  },
} as const;
