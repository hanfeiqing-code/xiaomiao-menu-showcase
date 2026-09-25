"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  RECIPES,
  type RecipeDiningPlace,
  type RecipeEatingWay,
  type RecipeEquipment,
  type RecipeIngredient,
  type RecipeStep,
  type RecipeVariety,
} from "@/app/data/recipes";
import { getAvatarById, pickRandomAvatar } from "@/app/data/avatars";
import { calculateRecipeMenuCounts, sortRecipesByMenuCount } from "@/app/lib/recipe-popularity";
import { DINING_GROUP_OPTIONS } from "@/app/lib/dining-groups";
import { FRUIT_MONTH_OPTIONS } from "@/app/lib/fruit-months";
import { drawLoveQuote, getLoveQuote } from "@/app/lib/love-quotes";
import { Dialog } from "./Dialog";
import { RecipeImage } from "./RecipeImage";
import { ShowcaseGuide } from "./ShowcaseGuide";
import {
  CATEGORY_OPTIONS,
  SERIES_OPTIONS,
  seriesLabel,
  tagLabel,
} from "@/app/lib/recipe-options";
import {
  clearMenuState,
  diningPlaceSnapshotsForRecipes,
  EMPTY_STATE,
  fileToDataUrl,
  filterRecipes,
  formatDateTime,
  formatDinnerTitle,
  mergeRecipes,
  pickRandomRecipe,
  randomCandidates,
  readMenuState,
  toggleSelected,
  writeMenuState,
  type EditableRecipe,
  type CustomDiningPlace,
  type MockPairingState,
  type PersistedMenuState,
} from "@/app/lib/menu-state";

type MainTab = "choose" | "menu" | "mine";
type DiningPlaceDraft = Pick<CustomDiningPlace, "name" | "location" | "note">;
type Layer =
  | { type: "detail"; recipeId: string }
  | { type: "manage" }
  | { type: "content-guide" }
  | { type: "pairing" }
  | { type: "editor"; recipeId?: string }
  | null;

const BOTTOM_TABS: { id: MainTab; label: string; icon: string }[] = [
  { id: "choose", label: "选菜", icon: "♡" },
  { id: "menu", label: "菜单", icon: "☷" },
  { id: "mine", label: "我的", icon: "⌂" },
];

const SHARE_QUERY_KEY = "menu";

function sharedRecipeIdsFromUrl() {
  const value = new URLSearchParams(window.location.search).get(SHARE_QUERY_KEY);
  if (!value) return [];

  const seedIds = new Set(RECIPES.map((item) => item.id));
  return [...new Set(value.split(","))].filter((id) => seedIds.has(id));
}

function shareUrlForRecipeIds(recipeIds: string[]) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(SHARE_QUERY_KEY, recipeIds.join(","));
  return url.toString();
}

