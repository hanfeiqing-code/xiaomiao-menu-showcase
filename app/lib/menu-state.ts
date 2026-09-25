import type { Recipe } from "@/app/data/recipes";
import { matchesDiningGroup } from "@/app/lib/dining-groups";
import { matchesFruitMonthCategory } from "@/app/lib/fruit-months";

export type EditableRecipe = Recipe & {
  createdAt?: string;
  updatedAt?: string;
};

export type RecipeOverride = Partial<Omit<EditableRecipe, "id" | "source">> & {
  updatedAt: string;
};

export type CustomDiningPlace = {
  id: string;
  name: string;
  location: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type DinnerDiningPlaceSnapshot = {
  recipeId: string;
  recipeName: string;
  places: Array<Pick<CustomDiningPlace, "id" | "name" | "location" | "note">>;
};

export type DinnerHistory = {
  id: string;
  title: string;
  chefNote?: string;
  dishIds: string[];
  createdAt: string;
  loveQuote?: string;
  cloudMenuId?: string;
  targetPairId?: string;
  syncStatus?: "localOnly" | "pending" | "synced" | "failed" | "withdrawn";
  sentAt?: string;
  syncError?: string;
  diningPlaceSnapshots?: DinnerDiningPlaceSnapshot[];
};

export type MockIncomingDinner = DinnerHistory & {
  senderName: string;
  read: boolean;
};

export type MockPairingState = {
  nickname: string;
  status: "unbound" | "invited" | "bound";
  partnerName: string;
  partnerAvatarId: string | null;
  pairedAt: string | null;
  inviteCreatedAt: string | null;
  inbox: MockIncomingDinner[];
};

export type PersistedMenuState = {
  avatarId: string | null;
  selectedIds: string[];
  history: DinnerHistory[];
  overrides: Record<string, RecipeOverride>;
  localRecipes: EditableRecipe[];
  customDiningPlaces: Record<string, CustomDiningPlace[]>;
  loveQuoteId: string | null;
  loveQuoteMenuSignature: string;
  loveQuoteRemainingIds: string[];
  mockPairing: MockPairingState;
};

export const EMPTY_MOCK_PAIRING: MockPairingState = {
  nickname: "怡宝",
  status: "unbound",
  partnerName: "鸡毛大厨",
  partnerAvatarId: null,
  pairedAt: null,
  inviteCreatedAt: null,
  inbox: [],
};

export const EMPTY_STATE: PersistedMenuState = {
  avatarId: null,
  selectedIds: [],
  history: [],
  overrides: {},
  localRecipes: [],
  customDiningPlaces: {},
  loveQuoteId: null,
  loveQuoteMenuSignature: "",
  loveQuoteRemainingIds: [],
  mockPairing: EMPTY_MOCK_PAIRING,
};

const STORAGE_KEY = "yibao-menu-preview:v3";
const LEGACY_STORAGE_KEYS = ["yibao-menu-preview:v2", "yibao-menu-preview:v1"];

function normalizeCustomDiningPlaces(value: unknown): Record<string, CustomDiningPlace[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([recipeId, places]) => recipeId.trim() && Array.isArray(places))
      .map(([recipeId, places]) => [
        recipeId,
        (places as unknown[]).flatMap((place) => {
          if (!place || typeof place !== "object") return [];
          const candidate = place as Partial<CustomDiningPlace>;
          const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
          if (!name) return [];
          return [{
            id: typeof candidate.id === "string" && candidate.id.trim()
              ? candidate.id
              : `migrated-place-${recipeId}-${name}`,
            name: name.slice(0, 40),
            location: typeof candidate.location === "string" ? candidate.location.trim().slice(0, 60) : "",
            note: typeof candidate.note === "string" ? candidate.note.trim().slice(0, 120) : "",
            createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
            updatedAt: typeof candidate.updatedAt === "string"
              ? candidate.updatedAt
              : (typeof candidate.createdAt === "string" ? candidate.createdAt : ""),
          }];
        }),
      ])
      .filter(([, places]) => places.length > 0),
  );
}

function normalizeDinnerHistory(value: unknown): DinnerHistory[] {
  if (!Array.isArray(value)) return [];
  return value.filter((record): record is DinnerHistory => Boolean(
    record && typeof record === "object" && typeof (record as DinnerHistory).id === "string",
  )).map((record) => ({
    ...record,
    diningPlaceSnapshots: Array.isArray(record.diningPlaceSnapshots)
      ? record.diningPlaceSnapshots.flatMap((snapshot) => {
          if (!snapshot || typeof snapshot !== "object") return [];
          const recipeId = typeof snapshot.recipeId === "string" ? snapshot.recipeId : "";
          const recipeName = typeof snapshot.recipeName === "string" ? snapshot.recipeName : "";
          if (!recipeId) return [];
          const places = (Array.isArray(snapshot.places) ? snapshot.places : []).flatMap((place) => {
            if (!place || typeof place !== "object") return [];
            const name = typeof place.name === "string" ? place.name.trim() : "";
            if (!name) return [];
            return [{
              id: typeof place.id === "string" && place.id.trim()
                ? place.id
                : `migrated-snapshot-${recipeId}-${name}`,
              name: name.slice(0, 40),
              location: typeof place.location === "string" ? place.location.trim().slice(0, 60) : "",
              note: typeof place.note === "string" ? place.note.trim().slice(0, 120) : "",
            }];
          });
          return places.length ? [{ recipeId, recipeName, places }] : [];
        })
      : [],
  }));
}

