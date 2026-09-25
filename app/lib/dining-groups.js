export const DINING_GROUP_OPTIONS = Object.freeze([
  { id: "all", label: "全部", emoji: "♡" },
  { id: "hot", label: "热辣", emoji: "🔥" },
  { id: "chinese", label: "中餐", emoji: "🥢" },
  { id: "international", label: "异国", emoji: "🌏" },
  { id: "smoke", label: "烟火", emoji: "🌙" },
  { id: "date", label: "约会", emoji: "✦" },
  { id: "sweet", label: "甜甜", emoji: "🍰" },
]);

export const DINING_GROUP_IDS = Object.freeze(
  DINING_GROUP_OPTIONS.filter((item) => item.id !== "all").map((item) => item.id),
);

/**
 * 正式数据必须带合法 diningGroup；这里仍容忍旧浏览器缓存没有该字段，
 * 让“全部”可以继续展示旧数据，同时避免把旧记录误分进任意分组。
 *
 * @param {string | undefined | null} diningGroup
 * @param {string} category
 */
export function matchesDiningGroup(diningGroup, category) {
  if (category === "all") return true;
  return DINING_GROUP_IDS.includes(category) && diningGroup === category;
}
