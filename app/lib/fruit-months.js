const ALL_MONTHS = Object.freeze(Array.from({ length: 12 }, (_, index) => index + 1));

export const FRUIT_MONTH_OPTIONS = Object.freeze([
  { id: "all", label: "全部", emoji: "♡" },
  ...ALL_MONTHS.map((month) => ({
    id: `month-${month}`,
    label: `${month}月`,
    emoji: "",
  })),
]);

/**
 * @param {string} value
 * @returns {number | null}
 */
export function fruitMonthFromCategory(value) {
  const match = /^month-(\d{1,2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
}

/**
 * 将“全年”“3-5月”“10月-次年3月”等展示文案转换为月份集合。
 * 跨年区间会从起始月延伸到 12 月，再从 1 月延伸到结束月。
 *
 * @param {string} value
 * @returns {number[]}
 */
export function fruitMonthsFromSeason(value) {
  const source = String(value ?? "").trim();
  if (!source) return [];
  if (source.includes("全年")) return [...ALL_MONTHS];

  const normalized = source
    .replace(/[～~—–至]/g, "-")
    .replace(/\s+/g, "");
  const months = new Set();
  const rangePattern = /(\d{1,2})月?-(?:次年)?(\d{1,2})月/g;
  let range = rangePattern.exec(normalized);

  while (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (start >= 1 && start <= 12 && end >= 1 && end <= 12) {
      if (start <= end && !range[0].includes("次年")) {
        for (let month = start; month <= end; month += 1) months.add(month);
      } else {
        for (let month = start; month <= 12; month += 1) months.add(month);
        for (let month = 1; month <= end; month += 1) months.add(month);
      }
    }
    range = rangePattern.exec(normalized);
  }

  if (months.size === 0) {
    for (const match of normalized.matchAll(/(\d{1,2})月/g)) {
      const month = Number(match[1]);
      if (month >= 1 && month <= 12) months.add(month);
    }
  }

  return ALL_MONTHS.filter((month) => months.has(month));
}

/**
 * @param {string} seasonMonths
 * @param {string} category
 */
export function matchesFruitMonthCategory(seasonMonths, category) {
  if (category === "all") return true;
  const month = fruitMonthFromCategory(category);
  return month !== null && fruitMonthsFromSeason(seasonMonths).includes(month);
}
