/**
 * 从晚餐历史实时计算每道菜进入已保存菜单的次数。
 * 同一份菜单内的重复菜品 ID 只计一次，避免脏数据造成重复累计。
 *
 * @param {Array<{ dishIds?: unknown }>} history
 * @returns {Map<string, number>}
 */
export function calculateRecipeMenuCounts(history = []) {
  const counts = new Map();

  for (const record of history) {
    const dishIds = Array.isArray(record?.dishIds) ? record.dishIds : [];
    const uniqueDishIds = new Set(
      dishIds.filter((dishId) => typeof dishId === "string" && dishId.length > 0),
    );

    for (const dishId of uniqueDishIds) {
      counts.set(dishId, (counts.get(dishId) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * 先按进入历史菜单的次数降序排列；次数相同时保持传入数组的原顺序。
 * 传入数组本身不会被修改。
 *
 * @template {{ id: string }} T
 * @param {T[]} recipes
 * @param {ReadonlyMap<string, number>} counts
 * @returns {T[]}
 */
export function sortRecipesByMenuCount(recipes, counts) {
  return recipes
    .map((recipe, index) => ({ recipe, index, count: counts.get(recipe.id) ?? 0 }))
    .sort((left, right) => right.count - left.count || left.index - right.index)
    .map(({ recipe }) => recipe);
}
