export type DesignBrief = {
  recipient: string;
  jewelryType: string;
  story: string;
  material: string;
  stone: string;
  budget: string;
  timeline: string;
  inspirationNotes: string;
};

export const DESIGN_BRIEF_KEY = 'novora_design_brief';

export const defaultBrief: DesignBrief = {
  recipient: 'Myself',
  jewelryType: 'Ring',
  story: '',
  material: 'Not sure yet',
  stone: 'Not sure yet',
  budget: 'USD 500-1,500',
  timeline: 'Flexible',
  inspirationNotes: '',
};

export function saveDesignBrief(brief: DesignBrief) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DESIGN_BRIEF_KEY, JSON.stringify(brief));
}

export function loadDesignBrief(): DesignBrief {
  if (typeof window === 'undefined') return defaultBrief;
  const raw = localStorage.getItem(DESIGN_BRIEF_KEY);
  if (!raw) return defaultBrief;

  try {
    const parsed = JSON.parse(raw) as Partial<DesignBrief>;
    return { ...defaultBrief, ...parsed };
  } catch {
    return defaultBrief;
  }
}
