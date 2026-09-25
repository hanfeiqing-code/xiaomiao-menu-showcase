import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { AVATARS, getAvatarById, pickRandomAvatar } from "../app/data/avatars.js";
import { calculateRecipeMenuCounts, sortRecipesByMenuCount } from "../app/lib/recipe-popularity.js";
import {
  DINING_GROUP_IDS,
  DINING_GROUP_OPTIONS,
  matchesDiningGroup,
} from "../app/lib/dining-groups.js";
import {
  FRUIT_MONTH_OPTIONS,
  fruitMonthFromCategory,
  fruitMonthsFromSeason,
  matchesFruitMonthCategory,
} from "../app/lib/fruit-months.js";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the XiaoMao menu shell from the latest WeChat brand", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /小猫宝宝小菜单/);
  assert.doesNotMatch(html, /怡宝小菜单/);
  assert.match(html, /今晚吃什么/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the in-app tab bar outside the scrollable phone content", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../app/components/MenuApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /<div className="phone-content">/);
  const contentStart = source.indexOf('<div className="phone-content">');
  const navStart = source.indexOf('<nav className="bottom-nav"');
  assert.ok(contentStart >= 0 && navStart > contentStart, "the tab bar must follow the phone content wrapper");
  assert.ok(source.lastIndexOf("</div>", navStart) > contentStart, "the phone content wrapper must close before the tab bar");
  assert.match(styles, /\.phone-shell\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.phone-content\s*\{[^}]*flex:\s*1 1 auto;/s);
  assert.match(styles, /\.phone-content\s*\{[^}]*min-height:\s*0;/s);
  assert.match(styles, /\.phone-content\s*\{[^}]*overflow-y:\s*auto;/s);
  assert.doesNotMatch(styles, /\.bottom-nav\s*\{[^}]*position:\s*absolute;/s);
});

test("keeps the selection CTA inside the phone shell", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../app/components/MenuApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.phone-shell\s*\{[^}]*position:\s*relative;/s);
  assert.match(styles, /\.selection-float\s*\{[^}]*position:\s*absolute;/s);
  assert.doesNotMatch(styles, /\.selection-float\s*\{[^}]*position:\s*fixed;/s);
  assert.match(styles, /\.choose-page\s*\{[^}]*padding-bottom:\s*calc\(var\(--nav-height\) \+ 88px/s);
  const phoneContentClose = source.indexOf("\n        </div>\n\n        {/* 选菜后的快捷入口");
  const selectionStart = source.indexOf('className="selection-float"');
  assert.ok(phoneContentClose >= 0 && selectionStart > phoneContentClose, "the selection CTA must sit outside the scrollable phone content");
});

test("preserves the portrait framing of the demo video", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../app/components/ShowcaseGuide.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /<video[^>]*controls[^>]*playsInline/);
  assert.match(styles, /\.showcase-video-frame\s*\{[^}]*aspect-ratio:\s*9\s*\/\s*16;/s);
  assert.match(styles, /\.showcase-video-frame\s*\{[^}]*max-height:/s);
  assert.match(styles, /\.showcase-video-frame video\s*\{[^}]*object-fit:\s*contain;/s);
  assert.doesNotMatch(styles, /\.showcase-video-frame\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9;/s);
});

test("gives each showcase screen enough room for its explanation", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../app/components/ShowcaseGuide.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.showcase-gallery\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(styles, /\.showcase-shot\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:/s);
  assert.match(styles, /\.showcase-shot__image\s*\{[^}]*aspect-ratio:\s*0\.46;/s);
  assert.match(styles, /\.showcase-shot__image img\s*\{[^}]*object-fit:\s*contain;/s);
  assert.match(source, /showcase-shot--focus/);
  assert.match(styles, /\.showcase-shot--focus \.showcase-shot__image img\s*\{[^}]*transform:\s*scale\(1\.11\)/s);
});

