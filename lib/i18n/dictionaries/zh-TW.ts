import type { Dictionary } from "./types";
import { commercialSpecificationFieldLabels } from "./commercial-specification-field-labels";
import { zhTWCustomerUICopy } from "./customer-ui-copy-zh-TW";

export const zhTWDictionary = {
  common: {
    languageNames: {
      en: "English",
      "zh-TW": "繁體中文",
    },
    languageSwitcher: {
      label: "切換語言",
      shortNames: {
        en: "EN",
        "zh-TW": "繁中",
      },
    },
  },
  metadata: {
    root: {
      titleDefault: "NOVORA｜客製珠寶設計需求工作室",
      titleTemplate: "%s | NOVORA",
      description:
        "透過 NOVORA 的引導式流程建立客製珠寶設計需求，後續由工作室審核，並另行討論付費 CAD。",
      applicationName: "NOVORA",
    },
    home: {
      title: "開始建立客製珠寶設計需求",
      description:
        "向 NOVORA 分享引導式客製珠寶設計需求，供工作室審核、整理示意設計方向，並於後續另行討論付費 CAD。",
      previewImageAlt: "NOVORA 客製珠寶設計方向示意預覽",
    },
  },
  ...zhTWCustomerUICopy,
  commercialSpecification: {
    ...zhTWCustomerUICopy.commercialSpecification,
    fieldLabels: commercialSpecificationFieldLabels["zh-TW"],
  },
} satisfies Dictionary;