export function MenuApp() {
  const [state, setState] = useState<PersistedMenuState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("choose");
  const [layer, setLayer] = useState<Layer>(null);
  const [series, setSeries] = useState("home");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [lastRandomId, setLastRandomId] = useState<string | null>(null);
  const [randomId, setRandomId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const storageWarningShown = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedState = readMenuState();
      const sharedIds = sharedRecipeIdsFromUrl();
      setState(sharedIds.length ? { ...savedState, selectedIds: sharedIds } : savedState);
      if (sharedIds.length) {
        setActiveTab("menu");
        window.history.replaceState({}, "", window.location.pathname);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const result = writeMenuState(state);
    if (!result.ok && !storageWarningShown.current) {
      storageWarningShown.current = true;
      setToast(
        result.quota
          ? "图片较大，浏览器存储空间不足；本次会话仍可预览，刷新后新图片可能丢失"
          : "本机数据暂时无法保存；本次会话仍可继续使用",
      );
    }
  }, [hydrated, state]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const recipes = useMemo(
    () => mergeRecipes(RECIPES, state.overrides, state.localRecipes),
    [state.localRecipes, state.overrides],
  );
  const recipeById = useMemo(() => new Map(recipes.map((item) => [item.id, item])), [recipes]);
  const selectedRecipes = state.selectedIds.map((id) => recipeById.get(id)).filter(Boolean) as EditableRecipe[];
  const currentAvatar = state.avatarId ? getAvatarById(state.avatarId) : undefined;
  const recipeMenuCounts = useMemo(() => calculateRecipeMenuCounts(state.history), [state.history]);
  const filteredRecipes = useMemo(
    () => {
      const filtered = filterRecipes(recipes, { series, category, search });
      return series === "fruit"
        ? [...filtered].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "zh-CN"))
        : sortRecipesByMenuCount(filtered, recipeMenuCounts);
    },
    [category, recipeMenuCounts, recipes, search, series],
  );
  const detailRecipe = layer?.type === "detail" ? recipeById.get(layer.recipeId) : undefined;
  const randomRecipe = randomId ? recipeById.get(randomId) : undefined;
  const menuSignature = [...state.selectedIds].sort().join("|");
  const currentLoveQuote = getLoveQuote(state.loveQuoteId);

  useEffect(() => {
    if (!hydrated || !menuSignature || state.loveQuoteMenuSignature === menuSignature && currentLoveQuote) return;
    const timer = window.setTimeout(() => {
      setState((previous) => {
        const signature = [...previous.selectedIds].sort().join("|");
        if (!signature || previous.loveQuoteMenuSignature === signature && getLoveQuote(previous.loveQuoteId)) return previous;
        const drawn = drawLoveQuote(previous.loveQuoteRemainingIds, previous.loveQuoteId);
        return {
          ...previous,
          loveQuoteId: drawn.quote?.id ?? null,
          loveQuoteMenuSignature: signature,
          loveQuoteRemainingIds: drawn.remainingIds,
        };
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentLoveQuote, hydrated, menuSignature, state.loveQuoteId, state.loveQuoteMenuSignature, state.loveQuoteRemainingIds]);

  function refreshLoveQuote() {
    updateState((previous) => {
      const drawn = drawLoveQuote(previous.loveQuoteRemainingIds, previous.loveQuoteId);
      return {
        ...previous,
        loveQuoteId: drawn.quote?.id ?? null,
        loveQuoteMenuSignature: [...previous.selectedIds].sort().join("|"),
        loveQuoteRemainingIds: drawn.remainingIds,
      };
    });
  }

  function updateState(recipe: (previous: PersistedMenuState) => PersistedMenuState) {
    setState(recipe);
  }

  function toggleDish(recipeId: string) {
    const wasSelected = state.selectedIds.includes(recipeId);
    updateState((previous) => ({
      ...previous,
      selectedIds: toggleSelected(previous.selectedIds, recipeId),
    }));
    setToast(wasSelected ? "已从今晚菜单移除" : "已加入今晚菜单");
  }

  function saveCustomDiningPlace(recipeId: string, draft: DiningPlaceDraft, placeId?: string) {
    const name = draft.name.trim().slice(0, 40);
    if (!name) return false;
    const existing = state.customDiningPlaces[recipeId] ?? [];
    const official = recipeById.get(recipeId)?.places ?? [];
    const duplicate = [
      ...official,
      ...existing.filter((place) => place.id !== placeId),
    ].some((place) => place.name.toLocaleLowerCase("zh-CN") === name.toLocaleLowerCase("zh-CN"));
    if (duplicate) {
      setToast("这家店已经记下来啦");
      return false;
    }

    const previousPlace = placeId ? existing.find((place) => place.id === placeId) : undefined;
    if (placeId && !previousPlace) {
      setToast("这条店铺记录已经不存在了");
      return false;
    }
    const now = new Date().toISOString();
    const place: CustomDiningPlace = {
      id: previousPlace?.id ?? `browser-place-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      location: draft.location.trim().slice(0, 60),
      note: draft.note.trim().slice(0, 120),
      createdAt: previousPlace?.createdAt ?? now,
      updatedAt: now,
    };
    updateState((previous) => ({
      ...previous,
      customDiningPlaces: {
        ...previous.customDiningPlaces,
        [recipeId]: previousPlace
          ? (previous.customDiningPlaces[recipeId] ?? []).map((item) => item.id === previousPlace.id ? place : item)
          : [...(previous.customDiningPlaces[recipeId] ?? []), place],
      },
    }));
    setToast(previousPlace ? `已更新“${name}”` : `已记下“${name}”`);
    return true;
  }

  function deleteCustomDiningPlace(recipeId: string, placeId: string) {
    updateState((previous) => {
      const nextPlaces = (previous.customDiningPlaces[recipeId] ?? []).filter((place) => place.id !== placeId);
      const customDiningPlaces = { ...previous.customDiningPlaces };
      if (nextPlaces.length) customDiningPlaces[recipeId] = nextPlaces;
      else delete customDiningPlaces[recipeId];
      return { ...previous, customDiningPlaces };
    });
    setToast("这条店铺记录已删除");
  }

  function showRandom() {
    const pool = randomCandidates(recipes, { series, category, search });
    const picked = pickRandomRecipe(pool, lastRandomId);
    if (!picked) {
      const emptyTitle = series === "dog"
        ? "狗狗大餐还在准备中"
        : series === "fruit"
          ? "水果篮还空着"
          : "当前筛选下还没有菜，换个分类试试吧";
      setToast(emptyTitle);
      return;
    }
    setLastRandomId(picked.id);
    setRandomId(picked.id);
  }

  function openDetail(recipeId: string) {
    setRandomId(null);
    setLayer({ type: "detail", recipeId });
  }

  function goToTab(tab: MainTab) {
    setLayer(null);
    setActiveTab(tab);
  }

  function saveRecipe(recipe: EditableRecipe) {
    if (recipe.source === "local") {
      updateState((previous) => {
        const exists = previous.localRecipes.some((item) => item.id === recipe.id);
        return {
          ...previous,
          localRecipes: exists
            ? previous.localRecipes.map((item) => (item.id === recipe.id ? recipe : item))
            : [...previous.localRecipes, recipe],
        };
      });
    } else {
      const { id, source: _source, ...fields } = recipe;
      void _source;
      updateState((previous) => ({
        ...previous,
        overrides: {
          ...previous.overrides,
          [id]: { ...fields, updatedAt: new Date().toISOString() },
        },
      }));
    }
    setLayer({ type: "manage" });
    setToast(recipe.source === "local" ? "浏览器草稿已保存" : "内置菜品覆盖已保存");
  }

  function restoreSeed(recipeId: string) {
    updateState((previous) => {
      const overrides = { ...previous.overrides };
      delete overrides[recipeId];
      return { ...previous, overrides };
    });
    setToast("已恢复为内置内容");
  }

  function togglePublished(recipe: EditableRecipe) {
    const nextStatus = recipe.status === "published" ? "hidden" : "published";
    if (recipe.source === "local") {
      updateState((previous) => ({
        ...previous,
        localRecipes: previous.localRecipes.map((item) =>
          item.id === recipe.id ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() } : item,
        ),
      }));
    } else {
      updateState((previous) => ({
        ...previous,
        overrides: {
          ...previous.overrides,
          [recipe.id]: {
            ...(previous.overrides[recipe.id] ?? {}),
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    }
    setToast(nextStatus === "hidden" ? "菜品已下架" : "菜品已上架");
  }

  function deleteLocal(recipe: EditableRecipe) {
    if (!window.confirm(`确定删除“${recipe.name}”吗？删除后无法恢复。`)) return;
    updateState((previous) => ({
      ...previous,
      localRecipes: previous.localRecipes.filter((item) => item.id !== recipe.id),
      selectedIds: previous.selectedIds.filter((id) => id !== recipe.id),
    }));
    setToast("浏览器草稿已删除");
  }

  async function copyDinnerShareLink() {
    if (!selectedRecipes.length) {
      setToast("先选几道菜再分享吧");
      return;
    }
    if (selectedRecipes.some((recipe) => recipe.source === "local")) {
      setToast("本机新增菜品将在微信云端版支持分享");
      return;
    }

    const shareUrl = shareUrlForRecipeIds(selectedRecipes.map((recipe) => recipe.id));
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("菜单链接已复制，可以发给怡宝啦");
    } catch {
      window.prompt("复制这个菜单链接", shareUrl);
    }
  }

  return (
    <div className="site-stage">
      <div className="ambient ambient--one" aria-hidden="true" />
      <div className="ambient ambient--two" aria-hidden="true" />

      <main className="phone-shell">
        <div className="phone-content">
        {/* 顶部品牌区：标题、副标题和装饰文案 */}
        {!layer && (
          <header className="brand-header">
            <div>
              <p className="brand-kicker">OUR DINNER · 每天都要好好吃饭</p>
              <h1>小猫宝宝小菜单 <span aria-hidden="true">♡</span></h1>
              <p>{activeTab === "choose" ? "小猫宝宝，今晚想吃什么呀？" : activeTab === "menu" ? "把喜欢的菜装进今晚" : "我们的每一顿，都值得记住"}</p>
            </div>
            <div className={`brand-badge ${currentAvatar ? "brand-badge--avatar" : ""}`} aria-label={currentAvatar ? undefined : "情侣晚餐菜单"}>
              {currentAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentAvatar.path} alt="小猫宝宝今日头像" />
              ) : (
                <><span>CAT</span><small>MENU</small></>
              )}
            </div>
          </header>
        )}

        {/* 主页面内容：选菜、菜单、我的 */}
        {!layer && activeTab === "choose" && (
          <ChooseView
            series={series}
            category={category}
            search={search}
            recipes={filteredRecipes}
            recipeMenuCounts={recipeMenuCounts}
            selectedIds={state.selectedIds}
            customDiningPlaces={state.customDiningPlaces}
            onSeriesChange={(value) => {
              setSeries(value);
              setCategory("all");
              setSearch("");
            }}
            onCategoryChange={setCategory}
            onSearchChange={setSearch}
            onRandom={showRandom}
            onToggle={toggleDish}
            onDetail={openDetail}
          />
        )}
        {!layer && activeTab === "menu" && (
          <DinnerMenuView
            recipes={selectedRecipes}
            customDiningPlaces={state.customDiningPlaces}
            pairBound={state.mockPairing.status === "bound"}
            loveQuote={currentLoveQuote?.text ?? "认真选的每一道，都是想和你一起吃。"}
            onRefreshLoveQuote={refreshLoveQuote}
            onDetail={openDetail}
            onRemove={toggleDish}
            onClear={() => {
              if (selectedRecipes.length && window.confirm("确定清空今晚菜单吗？")) {
                updateState((previous) => ({ ...previous, selectedIds: [] }));
                setToast("今晚菜单已清空");
              }
            }}
            onChoose={() => goToTab("choose")}
            onShare={copyDinnerShareLink}
            onSave={(title, chefNote) => {
              if (!selectedRecipes.length) {
                setToast("先选几道菜再保存吧");
                return;
              }
              const now = new Date().toISOString();
              updateState((previous) => ({
                ...previous,
                history: [
                  {
                    id: `menu-${Date.now()}`,
                    title: title.trim() || formatDinnerTitle(),
                    chefNote: chefNote.trim(),
                    dishIds: previous.selectedIds,
                    createdAt: now,
                    loveQuote: currentLoveQuote?.text,
                    diningPlaceSnapshots: diningPlaceSnapshotsForRecipes(
                      previous.selectedIds,
                      recipeById,
                      previous.customDiningPlaces,
                    ),
                    targetPairId: previous.mockPairing.status === "bound" ? "local-preview-pair" : undefined,
                    syncStatus: previous.mockPairing.status === "bound" ? "synced" : "localOnly",
                    sentAt: previous.mockPairing.status === "bound" ? now : undefined,
                  },
                  ...previous.history,
                ],
              }));
              setToast(state.mockPairing.status === "bound" ? "本地模拟：已保存并送达 TA" : "今晚菜单已保存到回忆里");
            }}
          />
        )}
        {!layer && activeTab === "mine" && (
          <MineView
            state={state}
            recipeById={recipeById}
            onPairing={() => setLayer({ type: "pairing" })}
            onManage={() => setLayer({ type: "manage" })}
            onContentGuide={() => setLayer({ type: "content-guide" })}
            onGenerateAvatar={() => {
              const avatar = pickRandomAvatar();
              updateState((previous) => ({ ...previous, avatarId: avatar.id }));
            }}
            onReuse={(dishIds) => {
              const available = dishIds.filter((id) => recipeById.has(id));
              updateState((previous) => ({ ...previous, selectedIds: available }));
              goToTab("menu");
              setToast("这份晚餐已放回菜单");
            }}
            onDeleteHistory={(id) => updateState((previous) => ({ ...previous, history: previous.history.filter((item) => item.id !== id) }))}
            onSendHistory={(id) => {
              if (state.mockPairing.status !== "bound") {
                setLayer({ type: "pairing" });
                setToast("请先完成本地模拟绑定");
                return;
              }
              const sentAt = new Date().toISOString();
              updateState((previous) => ({
                ...previous,
                history: previous.history.map((item) => item.id === id
                  ? { ...item, targetPairId: "local-preview-pair", syncStatus: "synced", sentAt }
                  : item),
              }));
              setToast("本地模拟：这份旧晚餐已送达 TA");
            }}
            onReset={() => {
              if (!window.confirm("确定重置全部本机数据吗？历史、当前菜单和修改都会清除。")) return;
              clearMenuState();
              setState(EMPTY_STATE);
              setToast("本机数据已重置");
            }}
          />
        )}

        {/* 二级页面：菜品详情、菜品管理和编辑 */}
        {layer?.type === "detail" && (
          <DetailView
            recipe={detailRecipe}
            selected={detailRecipe ? state.selectedIds.includes(detailRecipe.id) : false}
            customPlaces={detailRecipe ? state.customDiningPlaces[detailRecipe.id] ?? [] : []}
            onBack={() => setLayer(null)}
            onToggle={() => detailRecipe && toggleDish(detailRecipe.id)}
            onSavePlace={(draft, placeId) => detailRecipe ? saveCustomDiningPlace(detailRecipe.id, draft, placeId) : false}
            onDeletePlace={(placeId) => detailRecipe && deleteCustomDiningPlace(detailRecipe.id, placeId)}
          />
        )}
        {layer?.type === "manage" && (
          <ManageView
            recipes={recipes}
            overriddenIds={new Set(Object.keys(state.overrides))}
            onBack={() => setLayer(null)}
            onAdd={() => setLayer({ type: "editor" })}
            onEdit={(recipeId) => setLayer({ type: "editor", recipeId })}
            onToggleStatus={togglePublished}
            onRestore={restoreSeed}
            onDelete={deleteLocal}
          />
        )}
        {layer?.type === "content-guide" && (
          <ContentGuideView onBack={() => setLayer(null)} />
        )}
        {layer?.type === "pairing" && (
          <MockPairingView
            pairing={state.mockPairing}
            avatarId={state.avatarId}
            selectedIds={state.selectedIds}
            recipeById={recipeById}
            customDiningPlaces={state.customDiningPlaces}
            onBack={() => setLayer(null)}
            onChange={(mockPairing) => updateState((previous) => ({ ...previous, mockPairing }))}
            onMessage={setToast}
          />
        )}
        {layer?.type === "editor" && (
          <RecipeEditor
            recipe={layer.recipeId ? recipeById.get(layer.recipeId) : undefined}
            onBack={() => setLayer({ type: "manage" })}
            onSave={saveRecipe}
            onMessage={setToast}
          />
        )}

        </div>

        {/* 选菜后的快捷入口：与手机壳同级，避免滚动到作品说明时脱离产品画布。 */}
        {!layer && activeTab === "choose" && state.selectedIds.length > 0 && (
          <button type="button" className="selection-float" onClick={() => goToTab("menu")}>
            <span><b>{state.selectedIds.length}</b> 道心动菜品</span><strong>查看菜单 →</strong>
          </button>
        )}

        {/* 底部主导航：模拟微信小程序 TabBar */}
        {!layer && (
          <nav className="bottom-nav" aria-label="主要导航">
            {BOTTOM_TABS.map((item) => (
              <button key={item.id} type="button" className={activeTab === item.id ? "is-active" : ""} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => goToTab(item.id)}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                {item.id === "menu" && state.selectedIds.length > 0 && <b>{state.selectedIds.length}</b>}
                {item.id === "mine" && state.mockPairing.inbox.some((record) => !record.read) && (
                  <b>{state.mockPairing.inbox.filter((record) => !record.read).length}</b>
                )}
              </button>
            ))}
          </nav>
        )}

        {/* 随机推荐弹窗 */}
        {randomRecipe && (
          <Dialog title={randomRecipe.series === "fruit" ? "帮我挑一种" : randomRecipe.series === "dog" ? "帮我挑一类" : "帮我挑一道"} onClose={() => setRandomId(null)} className="random-dialog">
            <p className="eyebrow">今晚的心动推荐</p>
            <RecipeImage className="random-cover" src={randomRecipe.coverPath} alt={randomRecipe.name} />
            <div className="random-sparkle" aria-hidden="true">✦</div>
            <h2>{randomRecipe.name}</h2>
            <p className="muted">{randomRecipe.series === "fruit" && randomRecipe.seasonMonths
              ? `水果 · 上市月份 ${randomRecipe.seasonMonths}`
              : randomRecipe.series === "dog"
                ? `狗狗大餐 · ${(randomRecipe.places?.length ?? 0) + (state.customDiningPlaces[randomRecipe.id]?.length ?? 0) > 0
                  ? `已收藏 ${(randomRecipe.places?.length ?? 0) + (state.customDiningPlaces[randomRecipe.id]?.length ?? 0)} 家`
                  : "等我们去发现"}`
              : `${seriesLabel(randomRecipe.series)} · ${randomRecipe.tags.map(tagLabel).join(" · ") || "好吃就对啦"}`}</p>
            <div className="dialog-actions">
              <button type="button" className="button button--ghost" onClick={showRandom}>{randomRecipe.series === "dog" ? "换一类" : "换一道"}</button>
              <button type="button" className="button button--soft" onClick={() => openDetail(randomRecipe.id)}>{randomRecipe.series === "fruit" ? "看吃法" : randomRecipe.series === "dog" ? "看店铺" : "看做法"}</button>
              <button type="button" className="button button--primary" onClick={() => toggleDish(randomRecipe.id)}>
                {state.selectedIds.includes(randomRecipe.id) ? "移出菜单" : "加入菜单"}
              </button>
            </div>
          </Dialog>
        )}

        <div className={`toast ${toast ? "toast--visible" : ""}`} role="status" aria-live="polite">{toast}</div>
      </main>
      <ShowcaseGuide />
    </div>
  );
}

type ChooseViewProps = {
  series: string;
  category: string;
  search: string;
  recipes: EditableRecipe[];
  recipeMenuCounts: ReadonlyMap<string, number>;
  selectedIds: string[];
  customDiningPlaces: Readonly<Record<string, readonly CustomDiningPlace[]>>;
  onSeriesChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onRandom: () => void;
  onToggle: (id: string) => void;
  onDetail: (id: string) => void;
};

const CARD_DOG_SEQUENCE = [
  { src: "/decorations/dogs/dog-side-yellow-v2.png", className: "card-dog--left" },
  { src: "/decorations/dogs/dog-side-white-v2.png", className: "card-dog--right" },
] as const;

function ChooseView(props: ChooseViewProps) {
  const isDining = props.series === "dog";
  const isFruit = props.series === "fruit";
  const railOptions = isDining ? DINING_GROUP_OPTIONS : isFruit ? FRUIT_MONTH_OPTIONS : CATEGORY_OPTIONS;
  const selectedRailLabel = railOptions.find((item) => item.id === props.category)?.label ?? "全部";
  const specialEmpty = props.category === "all" && !props.search.trim()
    ? props.series === "dog"
      ? { icon: "🐾", title: "外出大餐还在准备中", copy: "把想吃的大类写进正式 Excel，它们就会出现在这里" }
      : props.series === "fruit"
        ? { icon: "🍎", title: "水果篮还空着", copy: "以后可以在这里添加草莓、西瓜、葡萄等喜欢的水果" }
        : null
    : null;
  return (
    <section className="page-content choose-page" aria-label="选菜">
      {/* 系列切换和搜索 */}
      <div className="series-tabs" role="tablist" aria-label="菜品系列">
        {SERIES_OPTIONS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={props.series === item.id} className={props.series === item.id ? "is-active" : ""} onClick={() => props.onSeriesChange(item.id)}>
            <span aria-hidden="true">{item.emoji}</span>{item.label}
          </button>
        ))}
      </div>
      <div className="search-row">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} placeholder={isDining ? "搜一搜想吃的大类" : isFruit ? "搜一搜想吃的水果" : "搜一搜想吃的菜"} aria-label={isDining ? "搜索外出大餐" : isFruit ? "搜索水果" : "搜索菜品"} />
          {props.search && <button type="button" aria-label="清空搜索" onClick={() => props.onSearchChange("")}>×</button>}
        </label>
        <button className="random-button" type="button" onClick={props.onRandom}><span aria-hidden="true">✦</span> 帮我挑</button>
      </div>

      {/* 左侧分类 + 右侧菜品列表 */}
      <div className="catalog-layout">
        <aside className={`category-rail ${isFruit ? "category-rail--months" : isDining ? "category-rail--dining" : ""}`} aria-label={isFruit ? "水果月份" : isDining ? "外出大餐分类" : "菜品分类"}>
          {railOptions.map((item) => (
            <button key={item.id} type="button" className={props.category === item.id ? "is-active" : ""} aria-pressed={props.category === item.id} onClick={() => props.onCategoryChange(item.id)}>
              {item.emoji && <span aria-hidden="true">{item.emoji}</span>}{item.label}
            </button>
          ))}
        </aside>
        <div className="dish-column">
          <div className="result-heading"><strong>{selectedRailLabel}</strong><span>{props.recipes.length} {props.series === "fruit" ? "种" : isDining ? "类" : "道"}</span></div>
          {props.recipes.length ? props.recipes.map((recipe, index) => {
            const dog = CARD_DOG_SEQUENCE[index % CARD_DOG_SEQUENCE.length];
            return (
            <article className="dish-card" key={recipe.id}>
              {/* 每道菜只有一只抱边小狗，按“镜像黄狗左上、白狗右上”循环。 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={`card-dog ${dog.className}`} src={dog.src} alt="" aria-hidden="true" />
              <button type="button" className="dish-card__main" onClick={() => props.onDetail(recipe.id)} aria-label={`查看${recipe.name}${recipe.series === "fruit" ? "水果详情" : recipe.series === "dog" ? "店铺详情" : "做法"}`}>
                <RecipeImage className="dish-cover" src={recipe.coverPath} alt={recipe.name} />
                <span className={`dish-copy ${recipe.series === "fruit" ? "dish-copy--fruit" : ""}`}>
                  <strong>{recipe.name}</strong>
                  {recipe.series !== "fruit" && <small className="dish-tags">{recipe.series === "dog"
                    ? `狗狗大餐 · ${(recipe.places?.length ?? 0) + (props.customDiningPlaces[recipe.id]?.length ?? 0) > 0
                      ? `已收藏 ${(recipe.places?.length ?? 0) + (props.customDiningPlaces[recipe.id]?.length ?? 0)} 家`
                      : "等我们去发现"}`
                    : recipe.tags.slice(0, 2).map(tagLabel).join(" · ") || seriesLabel(recipe.series)}</small>}
                  {recipe.series === "fruit" && recipe.seasonMonths?.trim() && <small className="dish-season">上市月份 · {recipe.seasonMonths}</small>}
                  <small className="dish-popularity">入选 {props.recipeMenuCounts.get(recipe.id) ?? 0} 次</small>
                </span>
              </button>
              <button type="button" className={`add-button ${props.selectedIds.includes(recipe.id) ? "is-added" : ""}`} aria-label={props.selectedIds.includes(recipe.id) ? `从菜单移除${recipe.name}` : `将${recipe.name}加入菜单`} onClick={() => props.onToggle(recipe.id)}>
                {props.selectedIds.includes(recipe.id) ? "✓" : "+"}
              </button>
            </article>
          )}) : specialEmpty ? (
            <div className="empty-state compact-empty"><span aria-hidden="true">{specialEmpty.icon}</span><h3>{specialEmpty.title}</h3><p>{specialEmpty.copy}</p></div>
          ) : (
            <div className="empty-state compact-empty"><span aria-hidden="true">🥢</span><h3>这一栏还是空的</h3><p>换个分类，或者清空搜索词看看</p></div>
          )}
        </div>
      </div>

    </section>
  );
}

type DinnerMenuViewProps = {
  recipes: EditableRecipe[];
  customDiningPlaces: Readonly<Record<string, readonly CustomDiningPlace[]>>;
  pairBound: boolean;
  onDetail: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onChoose: () => void;
  onShare: () => void;
  onSave: (title: string, chefNote: string) => void;
  loveQuote: string;
  onRefreshLoveQuote: () => void;
};

function DinnerMenuView({ recipes, customDiningPlaces, pairBound, onDetail, onRemove, onClear, onChoose, onShare, onSave, loveQuote, onRefreshLoveQuote }: DinnerMenuViewProps) {
  const [title, setTitle] = useState(() => formatDinnerTitle());
  const [chefNote, setChefNote] = useState("");

  if (!recipes.length) {
    return (
      <section className="page-content menu-page">
        <div className="empty-state big-empty"><span aria-hidden="true">🍽️</span><h2>今晚菜单还空着呢</h2><p>去挑几道彼此都喜欢的菜吧</p><button className="button button--primary" type="button" onClick={onChoose}>去选菜</button></div>
      </section>
    );
  }

  return (
    <section className="page-content menu-page" aria-label="今晚菜单">
      {/* 今晚菜单概览 */}
      <button className="menu-summary" type="button" onClick={onRefreshLoveQuote} aria-label="点击更换一条情话">
        <div><span>TONIGHT&apos;S MENU</span><strong>{recipes.length}</strong><small>道菜</small></div>
        <p>“{loveQuote}”</p>
      </button>
      <div className="section-heading"><div><span>已选菜品</span><h2>今晚吃这些</h2></div><button type="button" onClick={onClear}>清空</button></div>
      <div className="selected-list">
        {recipes.map((recipe, index) => (
          <article className="selected-card" key={recipe.id}>
            <span className="order-number">{String(index + 1).padStart(2, "0")}</span>
            <button type="button" className="selected-card__main" onClick={() => onDetail(recipe.id)}>
              <RecipeImage className="selected-cover" src={recipe.coverPath} alt={recipe.name} />
              <span><strong>{recipe.name}</strong><small>{recipe.series === "fruit" && recipe.seasonMonths
                ? `水果 · ${recipe.seasonMonths}`
                : `${seriesLabel(recipe.series)} · ${recipe.tags.slice(0, 1).map(tagLabel)}`}</small>
                {recipe.series === "dog" && (customDiningPlaces[recipe.id]?.length ?? 0) > 0 && (
                  <small className="selected-place-summary">店铺 · {customDiningPlaces[recipe.id].map((place) => place.name).join("、")}</small>
                )}
              </span>
            </button>
            <button type="button" className="remove-button" aria-label={`移除${recipe.name}`} onClick={() => onRemove(recipe.id)}>×</button>
          </article>
        ))}
      </div>

      {/* 保存菜单区 */}
      <div className="save-card">
        <label htmlFor="menu-title">给这顿晚餐起个名字</label>
        <input id="menu-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label htmlFor="chef-note">对鸡毛大厨说</label>
        <textarea id="chef-note" maxLength={200} value={chefNote} onChange={(event) => setChefNote(event.target.value)} placeholder="可以写口味、忌口，或者想对大厨说的话……" />
        <button className="button button--primary button--wide" type="button" onClick={() => onSave(title, chefNote)}>
          {pairBound ? "♡ 保存并告诉 TA" : "♡ 保存今晚菜单"}
        </button>
        <button className="button button--soft button--wide" type="button" onClick={onShare}>分享</button>
        <button className="button button--ghost button--wide choose-again" type="button" onClick={onChoose}>重新选菜</button>
        <small>保存后不会清空，想换菜随时回来调整</small>
      </div>
    </section>
  );
}

type DetailViewProps = {
  recipe?: EditableRecipe;
  selected: boolean;
  customPlaces: readonly CustomDiningPlace[];
  onBack: () => void;
  onToggle: () => void;
  onSavePlace: (draft: DiningPlaceDraft, placeId?: string) => boolean;
  onDeletePlace: (placeId: string) => void;
};

function byRecipeOrder<T extends { order: number }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => Number(left.order) - Number(right.order));
}

function groupRecipeIngredients(ingredients: readonly RecipeIngredient[]) {
  const groups = new Map<string, RecipeIngredient[]>();
  byRecipeOrder(ingredients).forEach((ingredient) => {
    const group = ingredient.group?.trim() || "其他用料";
    groups.set(group, [...(groups.get(group) ?? []), ingredient]);
  });
  return [...groups.entries()];
}

function ingredientAmount(ingredient: RecipeIngredient) {
  const quantity = ingredient.quantity === null || ingredient.quantity === undefined
    ? ""
    : `${ingredient.quantity}${ingredient.unit ?? ""}`;
  return [ingredient.quantityNote?.trim(), quantity].filter(Boolean).join(" ");
}

function equipmentAmount(equipment: RecipeEquipment) {
  return `${equipment.quantity}${equipment.unit}`;
}

function diningPlaceDetailText(place: { name: string; location?: string; note?: string }) {
  const location = place.location?.trim();
  const note = place.note?.trim();
  return `${place.name}${location ? ` · ${location}` : ""}${note ? `（${note}）` : ""}`;
}

function DetailView({ recipe, selected, customPlaces, onBack, onToggle, onSavePlace, onDeletePlace }: DetailViewProps) {
  const [addingPlace, setAddingPlace] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | undefined>();
  const [placeDraft, setPlaceDraft] = useState<DiningPlaceDraft>({ name: "", location: "", note: "" });
  const placeInputRef = useRef<HTMLInputElement>(null);
  const equipment = recipe && Array.isArray(recipe.equipment) ? recipe.equipment : [];
  const ingredients = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = recipe && Array.isArray(recipe.steps) ? recipe.steps : [];
  const hasStructuredRecipe = ingredients.length > 0 && steps.length > 0;
  const varieties = recipe && Array.isArray(recipe.varieties) ? recipe.varieties : [];
  const eatingWays = recipe && Array.isArray(recipe.eatingWays) ? recipe.eatingWays : [];
  const places = recipe && Array.isArray(recipe.places) ? recipe.places : [];
  const isFruit = recipe?.detailMode === "fruit" && recipe.series === "fruit" && eatingWays.length > 0;
  const isDining = recipe?.detailMode === "dining" && recipe.series === "dog";
  const diningPlaceCount = places.length + customPlaces.length;

  useEffect(() => {
    if (addingPlace) placeInputRef.current?.focus();
  }, [addingPlace]);

  function submitPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!placeDraft.name.trim()) return;
    if (!onSavePlace(placeDraft, editingPlaceId)) return;
    setPlaceDraft({ name: "", location: "", note: "" });
    setEditingPlaceId(undefined);
    setAddingPlace(false);
  }

  function startAddingPlace() {
    setEditingPlaceId(undefined);
    setPlaceDraft({ name: "", location: "", note: "" });
    setAddingPlace(true);
  }

  function startEditingPlace(place: CustomDiningPlace) {
    setEditingPlaceId(place.id);
    setPlaceDraft({ name: place.name, location: place.location, note: place.note });
    setAddingPlace(true);
  }

  function cancelPlaceDraft() {
    setAddingPlace(false);
    setEditingPlaceId(undefined);
    setPlaceDraft({ name: "", location: "", note: "" });
  }

  return (
    <section className="subpage detail-page">
      <header className="subpage-header"><button className="back-button" type="button" onClick={onBack} aria-label="返回">‹</button><strong>{recipe?.series === "fruit" ? "水果详情" : recipe?.series === "dog" ? "外出大餐" : "菜品做法"}</strong><span /></header>
      {!recipe ? (
        <div className="empty-state big-empty"><span aria-hidden="true">?</span><h2>没有找到这道菜</h2><p>它可能已被删除，返回重新选择吧</p><button type="button" className="button button--primary" onClick={onBack}>返回</button></div>
      ) : (
        <>
          {/* 详情头图和菜品信息 */}
          <div className="detail-hero">
            <RecipeImage className="detail-cover" src={recipe.coverPath} alt={recipe.name} />
            <div className="detail-gradient" />
            <div className="detail-title"><span>{seriesLabel(recipe.series)}</span><h1>{recipe.name}</h1><div>{recipe.tags.map((tag) => <em key={tag}>#{tagLabel(tag)}</em>)}</div></div>
          </div>
          {isDining ? (
            <div className="recipe-paper dining-paper">
              <section className="recipe-section dining-places" aria-labelledby="dining-places-heading">
                <div className="recipe-section-heading">
                  <div><span>GOOD PLACES</span><h2 id="dining-places-heading">好吃的店铺</h2></div>
                  <div className="dining-place-heading-actions">
                    <strong className="servings-badge">{diningPlaceCount} 家</strong>
                    {!addingPlace && (
                      <button className="dining-place-add-trigger" type="button" onClick={startAddingPlace} aria-label="手动添加店铺">＋</button>
                    )}
                  </div>
                </div>
                <p className="recipe-section-intro">把吃过、想去和值得再去的店，都慢慢收藏在这里。</p>
                {diningPlaceCount ? (
                  <ol>
                    {byRecipeOrder(places).map((place: RecipeDiningPlace, index) => (
                      <li className="dining-place dining-place--official" key={`${place.order}-${place.name}-${index}`}>
                        <span className="dining-place-number">{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <h3>{place.name}</h3>
                          {place.location?.trim() && <p>{place.location}</p>}
                          {place.note?.trim() && <aside>{place.note}</aside>}
                        </div>
                      </li>
                    ))}
                    {customPlaces.map((place, index) => (
                      <li className="dining-place dining-place--custom" key={place.id}>
                        <span className="dining-place-number">{String(places.length + index + 1).padStart(2, "0")}</span>
                        <div>
                          <small className="dining-place-source">我的记录</small>
                          <h3>{place.name}</h3>
                          {place.location && <p>{place.location}</p>}
                          {place.note && <aside>{place.note}</aside>}
                        </div>
                        <div className="dining-place-actions">
                          <button type="button" className="dining-place-edit" onClick={() => startEditingPlace(place)}>编辑</button>
                          <button type="button" className="dining-place-delete" aria-label={`删除店铺${place.name}`} onClick={() => onDeletePlace(place.id)}>删除</button>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="dining-empty"><span aria-hidden="true">♡</span><h3>这里还没有收藏的店</h3><p>点击右上角的＋，把第一家好店记下来 ♡</p></div>
                )}
                {addingPlace && (
                  <div className="dining-place-compose is-editing">
                    <form onSubmit={submitPlace}>
                      <div className="dining-place-editor-heading">
                        <strong>{editingPlaceId ? "修改我的店铺" : "记下一家好吃的店"}</strong>
                        <button type="button" className="dining-place-cancel" onClick={cancelPlaceDraft}>取消</button>
                      </div>
                      <div className="dining-place-editor-main">
                        <input
                          ref={placeInputRef}
                          maxLength={40}
                          value={placeDraft.name}
                          onChange={(event) => setPlaceDraft((previous) => ({ ...previous, name: event.target.value }))}
                          placeholder="店铺名称（必填）"
                          aria-label="输入要收藏的店铺名称"
                        />
                        <button className="dining-place-save" type="submit" disabled={!placeDraft.name.trim()} aria-label="保存店铺">✓</button>
                      </div>
                      <input
                        className="dining-place-optional-input"
                        maxLength={60}
                        value={placeDraft.location}
                        onChange={(event) => setPlaceDraft((previous) => ({ ...previous, location: event.target.value }))}
                        placeholder="地点 / 分店（选填）"
                        aria-label="输入店铺地点或分店"
                      />
                      <textarea
                        maxLength={120}
                        value={placeDraft.note}
                        onChange={(event) => setPlaceDraft((previous) => ({ ...previous, note: event.target.value }))}
                        placeholder="想记住的味道、推荐菜或备注（选填）"
                        aria-label="输入店铺备注"
                      />
                    </form>
                  </div>
                )}
                <p className="dining-place-local-note">手动补充的店铺保存在当前浏览器；保存菜单时会把这份记录一起带上。</p>
              </section>
            </div>
          ) : isFruit ? (
            <div className="recipe-paper fruit-paper">
              <section className="fruit-season-card" aria-labelledby="fruit-season-heading">
                <div><span>SEASON</span><h2 id="fruit-season-heading">上架季节</h2></div>
                <strong>{recipe.seasonMonths}</strong>
                <p>{recipe.seasonNote}</p>
              </section>
              <section className="recipe-section fruit-varieties" aria-labelledby="fruit-varieties-heading">
                <div className="recipe-section-heading">
                  <div><span>FAMOUS VARIETIES</span><h2 id="fruit-varieties-heading">品种</h2></div>
                  <strong className="fruit-variety-count">{varieties.length} 种</strong>
                </div>
                <p className="recipe-section-intro">同一种水果也有不同风味，看看今天更想吃哪一种。</p>
                <ol>
                  {byRecipeOrder(varieties).map((variety: RecipeVariety, index) => (
                    <li key={`${variety.order}-${variety.name}-${index}`}>
                      <span className="fruit-variety-number">{String(index + 1).padStart(2, "0")}</span>
                      <div className="fruit-variety-copy">
                        <div className="fruit-variety-title">
                          <h3>{variety.name}</h3>
                          {variety.alias?.trim() && <span>{variety.alias}</span>}
                        </div>
                        {variety.note?.trim() && <p>{variety.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="recipe-section fruit-ways" aria-labelledby="fruit-ways-heading">
                <div className="recipe-section-heading">
                  <div><span>WAYS TO ENJOY</span><h2 id="fruit-ways-heading">不同吃法</h2></div>
                </div>
                <p className="recipe-section-intro">洗净、去皮或去核后，再挑一种今天喜欢的吃法。</p>
                <ol>
                  {byRecipeOrder(eatingWays).map((way: RecipeEatingWay, index) => (
                    <li key={`${way.order}-${way.title}-${index}`}>
                      <span className="fruit-way-number">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{way.title}</h3>
                        <p>{way.instruction}</p>
                        {way.tip?.trim() && <aside><b>小提示</b>{way.tip}</aside>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : hasStructuredRecipe ? (
            <div className="recipe-paper recipe-paper--structured">
              {equipment.length > 0 && (
                <section className="recipe-section equipment-section" aria-labelledby="equipment-heading">
                  <div className="recipe-section-heading">
                    <div><span>KITCHEN TOOLS</span><h2 id="equipment-heading">所需厨具</h2></div>
                    <strong className="servings-badge">{equipment.length} 项</strong>
                  </div>
                  <p className="recipe-section-intro">开火前先把锅具、餐具和调料碗摆好，做饭更顺手。</p>
                  <ul className="equipment-list">
                    {byRecipeOrder(equipment).map((item: RecipeEquipment, index) => (
                      <li key={`${item.order}-${item.name}-${index}`}>
                        <span className="equipment-number">{String(index + 1).padStart(2, "0")}</span>
                        <div className="equipment-copy">
                          <div className="equipment-title">
                            <strong>{item.name}</strong>
                            <span>{equipmentAmount(item)}</span>
                          </div>
                          <p>{item.purpose}</p>
                          {item.note.trim() && <aside>{item.note}</aside>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="recipe-section" aria-labelledby="ingredients-heading">
                <div className="recipe-section-heading">
                  <div><span>PREPARATION</span><h2 id="ingredients-heading">备菜清单</h2></div>
                  {recipe.servings?.trim() && <strong className="servings-badge">{recipe.servings}</strong>}
                </div>
                <p className="recipe-section-intro">准备好一项就勾一项，下厨会更从容。</p>
                <div className="ingredient-groups">
                  {groupRecipeIngredients(ingredients).map(([group, groupIngredients]) => (
                    <div className="ingredient-group" key={group}>
                      <h3>{group}</h3>
                      <ul>
                        {groupIngredients.map((ingredient, index) => (
                          <li key={`${ingredient.order}-${ingredient.name}-${index}`}>
                            <label>
                              <input type="checkbox" />
                              <span className="ingredient-check" aria-hidden="true" />
                              <span className="ingredient-copy">
                                <strong>{ingredient.name}</strong>
                                {ingredient.preparation?.trim() && <small>{ingredient.preparation}</small>}
                              </span>
                              {ingredientAmount(ingredient) && <span className="ingredient-amount">{ingredientAmount(ingredient)}</span>}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              <section className="recipe-section recipe-section--steps" aria-labelledby="steps-heading">
                <div className="recipe-section-heading">
                  <div><span>COOKING</span><h2 id="steps-heading">开始制作</h2></div>
                </div>
                <ol className="recipe-steps">
                  {byRecipeOrder(steps).map((step: RecipeStep, index) => (
                    <li key={`${step.order}-${index}`}>
                      <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                      <div className="step-copy">
                        <p>{step.instruction}</p>
                        {(step.heat?.trim() || step.duration?.trim()) && (
                          <div className="step-meta">
                            {step.heat?.trim() && <span><b>火候</b>{step.heat}</span>}
                            {step.duration?.trim() && <span><b>时间</b>{step.duration}</span>}
                          </div>
                        )}
                        {step.tip?.trim() && <aside><b>小提示</b><span>{step.tip}</span></aside>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : (
            /* 旧菜品未补齐结构化内容时继续展示原做法长图。 */
            <div className="recipe-paper">
              <div className="paper-heading"><span>RECIPE</span><h2>详细制作教程</h2><p>跟着图片一步一步来，就能端上桌啦</p></div>
              <RecipeImage className="detail-long-image" src={recipe.detailPath} alt={`${recipe.name}详细制作教程`} detail />
            </div>
          )}
          <div className="detail-action-space" />
          <div className="detail-fixed-action"><button className={`button button--wide ${selected ? "button--soft" : "button--primary"}`} type="button" onClick={onToggle}>{selected ? "✓ 已加入 · 点击移出" : "+ 加入今晚菜单"}</button></div>
        </>
      )}
    </section>
  );
}

type MineViewProps = {
  state: PersistedMenuState;
  recipeById: Map<string, EditableRecipe>;
  onPairing: () => void;
  onManage: () => void;
  onContentGuide: () => void;
  onGenerateAvatar: () => void;
  onReuse: (dishIds: string[]) => void;
  onDeleteHistory: (id: string) => void;
  onSendHistory: (id: string) => void;
  onReset: () => void;
};

function MineView({ state, recipeById, onPairing, onManage, onContentGuide, onGenerateAvatar, onReuse, onDeleteHistory, onSendHistory, onReset }: MineViewProps) {
  const avatar = state.avatarId ? getAvatarById(state.avatarId) : undefined;
  const unreadCount = state.mockPairing.inbox.filter((record) => !record.read).length;
  return (
    <section className="page-content mine-page" aria-label="我的">
      {/* 本机数据概览和管理入口 */}
      <div className="profile-card">
        <div className="profile-avatar-wrap">
          <div className="avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar ? <img src={avatar.path} alt="小猫宝宝当前头像" /> : <span aria-hidden="true">猫</span>}
          </div>
        </div>
        <div className="profile-copy"><span>小猫宝宝的专属菜单</span><h2>今天也要好好吃饭</h2><p>已收藏 {state.history.length} 顿晚餐 · 新增 {state.localRecipes.length} 道菜</p></div>
        <button className="profile-heart" type="button" onClick={onGenerateAvatar} aria-label="随机抽取头像">♡</button>
      </div>
      <button className={`pairing-entry pairing-entry--${state.mockPairing.status}`} type="button" onClick={onPairing}>
        <span className="pairing-entry__icon" aria-hidden="true">♡</span>
        <span>
          <small>我们的绑定 · 本地模拟</small>
          <strong>{state.mockPairing.status === "bound" ? `已与 ${state.mockPairing.partnerName} 绑定` : state.mockPairing.status === "invited" ? "邀请已生成，等待 TA" : "邀请 TA 一起吃饭"}</strong>
          <em>{state.mockPairing.status === "bound" ? `${unreadCount} 份未读晚餐` : "真实跨手机同步仅在微信小程序运行"}</em>
        </span>
        {unreadCount > 0 && <b>{unreadCount}</b>}
        <i aria-hidden="true">›</i>
      </button>
      <button className="manage-entry" type="button" onClick={onManage}>
        <span className="manage-icon" aria-hidden="true">⚙</span>
        <span><strong>浏览器草稿</strong><small>随手新增、编辑和预览少量菜品</small></span>
        <em>当前浏览器</em><b aria-hidden="true">›</b>
      </button>
      <button className="manage-entry content-library-entry" type="button" onClick={onContentGuide}>
        <span className="manage-icon" aria-hidden="true">▣</span>
        <span><strong>正式菜品库</strong><small>放图片、填清单、双击更新菜单</small></span>
        <em>长期维护</em><b aria-hidden="true">›</b>
      </button>

      {/* 历史菜单 */}
      <div className="section-heading history-heading"><div><span>DINNER MEMORIES</span><h2>晚餐回忆</h2></div><small>{state.history.length} 份</small></div>
      {state.history.length ? (
        <div className="history-list">
          {state.history.map((record) => {
            const names = record.dishIds.map((id) => recipeById.get(id)?.name).filter(Boolean);
            const recordedPlaces = record.diningPlaceSnapshots?.flatMap((snapshot) => snapshot.places.map(diningPlaceDetailText)) ?? [];
            return (
              <article className="history-card" key={record.id}>
                <div className="history-date"><strong>{new Date(record.createdAt).getDate() || "·"}</strong><span>{formatDateTime(record.createdAt)}</span></div>
                <div className="history-copy"><h3>{record.title}</h3><p>{names.length ? names.join("、") : "菜品记录已不存在"}</p>{recordedPlaces.length > 0 && <p className="history-place-summary">店铺 · {recordedPlaces.join("、")}</p>}<small>{record.dishIds.length} 道菜{recordedPlaces.length > 0 ? ` · ${recordedPlaces.length} 家自填店铺` : ""}</small></div>
                <div className="history-actions">
                  <button type="button" onClick={() => onReuse(record.dishIds)}>再吃一次</button>
                  {record.syncStatus !== "synced" && <button type="button" onClick={() => onSendHistory(record.id)}>发送给 TA</button>}
                  {record.syncStatus === "synced" && <small>已送达</small>}
                  <button type="button" aria-label={`删除${record.title}`} onClick={() => onDeleteHistory(record.id)}>×</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact-empty"><span aria-hidden="true">♡</span><h3>还没有晚餐回忆</h3><p>保存第一份菜单后，它会出现在这里</p></div>
      )}
      <button className="reset-button" type="button" onClick={onReset}>重置全部浏览器数据</button>
      <p className="local-note">绑定功能在这里仅作本地模拟，不会连接微信好友或上传网络</p>
    </section>
  );
}

type MockPairingViewProps = {
  pairing: MockPairingState;
  avatarId: string | null;
  selectedIds: string[];
  recipeById: ReadonlyMap<string, EditableRecipe>;
  customDiningPlaces: Readonly<Record<string, readonly CustomDiningPlace[]>>;
  onBack: () => void;
  onChange: (pairing: MockPairingState) => void;
  onMessage: (message: string) => void;
};

function MockPairingView({ pairing, avatarId, selectedIds, recipeById, customDiningPlaces, onBack, onChange, onMessage }: MockPairingViewProps) {
  const [nickname, setNickname] = useState(pairing.nickname);
  const selfAvatar = avatarId ? getAvatarById(avatarId) : undefined;
  const partnerAvatar = pairing.partnerAvatarId ? getAvatarById(pairing.partnerAvatarId) : undefined;

  function update(patch: Partial<MockPairingState>) {
    onChange({ ...pairing, ...patch });
  }

  function generateInvite() {
    const nextNickname = nickname.trim() || "怡宝";
    update({ nickname: nextNickname, status: "invited", inviteCreatedAt: new Date().toISOString() });
    onMessage("本地模拟邀请已生成");
  }

  function simulateAccept() {
    const avatar = pickRandomAvatar();
    update({
      nickname: nickname.trim() || "怡宝",
      status: "bound",
      partnerName: pairing.partnerName || "鸡毛大厨",
      partnerAvatarId: avatar.id,
      pairedAt: new Date().toISOString(),
      inviteCreatedAt: null,
    });
    onMessage("本地模拟：TA 已接受绑定");
  }

  function simulateIncoming() {
    const dishIds = selectedIds.length ? selectedIds : RECIPES.slice(0, 2).map((recipe) => recipe.id);
    const record = {
      id: `mock-incoming-${Date.now()}`,
      senderName: pairing.partnerName,
      title: `${pairing.partnerName}选的晚餐`,
      chefNote: "本地模拟消息：今晚一起好好吃饭呀。",
      dishIds,
      createdAt: new Date().toISOString(),
      loveQuote: "与你分享的每一顿，都值得认真期待。",
      diningPlaceSnapshots: diningPlaceSnapshotsForRecipes(dishIds, recipeById, customDiningPlaces),
      read: false,
    };
    update({ inbox: [record, ...pairing.inbox] });
    onMessage("本地模拟：收到 TA 的一份晚餐");
  }

  return (
    <section className="subpage pairing-page">
      <header className="subpage-header"><button className="back-button" type="button" onClick={onBack} aria-label="返回">‹</button><strong>我们的绑定</strong><span /></header>
      <div className="pairing-demo-banner"><b>本地模拟</b><span>这里用于确认界面与流程；真实绑定只在微信小程序云开发中生效。</span></div>

      <div className="pairing-profile-card">
        <div className="pairing-avatar">
          {selfAvatar ? <RecipeImage src={selfAvatar.path} alt="我的模拟头像" /> : <span>怡</span>}
        </div>
        <label><span>我的应用内昵称</span><input maxLength={16} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
      </div>

      {pairing.status === "unbound" && (
        <div className="pairing-action-card">
          <span className="pairing-big-heart" aria-hidden="true">♡</span>
          <h1>邀请 TA 一起吃饭</h1>
          <p>微信正式版会生成单次、24小时有效的私密邀请卡片。</p>
          <button className="button button--primary button--wide" type="button" onClick={generateInvite}>生成绑定邀请</button>
        </div>
      )}

      {pairing.status === "invited" && (
        <div className="pairing-action-card pairing-action-card--invite">
          <small>邀请已准备好 · 24 小时内有效</small>
          <h1>{nickname.trim() || "怡宝"} 邀请你一起吃晚餐</h1>
          <p>真实微信版要由对方打开分享卡并点击接受。这里可直接模拟对方接受。</p>
          <button className="button button--primary button--wide" type="button" onClick={simulateAccept}>模拟 TA 接受绑定</button>
          <button className="button button--ghost button--wide" type="button" onClick={() => update({ status: "unbound", inviteCreatedAt: null })}>取消邀请</button>
        </div>
      )}

      {pairing.status === "bound" && (
        <>
          <div className="paired-card">
            <div className="pairing-avatar pairing-avatar--partner">
              {partnerAvatar ? <RecipeImage src={partnerAvatar.path} alt="TA的模拟头像" /> : <span>TA</span>}
            </div>
            <div><small>已绑定 · 本地模拟</small><h1>{pairing.partnerName}</h1><p>{pairing.pairedAt ? `从 ${formatDateTime(pairing.pairedAt)} 开始一起吃饭` : "现在开始一起吃饭"}</p></div>
            <b>{pairing.inbox.filter((record) => !record.read).length} 未读</b>
          </div>
          <button className="button button--soft button--wide" type="button" onClick={simulateIncoming}>模拟 TA 发来一份晚餐</button>
          <div className="mock-inbox">
            <div className="section-heading"><div><span>COUPLE DINNER</span><h2>TA 发来的晚餐</h2></div><small>{pairing.inbox.length} 份</small></div>
            {pairing.inbox.length ? pairing.inbox.map((record) => {
              const receivedPlaces = record.diningPlaceSnapshots?.flatMap((snapshot) => snapshot.places.map(diningPlaceDetailText)) ?? [];
              return (
                <button key={record.id} type="button" className={`mock-inbox-card ${record.read ? "" : "is-unread"}`} onClick={() => update({ inbox: pairing.inbox.map((item) => item.id === record.id ? { ...item, read: true } : item) })}>
                  <span>{record.read ? "已读" : "新"}</span><div><strong>{record.title}</strong><small>{record.chefNote}</small>{receivedPlaces.length > 0 && <small className="mock-inbox-places">店铺 · {receivedPlaces.join("、")}</small>}</div><em>{record.dishIds.length} 道</em>
                </button>
              );
            }) : <div className="empty-state compact-empty"><span aria-hidden="true">♡</span><h3>还没有收到晚餐</h3><p>点击上方按钮可预览未读状态</p></div>}
          </div>
          <button className="pairing-unbind" type="button" onClick={() => {
            if (!window.confirm("确定解除本地模拟绑定吗？")) return;
            update({ status: "unbound", partnerAvatarId: null, pairedAt: null, inbox: [] });
          }}>解除模拟绑定</button>
        </>
      )}
    </section>
  );
}

function ContentGuideView({ onBack }: { onBack: () => void }) {
  const contentRoot = "X:\\Codex\\project_2\\yibao-menu-content";
  return (
    <section className="subpage content-guide-page">
      <header className="subpage-header"><button className="back-button" type="button" onClick={onBack} aria-label="返回">‹</button><strong>正式菜品库</strong><span /></header>
      <div className="content-guide-hero">
        <span>无需再改代码</span>
        <h1>放好图片，双击就能更新</h1>
        <p>这里是长期维护入口。更新后的菜品会成为项目正式内容，也能继续作为微信小程序的数据源。</p>
      </div>
      <div className="content-guide-body">
        <div className="path-card"><small>菜品库位置</small><code>{contentRoot}</code></div>
        <ol className="update-steps">
          <li><b>1</b><div><strong>放封面图</strong><p>按家常菜、减脂餐、狗狗大餐或水果，放进对应系列的“covers”文件夹。</p></div></li>
          <li><b>2</b><div><strong>打开正式 Excel</strong><p>普通菜填写“菜品、用料、步骤”；水果维护“水果吃法”；狗狗大餐把餐厅填进“好吃的店铺”，都不需要详情长图。</p></div></li>
          <li><b>3</b><div><strong>保存并关闭工作簿</strong><p>编辑“菜品内容库.xlsx”；recipes.csv 是自动生成的兼容快照，不要手工修改。</p></div></li>
          <li><b>4</b><div><strong>双击“更新菜单.cmd”</strong><p>更新器会自动校验、生成稳定 ID、压缩图片并刷新正式菜单。</p></div></li>
        </ol>
        <div className="content-guide-note"><strong>维护边界</strong><p>浏览器草稿只适合临时试普通菜；水果与狗狗大餐包含专属字段，请只在正式 Excel 中维护。</p></div>
        <p className="content-guide-footnote">完整说明已经放在菜品库的“使用说明.md”中。</p>
      </div>
    </section>
  );
}

type ManageViewProps = {
  recipes: EditableRecipe[];
  overriddenIds: Set<string>;
  onBack: () => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onToggleStatus: (recipe: EditableRecipe) => void;
  onRestore: (id: string) => void;
  onDelete: (recipe: EditableRecipe) => void;
};

function ManageView({ recipes, overriddenIds, onBack, onAdd, onEdit, onToggleStatus, onRestore, onDelete }: ManageViewProps) {
  const [search, setSearch] = useState("");
  const list = recipes.filter((item) => item.name.includes(search.trim()));
  return (
    <section className="subpage manage-page">
      <header className="subpage-header"><button className="back-button" type="button" onClick={onBack} aria-label="返回">‹</button><strong>菜品管理</strong><button className="header-text-button" type="button" onClick={onAdd}>＋ 新增</button></header>
      <div className="manage-intro"><span>浏览器草稿</span><h1>快速试菜与调整</h1><p>适合临时预览普通菜，内容只保存在当前浏览器；水果和狗狗大餐请在正式 Excel 菜品库维护。</p></div>
      <label className="search-box manage-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索 ${recipes.length} 道菜`} aria-label="搜索管理菜品" /></label>
      <div className="manage-count"><strong>全部菜品</strong><span>{list.length} 道</span></div>
      <div className="manage-list">
        {list.map((recipe) => (
          <article className={`manage-card ${recipe.status === "hidden" ? "is-hidden" : ""}`} key={recipe.id}>
            <RecipeImage className="manage-cover" src={recipe.coverPath} alt={recipe.name} />
            <div className="manage-copy"><h3>{recipe.name}</h3><p>{seriesLabel(recipe.series)} · {recipe.tags.map(tagLabel).slice(0, 2).join(" / ")}</p><div><span className={recipe.source === "local" ? "source-local" : ""}>{recipe.source === "local" ? "浏览器新增" : "正式菜品"}</span>{overriddenIds.has(recipe.id) && <span>浏览器已修改</span>}{recipe.status === "hidden" && <span className="status-hidden">已下架</span>}</div></div>
            <div className="manage-actions">{recipe.source === "seed" && (recipe.series === "fruit" || recipe.series === "dog") ? <button type="button" disabled title="请在菜品内容库.xlsx维护">Excel维护</button> : <><button type="button" onClick={() => onEdit(recipe.id)}>编辑</button><button type="button" onClick={() => onToggleStatus(recipe)}>{recipe.status === "hidden" ? "上架" : "下架"}</button>{recipe.source === "seed" && overriddenIds.has(recipe.id) && <button type="button" onClick={() => onRestore(recipe.id)}>恢复</button>}{recipe.source === "local" && <button type="button" className="danger-text" onClick={() => onDelete(recipe)}>删除</button>}</>}</div>
          </article>
        ))}
      </div>
      {!list.length && <div className="empty-state compact-empty"><span aria-hidden="true">⌕</span><h3>没找到这道菜</h3><p>换个关键词试试</p></div>}
    </section>
  );
}

type RecipeEditorProps = {
  recipe?: EditableRecipe;
  onBack: () => void;
  onSave: (recipe: EditableRecipe) => void;
  onMessage: (message: string) => void;
};

function RecipeEditor({ recipe, onBack, onSave, onMessage }: RecipeEditorProps) {
  const isNew = !recipe;
  const [name, setName] = useState(recipe?.name ?? "");
  const [series, setSeries] = useState(String(recipe?.series ?? "home"));
  const [tags, setTags] = useState<string[]>(recipe ? [...recipe.tags] : []);
  const [coverPath, setCoverPath] = useState(recipe?.coverPath ?? "");
  const [detailPath, setDetailPath] = useState(recipe?.detailPath ?? "");
  const [sortOrder, setSortOrder] = useState(Number(recipe?.sortOrder ?? 999));
  const [status, setStatus] = useState(String(recipe?.status ?? "published"));

  async function loadImage(file: File | undefined, target: "cover" | "detail") {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onMessage("请选择图片文件");
      return;
    }
    if (file.size > 4 * 1024 * 1024) onMessage("图片较大，建议压缩后再长期保存");
    try {
      const value = await fileToDataUrl(file);
      if (target === "cover") setCoverPath(value); else setDetailPath(value);
    } catch {
      onMessage("图片读取失败，请重新选择");
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      onMessage("请先填写菜名");
      return;
    }
    if (!coverPath || !detailPath) {
      onMessage("请补充封面图和做法图");
      return;
    }
    const now = new Date().toISOString();
    const value = {
      ...(recipe ?? {}),
      id: recipe?.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      series,
      tags,
      coverPath,
      detailPath,
      sortOrder,
      status,
      source: recipe?.source ?? "local",
      createdAt: recipe?.createdAt ?? now,
      updatedAt: now,
    } as EditableRecipe;
    onSave(value);
  }

  return (
    <section className="subpage editor-page">
      <header className="subpage-header"><button className="back-button" type="button" onClick={onBack} aria-label="返回">‹</button><strong>{isNew ? "新增菜品" : "编辑菜品"}</strong><span /></header>
      <form className="editor-form" onSubmit={submit}>
        <div className="editor-note"><span aria-hidden="true">♡</span><p><strong>{recipe?.source === "seed" ? "正在创建浏览器覆盖" : "浏览器草稿"}</strong><br />仅供普通菜临时预览；水果与狗狗大餐请在正式 Excel 中维护</p></div>
        <label className="field"><span>菜名 <em>*</em></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：番茄炒蛋" /></label>
        <fieldset className="field"><legend>系列 <em>*</em></legend><div className="choice-row">{SERIES_OPTIONS.filter((item) => item.id !== "fruit" && item.id !== "dog").map((item) => <label key={item.id}><input type="radio" name="series" value={item.id} checked={series === item.id} onChange={() => setSeries(item.id)} /><span>{item.emoji} {item.label}</span></label>)}</div><p className="image-tip">水果与狗狗大餐有专属资料表，请到“菜品内容库.xlsx”维护。</p></fieldset>
        <fieldset className="field"><legend>标签</legend><div className="tag-choices">{CATEGORY_OPTIONS.filter((item) => item.id !== "all").map((item) => <label key={item.id}><input type="checkbox" checked={tags.includes(item.id)} onChange={() => setTags((previous) => previous.includes(item.id) ? previous.filter((tag) => tag !== item.id) : [...previous, item.id])} /><span>{item.label}</span></label>)}</div></fieldset>
        <div className="image-fields">
          <ImagePicker label="封面图" value={coverPath} detail={false} onPick={(file) => loadImage(file, "cover")} />
          <ImagePicker label="做法长图" value={detailPath} detail onPick={(file) => loadImage(file, "detail")} />
        </div>
        <p className="image-tip">图片不会上传网络。浏览器容量有限，大图保存失败时刷新会丢失；正式菜品请放入项目菜品库。</p>
        <div className="two-fields"><label className="field"><span>显示顺序</span><input type="number" min="0" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} /></label><label className="field"><span>状态</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="published">上架显示</option><option value="hidden">暂时下架</option></select></label></div>
        <button className="button button--primary button--wide editor-submit" type="submit">保存到此浏览器</button>
      </form>
    </section>
  );
}

function ImagePicker({ label, value, detail, onPick }: { label: string; value: string; detail: boolean; onPick: (file?: File) => void }) {
  return (
    <label className={`image-picker ${detail ? "image-picker--detail" : ""}`}>
      <span>{label} <em>*</em></span>
      <div>{value ? <RecipeImage src={value} alt={`${label}预览`} /> : <span className="upload-placeholder"><b>＋</b><small>选择图片</small></span>}</div>
      <input type="file" accept="image/*" onChange={(event) => onPick(event.target.files?.[0])} />
    </label>
  );
}