function normalizeMockInbox(value: unknown): MockIncomingDinner[] {
  return normalizeDinnerHistory(value).map((record) => {
    const candidate = record as DinnerHistory & Partial<MockIncomingDinner>;
    return {
      ...record,
      senderName: typeof candidate.senderName === "string" && candidate.senderName.trim()
        ? candidate.senderName.trim()
        : "TA",
      read: candidate.read === true,
    };
  });
}

function readStoredState(): Partial<PersistedMenuState> | null {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      return JSON.parse(raw) as Partial<PersistedMenuState>;
    } catch {
      // 当前版本损坏时继续尝试旧版本，避免一次坏数据覆盖可迁移的本地回忆。
    }
  }
  return null;
}

export function readMenuState(): PersistedMenuState {
  if (typeof window === "undefined") return EMPTY_STATE;

  try {
    const parsed = readStoredState();
    if (!parsed) return EMPTY_STATE;
    return {
      avatarId: typeof parsed.avatarId === "string" ? parsed.avatarId : null,
      selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
      history: normalizeDinnerHistory(parsed.history),
      overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
      localRecipes: Array.isArray(parsed.localRecipes) ? parsed.localRecipes : [],
      customDiningPlaces: normalizeCustomDiningPlaces(parsed.customDiningPlaces),
      loveQuoteId: typeof parsed.loveQuoteId === "string" ? parsed.loveQuoteId : null,
      loveQuoteMenuSignature: typeof parsed.loveQuoteMenuSignature === "string" ? parsed.loveQuoteMenuSignature : "",
      loveQuoteRemainingIds: Array.isArray(parsed.loveQuoteRemainingIds)
        ? parsed.loveQuoteRemainingIds.filter((id): id is string => typeof id === "string")
        : [],
      mockPairing: parsed.mockPairing && typeof parsed.mockPairing === "object"
        ? {
            ...EMPTY_MOCK_PAIRING,
            ...parsed.mockPairing,
            status: ["unbound", "invited", "bound"].includes(parsed.mockPairing.status)
              ? parsed.mockPairing.status
              : "unbound",
            inbox: normalizeMockInbox(parsed.mockPairing.inbox),
          }
        : EMPTY_MOCK_PAIRING,
    };
  } catch {
    return EMPTY_STATE;
  }
}

export type PersistResult = { ok: true } | { ok: false; quota: boolean };

export function writeMenuState(state: PersistedMenuState): PersistResult {
  if (typeof window === "undefined") return { ok: true };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    return { ok: true };
  } catch (error) {
    const domError = error as DOMException;
    const quota =
      domError?.name === "QuotaExceededError" ||
      domError?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      domError?.code === 22;
    return { ok: false, quota };
  }
}

export function clearMenuState() {
  if (typeof window === "undefined") return;
  [STORAGE_KEY, ...LEGACY_STORAGE_KEYS].forEach((key) => window.localStorage.removeItem(key));
}

export function diningPlaceSnapshotsForRecipes(
  recipeIds: readonly string[],
  recipeById: ReadonlyMap<string, EditableRecipe>,
  customDiningPlaces: Readonly<Record<string, readonly CustomDiningPlace[]>>,
): DinnerDiningPlaceSnapshot[] {
  return recipeIds.flatMap((recipeId) => {
    const recipe = recipeById.get(recipeId);
    const places = customDiningPlaces[recipeId] ?? [];
    if (recipe?.series !== "dog" || places.length === 0) return [];
    return [{
      recipeId,
      recipeName: recipe.name,
      places: places.map(({ id, name, location, note }) => ({ id, name, location, note })),
    }];
  });
}

export function mergeRecipes(
  seeds: readonly Recipe[],
  overrides: Record<string, RecipeOverride>,
  localRecipes: EditableRecipe[],
): EditableRecipe[] {
  const mergedSeeds = seeds.map((recipe) => ({
    ...recipe,
    ...(overrides[recipe.id] ?? {}),
    source: "seed" as const,
  }));

  return [...mergedSeeds, ...localRecipes].sort(
    (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
  );
}

export type RecipeFilter = {
  series: string;
  category: string;
  search: string;
};

export function filterRecipes(recipes: EditableRecipe[], filter: RecipeFilter) {
  const keyword = filter.search.trim().toLocaleLowerCase("zh-CN");
  return recipes.filter((recipe) => {
    if (recipe.status !== "published") return false;
    if (recipe.series !== filter.series) return false;
    if (recipe.series === "fruit") {
      if (!matchesFruitMonthCategory(recipe.seasonMonths ?? "", filter.category)) return false;
    } else if (recipe.series === "dog") {
      if (!matchesDiningGroup(recipe.diningGroup, filter.category)) return false;
    } else if (filter.category !== "all" && !recipe.tags.includes(filter.category as never)) return false;
    if (keyword && !recipe.name.toLocaleLowerCase("zh-CN").includes(keyword)) return false;
    return true;
  });
}

export function randomCandidates(recipes: EditableRecipe[], filter: RecipeFilter) {
  const direct = filterRecipes(recipes, filter);
  if (direct.length > 0 || filter.category === "all" || filter.series === "fruit" || filter.series === "dog") return direct;
  return filterRecipes(recipes, { ...filter, category: "all" });
}

export function pickRandomRecipe(pool: EditableRecipe[], lastId: string | null) {
  if (pool.length === 0) return null;
  const withoutLast = pool.length > 1 ? pool.filter((recipe) => recipe.id !== lastId) : pool;
  return withoutLast[Math.floor(Math.random() * withoutLast.length)] ?? pool[0];
}

export function toggleSelected(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function formatDinnerTitle(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} 晚餐`;
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}
