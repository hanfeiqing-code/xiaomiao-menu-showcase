export type RecipeSeries = "home" | "fit" | "dog" | "fruit";

export type RecipeTag =
  | "spicy"
  | "sweet"
  | "soup"
  | "stirFry"
  | "steam"
  | "cold";

export type RecipeStatus = "published" | "hidden";
export type RecipeSource = "seed" | "local";
export type RecipeDetailMode = "structured" | "legacy" | "fruit" | "dining";
export type RecipeDiningGroup = "hot" | "chinese" | "international" | "smoke" | "date" | "sweet";

export interface RecipeIngredient {
  order: number;
  group: string;
  name: string;
  quantity: number | null;
  unit: string;
  quantityNote: string;
  preparation: string;
}

export interface RecipeEquipment {
  order: number;
  name: string;
  quantity: number;
  unit: string;
  purpose: string;
  note: string;
}

export interface RecipeStep {
  order: number;
  instruction: string;
  heat: string;
  duration: string;
  tip: string;
}

export interface RecipeEatingWay {
  order: number;
  title: string;
  instruction: string;
  tip: string;
}

export interface RecipeVariety {
  order: number;
  name: string;
  alias: string;
  note: string;
  sourceUrl: string;
  sourceTitle: string;
}

export interface RecipeDiningPlace {
  order: number;
  name: string;
  location: string;
  note: string;
}

export interface Recipe {
  id: string;
  name: string;
  series: RecipeSeries;
  tags: RecipeTag[];
  coverPath: string;
  detailPath: string;
  status: RecipeStatus;
  sortOrder: number;
  source: RecipeSource;
  createdAt: string;
  updatedAt: string;
  detailMode?: RecipeDetailMode;
  servings?: string;
  equipment?: RecipeEquipment[];
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
  seasonMonths?: string;
  seasonNote?: string;
  varieties?: RecipeVariety[];
  eatingWays?: RecipeEatingWay[];
  places?: RecipeDiningPlace[];
  diningGroup?: RecipeDiningGroup;
}

export const SERIES = [
  { id: "home", label: "家常菜" },
  { id: "fit", label: "减脂餐" },
  { id: "dog", label: "狗狗大餐" },
  { id: "fruit", label: "水果" },
] as const satisfies ReadonlyArray<{ id: RecipeSeries; label: string }>;

export const CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "spicy", label: "辣一点" },
  { id: "sweet", label: "甜口" },
  { id: "soup", label: "汤类" },
  { id: "stirFry", label: "炒菜" },
  { id: "steam", label: "蒸菜" },
  { id: "cold", label: "凉拌" },
] as const satisfies ReadonlyArray<{
  id: "all" | RecipeTag;
  label: string;
}>;

export const RECIPES: Recipe[] = GENERATED_RECIPES;

export const recipes = RECIPES;

export const RECIPES_BY_ID = new Map(
  RECIPES.map((item) => [item.id, item]),
);

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES_BY_ID.get(id);
}

export function getSeriesLabel(series: RecipeSeries): string {
  return SERIES.find((item) => item.id === series)?.label ?? series;
}

export function getTagLabel(tag: RecipeTag): string {
  return CATEGORIES.find((item) => item.id === tag)?.label ?? tag;
}
import { GENERATED_RECIPES } from "./recipes.generated";