test("registers every generated recipe and its required images", async () => {
  const [generatedJson, source, covers, details, dogStickers, imageComponent, styles, options, menuState, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/data/recipes.generated.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/recipes.ts", import.meta.url), "utf8"),
    readdir(new URL("../public/recipes/covers/", import.meta.url)),
    readdir(new URL("../public/recipes/details/", import.meta.url)),
    readdir(new URL("../public/decorations/dogs/", import.meta.url)),
    readFile(new URL("../app/components/MenuApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/recipe-options.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/menu-state.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  const generated = JSON.parse(generatedJson);
  assert.ok(generated.length >= 48, "the original 48 recipes must remain available");
  assert.equal(new Set(generated.map((recipe) => recipe.id)).size, generated.length);
  assert.equal(new Set(generated.map((recipe) => `${recipe.series}:${recipe.name}`)).size, generated.length);
  const fruits = generated.filter((recipe) => recipe.series === "fruit");
  const diningCategories = generated.filter((recipe) => recipe.series === "dog");
  const diningGroupIds = new Set(DINING_GROUP_IDS);
  assert.ok(fruits.length >= 6, "the fruit series must contain the requested common fruits");
  for (const name of ["苹果", "香蕉", "橙子", "榴莲", "葡萄", "西瓜"]) {
    assert.ok(fruits.some((recipe) => recipe.name === name), `missing requested fruit: ${name}`);
  }
  assert.deepEqual(
    fruits.map((recipe) => recipe.sortOrder),
    fruits.map((recipe) => recipe.sortOrder).slice().sort((left, right) => left - right),
    "fruit entries must remain in seasonal display order",
  );
  assert.ok(diningCategories.length >= 15, "the dog-dining series must contain the requested restaurant categories");
  for (const name of ["火锅", "川菜", "日本料理", "寿司", "韩国料理", "漂亮饭", "甜品店", "面包店", "牛排", "烧烤", "大排档", "面食", "麻辣烫·冒菜", "夜市小吃", "酒吧·小酒馆"]) {
    assert.ok(diningCategories.some((recipe) => recipe.name === name), `missing requested dining category: ${name}`);
  }
  for (const name of ["煎牛排", "煎鸡胸肉", "煎蛋", "烤红薯", "蒸玉米", "蒸南瓜"]) {
    const recipe = generated.find((item) => item.series === "fit" && item.name === name);
    assert.ok(recipe, `missing requested reduced-fat recipe: ${name}`);
    assert.equal(recipe.detailMode, "structured", `reduced-fat recipe must use structured detail: ${name}`);
  }
  for (const recipe of generated) {
    assert.ok(covers.includes(`${recipe.id}.jpg`), `missing cover for ${recipe.name}`);
    if (recipe.series === "home" || recipe.series === "fit") {
      assert.ok(recipe.equipment?.length, `missing equipment for ${recipe.name}`);
      assert.equal(
        new Set(recipe.equipment.map((item) => item.order)).size,
        recipe.equipment.length,
        `duplicate equipment order for ${recipe.name}`,
      );
      for (const item of recipe.equipment) {
        assert.ok(Number.isInteger(item.order) && item.order > 0, `invalid equipment order for ${recipe.name}`);
        assert.ok(item.name?.trim(), `missing equipment name for ${recipe.name}`);
        assert.ok(typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0, `invalid equipment quantity for ${recipe.name}/${item.name}`);
        assert.ok(item.unit?.trim(), `missing equipment unit for ${recipe.name}/${item.name}`);
        assert.ok(item.purpose?.trim(), `missing equipment purpose for ${recipe.name}/${item.name}`);
        assert.equal(typeof item.note, "string", `invalid equipment note for ${recipe.name}/${item.name}`);
      }
    } else {
      assert.deepEqual(recipe.equipment ?? [], [], `${recipe.series} recipe must not use cooking equipment: ${recipe.name}`);
    }
    if (recipe.detailMode === "structured") {
      assert.ok(recipe.servings?.trim(), `missing servings for ${recipe.name}`);
      assert.ok(recipe.ingredients?.length, `missing ingredients for ${recipe.name}`);
      assert.ok(recipe.steps?.length, `missing steps for ${recipe.name}`);
      assert.equal(recipe.seasonMonths ?? "", "", `non-fruit recipe contains season months: ${recipe.name}`);
      assert.deepEqual(recipe.varieties ?? [], [], `non-fruit recipe contains varieties: ${recipe.name}`);
      assert.deepEqual(recipe.eatingWays ?? [], [], `non-fruit recipe contains eating ways: ${recipe.name}`);
      assert.deepEqual(recipe.places ?? [], [], `cooking recipe contains dining places: ${recipe.name}`);
    } else if (recipe.detailMode === "fruit") {
      assert.equal(recipe.series, "fruit", `fruit detail uses the wrong series: ${recipe.name}`);
      assert.equal(recipe.detailPath, "", `fruit must not use a long detail image: ${recipe.name}`);
      assert.equal(recipe.servings, "", `fruit must not use servings: ${recipe.name}`);
      assert.deepEqual(recipe.ingredients, [], `fruit must not use ingredients: ${recipe.name}`);
      assert.deepEqual(recipe.steps, [], `fruit must not use cooking steps: ${recipe.name}`);
      assert.ok(recipe.seasonMonths?.trim(), `missing season months for ${recipe.name}`);
      assert.ok(recipe.seasonNote?.trim(), `missing season note for ${recipe.name}`);
      assert.ok(recipe.varieties?.length, `missing varieties for ${recipe.name}`);
      assert.equal(
        new Set(recipe.varieties.map((variety) => variety.order)).size,
        recipe.varieties.length,
        `duplicate variety order for ${recipe.name}`,
      );
      for (const variety of recipe.varieties) {
        assert.ok(Number.isInteger(variety.order) && variety.order > 0, `invalid variety order for ${recipe.name}`);
        assert.ok(variety.name?.trim(), `missing variety name for ${recipe.name}`);
        assert.equal(typeof variety.alias, "string", `invalid variety alias for ${recipe.name}`);
        assert.ok(variety.note?.trim(), `missing variety note for ${recipe.name}`);
        assert.match(variety.sourceUrl, /^https:\/\//, `invalid variety source URL for ${recipe.name}/${variety.name}`);
        assert.ok(variety.sourceTitle?.trim(), `missing variety source title for ${recipe.name}/${variety.name}`);
      }
      assert.ok(recipe.eatingWays?.length, `missing eating ways for ${recipe.name}`);
      assert.equal(
        new Set(recipe.eatingWays.map((way) => way.order)).size,
        recipe.eatingWays.length,
        `duplicate eating-way order for ${recipe.name}`,
      );
      for (const way of recipe.eatingWays) {
        assert.ok(Number.isInteger(way.order) && way.order > 0, `invalid eating-way order for ${recipe.name}`);
        assert.ok(way.title?.trim(), `missing eating-way title for ${recipe.name}`);
        assert.ok(way.instruction?.trim(), `missing eating-way instruction for ${recipe.name}`);
        assert.equal(typeof way.tip, "string", `invalid eating-way tip for ${recipe.name}`);
      }
      assert.deepEqual(recipe.places ?? [], [], `fruit contains dining places: ${recipe.name}`);
    } else if (recipe.detailMode === "dining") {
      assert.equal(recipe.series, "dog", `dining detail uses the wrong series: ${recipe.name}`);
      assert.equal(recipe.detailPath, "", `dining category must not use a long detail image: ${recipe.name}`);
      assert.equal(recipe.servings, "", `dining category must not use servings: ${recipe.name}`);
      assert.deepEqual(recipe.ingredients, [], `dining category must not use ingredients: ${recipe.name}`);
      assert.deepEqual(recipe.steps, [], `dining category must not use cooking steps: ${recipe.name}`);
      assert.equal(recipe.seasonMonths ?? "", "", `dining category contains season months: ${recipe.name}`);
      assert.deepEqual(recipe.varieties ?? [], [], `dining category contains varieties: ${recipe.name}`);
      assert.deepEqual(recipe.eatingWays ?? [], [], `dining category contains eating ways: ${recipe.name}`);
      assert.ok(diningGroupIds.has(recipe.diningGroup), `dining category needs a valid diningGroup: ${recipe.name}`);
      assert.ok(Array.isArray(recipe.places), `dining category needs a places array: ${recipe.name}`);
      assert.equal(new Set(recipe.places.map((place) => place.order)).size, recipe.places.length, `duplicate dining-place order for ${recipe.name}`);
      for (const place of recipe.places) {
        assert.ok(Number.isInteger(place.order) && place.order > 0, `invalid dining-place order for ${recipe.name}`);
        assert.ok(place.name?.trim(), `missing dining-place name for ${recipe.name}`);
        assert.equal(typeof place.location, "string", `invalid dining-place location for ${recipe.name}`);
        assert.equal(typeof place.note, "string", `invalid dining-place note for ${recipe.name}`);
      }
    } else if (recipe.detailMode === "legacy") {
      assert.ok(recipe.detailPath?.trim(), `missing detail path for ${recipe.name}`);
      assert.ok(details.includes(`${recipe.id}.jpg`), `missing detail image for ${recipe.name}`);
      assert.equal(recipe.seasonMonths ?? "", "", `legacy recipe contains season months: ${recipe.name}`);
      assert.deepEqual(recipe.varieties ?? [], [], `legacy recipe contains varieties: ${recipe.name}`);
      assert.deepEqual(recipe.eatingWays ?? [], [], `legacy recipe contains eating ways: ${recipe.name}`);
      assert.deepEqual(recipe.places ?? [], [], `legacy recipe contains dining places: ${recipe.name}`);
    } else {
      assert.fail(`invalid detail mode for ${recipe.name}: ${recipe.detailMode}`);
    }
  }
  assert.match(source, /RECIPES: Recipe\[\] = GENERATED_RECIPES/);
  assert.match(source, /interface RecipeEquipment/);
  assert.match(source, /equipment\?: RecipeEquipment\[\]/);
  assert.ok(dogStickers.includes("dog-side-white-v2.png"));
  assert.ok(dogStickers.includes("dog-side-yellow-v2.png"));
  assert.match(imageComponent, /CARD_DOG_SEQUENCE/);
  assert.match(imageComponent, /index % CARD_DOG_SEQUENCE\.length/);
  assert.match(imageComponent, /card-dog--left/);
  assert.match(imageComponent, /card-dog--right/);
  assert.match(imageComponent, /dog-side-yellow-v2\.png", className: "card-dog--left/);
  assert.match(imageComponent, /dog-side-white-v2\.png", className: "card-dog--right/);
  assert.match(imageComponent, /外出大餐还在准备中/);
  assert.match(imageComponent, /水果篮还空着/);
  assert.match(imageComponent, /FRUIT_MONTH_OPTIONS/);
  assert.match(imageComponent, /DINING_GROUP_OPTIONS/);
  assert.match(imageComponent, /水果月份/);
  assert.match(imageComponent, /外出大餐分类/);
  assert.match(imageComponent, /recipe\.series !== "fruit" && <small className="dish-tags">/);
  assert.match(imageComponent, /dish-copy--fruit/);
  assert.match(imageComponent, /detailMode === "fruit"/);
  assert.match(imageComponent, /detailMode === "dining"/);
  assert.match(imageComponent, /id="equipment-heading">所需厨具</);
  assert.match(imageComponent, /equipmentAmount\(item\)/);
  assert.match(imageComponent, /item\.purpose/);
  assert.match(imageComponent, /item\.note\.trim\(\)/);
  assert.ok(imageComponent.indexOf("所需厨具") < imageComponent.indexOf("备菜清单"));
  assert.ok(imageComponent.indexOf("备菜清单") < imageComponent.indexOf("开始制作"));
  assert.match(imageComponent, /水果详情/);
  assert.match(imageComponent, /上架季节/);
  assert.match(imageComponent, /id="fruit-varieties-heading">品种</);
  assert.match(imageComponent, /不同吃法/);
  assert.ok(imageComponent.indexOf("上架季节") < imageComponent.indexOf('id="fruit-varieties-heading">品种'));
  assert.ok(imageComponent.indexOf('id="fruit-varieties-heading">品种') < imageComponent.indexOf("不同吃法"));
  assert.match(imageComponent, /好吃的店铺/);
  assert.match(imageComponent, /这里还没有收藏的店/);
  assert.match(imageComponent, /手动添加店铺/);
  assert.match(imageComponent, /店铺名称（必填）/);
  assert.match(imageComponent, /地点 \/ 分店（选填）/);
  assert.match(imageComponent, /推荐菜或备注（选填）/);
  assert.match(imageComponent, /修改我的店铺/);
  assert.match(imageComponent, /dining-place-edit/);
  assert.match(imageComponent, /dining-place-save/);
  assert.match(imageComponent, /disabled=\{!placeDraft\.name\.trim\(\)\}/);
  assert.match(imageComponent, /我的记录/);
  assert.match(imageComponent, /diningPlaceSnapshotsForRecipes/);
  assert.match(imageComponent, /diningPlaceDetailText/);
  assert.match(imageComponent, /history-place-summary/);
  assert.match(imageComponent, /mock-inbox-places/);
  assert.match(imageComponent, /上市月份/);
  assert.match(styles, /fruit-season-card/);
  assert.match(styles, /\.equipment-list/);
  assert.match(styles, /\.equipment-title/);
  assert.match(styles, /\.equipment-copy > aside/);
  assert.match(styles, /\.dish-copy--fruit\s*\{[^}]*translateY\(-3px\)/);
  assert.match(styles, /\.fruit-varieties > ol > li/);
  assert.match(styles, /\.fruit-ways > ol > li/);
  assert.match(styles, /\.dining-places > ol > li/);
  assert.match(styles, /\.dining-place-add-trigger/);
  assert.match(styles, /\.dining-place-add-trigger\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;/);
  assert.match(imageComponent, /dining-place-heading-actions[\s\S]*servings-badge[\s\S]*dining-place-add-trigger/);
  assert.match(imageComponent, /点击右上角的＋/);
  assert.match(styles, /\.dining-place-save/);
  assert.match(styles, /background:\s*var\(--green\)/);
  assert.match(styles, /\.dining-place-edit/);
  assert.match(styles, /\.dining-place-delete/);
  assert.doesNotMatch(imageComponent, /catalog-layout--single/);
  assert.match(styles, /\.category-rail--months/);
  assert.match(styles, /\.category-rail--dining/);
  assert.match(menuState, /customDiningPlaces:\s*Record<string, CustomDiningPlace\[\]>/);
  assert.match(menuState, /yibao-menu-preview:v3/);
  assert.match(menuState, /yibao-menu-preview:v2/);
  assert.match(menuState, /yibao-menu-preview:v1/);
  assert.match(menuState, /normalizeCustomDiningPlaces/);
  assert.match(menuState, /normalizeDinnerHistory/);
  assert.match(menuState, /normalizeMockInbox/);
  assert.match(menuState, /location:\s*typeof candidate\.location/);
  assert.match(menuState, /note:\s*typeof candidate\.note/);
  assert.match(menuState, /places\.map\(\(\{ id, name, location, note \}\)/);
  assert.match(menuState, /diningPlaceSnapshotsForRecipes/);
  assert.match(menuState, /matchesFruitMonthCategory/);
  assert.match(menuState, /filter\.series === "fruit"/);
  assert.match(menuState, /filter\.series === "dog"/);
  assert.match(menuState, /matchesDiningGroup\(recipe\.diningGroup, filter\.category\)/);
  assert.match(options, /id:\s*"dog"/);
  assert.match(options, /id:\s*"fruit"/);
  assert.match(styles, /grid-template-columns:\s*repeat\(4,/);
  assert.doesNotMatch(imageComponent, /dog-top-white|dog-top-yellow/);
  assert.match(page, /<MenuApp \/>/);
  assert.match(layout, /小猫宝宝小菜单｜今晚吃什么/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("maps dog-dining groups and keeps legacy rows only in the all view", () => {
  assert.deepEqual(
    DINING_GROUP_OPTIONS.map(({ id, label }) => [id, label]),
    [
      ["all", "全部"],
      ["hot", "热辣"],
      ["chinese", "中餐"],
      ["international", "异国"],
      ["smoke", "烟火"],
      ["date", "约会"],
      ["sweet", "甜甜"],
    ],
  );
  assert.equal(matchesDiningGroup("hot", "all"), true);
  assert.equal(matchesDiningGroup(undefined, "all"), true);
  assert.equal(matchesDiningGroup("hot", "hot"), true);
  assert.equal(matchesDiningGroup("hot", "sweet"), false);
  assert.equal(matchesDiningGroup(undefined, "hot"), false);
  assert.equal(matchesDiningGroup("invalid", "hot"), false);
});

test("maps the Magic draw into eight equal avatar intervals", async () => {
  const avatarFiles = await readdir(new URL("../public/avatars/", import.meta.url));
  assert.equal(AVATARS.length, 8);
  assert.equal(new Set(AVATARS.map((avatar) => avatar.id)).size, 8);
  assert.deepEqual(
    AVATARS.map((avatar, index) => pickRandomAvatar(() => (index + 0.5) / 8).id),
    AVATARS.map((avatar) => avatar.id),
  );
  for (const avatar of AVATARS) {
    assert.ok(avatarFiles.includes(avatar.path.split("/").at(-1)), `missing ${avatar.path}`);
    assert.equal(getAvatarById(avatar.id), avatar);
  }
  assert.equal(pickRandomAvatar(() => 0).id, "avatar-01");
  assert.equal(pickRandomAvatar(() => 0.999999).id, "avatar-08");
});

test("derives recipe menu counts from history and sorts without mutating the base order", () => {
  const history = [
    { id: "menu-1", dishIds: ["dish-a", "dish-a", "dish-b"] },
    { id: "menu-2", dishIds: ["dish-b"] },
    { id: "menu-3", dishIds: ["dish-c", 42, null] },
  ];
  const recipes = [{ id: "dish-a" }, { id: "dish-b" }, { id: "dish-c" }, { id: "dish-d" }];
  const counts = calculateRecipeMenuCounts(history);

  assert.equal(counts.get("dish-a"), 1, "one saved menu counts once even with a duplicate id");
  assert.equal(counts.get("dish-b"), 2);
  assert.equal(counts.get("dish-c"), 1);
  assert.equal(counts.get("dish-d") ?? 0, 0);
  assert.deepEqual(sortRecipesByMenuCount(recipes, counts).map((recipe) => recipe.id), ["dish-b", "dish-a", "dish-c", "dish-d"]);
  assert.deepEqual(recipes.map((recipe) => recipe.id), ["dish-a", "dish-b", "dish-c", "dish-d"]);

  const afterDeletingMenu2 = calculateRecipeMenuCounts(history.filter((record) => record.id !== "menu-2"));
  assert.deepEqual(sortRecipesByMenuCount(recipes, afterDeletingMenu2).map((recipe) => recipe.id), ["dish-a", "dish-b", "dish-c", "dish-d"]);
});

test("maps fruit season labels to the month rail, including year-round and cross-year ranges", () => {
  assert.equal(FRUIT_MONTH_OPTIONS.length, 13);
  assert.deepEqual(FRUIT_MONTH_OPTIONS.map((item) => item.label), [
    "全部", "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ]);
  assert.equal(fruitMonthFromCategory("month-1"), 1);
  assert.equal(fruitMonthFromCategory("month-12"), 12);
  assert.equal(fruitMonthFromCategory("month-13"), null);
  assert.deepEqual(fruitMonthsFromSeason("3-5月"), [3, 4, 5]);
  assert.deepEqual(fruitMonthsFromSeason("11月-次年2月"), [1, 2, 11, 12]);
  assert.deepEqual(fruitMonthsFromSeason("10月—次年3月"), [1, 2, 3, 10, 11, 12]);
  assert.deepEqual(fruitMonthsFromSeason("全年"), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(matchesFruitMonthCategory("全年", "month-7"), true);
  assert.equal(matchesFruitMonthCategory("3-5月", "month-4"), true);
  assert.equal(matchesFruitMonthCategory("3-5月", "month-8"), false);
  assert.equal(matchesFruitMonthCategory("11月-次年2月", "month-1"), true);
  assert.equal(matchesFruitMonthCategory("11月-次年2月", "month-8"), false);
});
