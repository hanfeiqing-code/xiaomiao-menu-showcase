export const SERIES_OPTIONS = [
  { id: "home", label: "家常菜", emoji: "🍚" },
  { id: "fit", label: "减脂餐", emoji: "🥗" },
  { id: "dog", label: "狗狗大餐", emoji: "🐾" },
  { id: "fruit", label: "水果", emoji: "🍎" },
] as const;

export const CATEGORY_OPTIONS = [
  { id: "all", label: "全部", emoji: "♡" },
  { id: "spicy", label: "辣一点", emoji: "🌶" },
  { id: "sweet", label: "甜口", emoji: "🍯" },
  { id: "soup", label: "汤类", emoji: "🥣" },
  { id: "stirFry", label: "炒菜", emoji: "🍳" },
  { id: "steam", label: "蒸菜", emoji: "♨" },
  { id: "cold", label: "凉拌", emoji: "🥒" },
] as const;

export const TAG_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.filter((item) => item.id !== "all").map((item) => [item.id, item.label]),
);

export function seriesLabel(value: string) {
  return SERIES_OPTIONS.find((item) => item.id === value)?.label ?? value;
}

export function tagLabel(value: string) {
  return TAG_LABELS[value] ?? value;
}
