"use client";

import { useEffect, useState } from "react";

const DEMO_STEPS = [
  {
    file: "step-1.jpg",
    title: "选择家常菜",
    copy: "从今天想吃什么开始",
    description: "首页把家常菜、减脂餐、狗狗大餐和水果放进同一套选择流程，先按口味分类或搜索，再决定今晚吃什么。",
    feature: "支持分类、关键词搜索、入选次数排序和“帮我挑”随机推荐。",
  },
  {
    file: "step-2.jpg",
    title: "切换减脂餐",
    copy: "把选择切换到轻盈一点",
    description: "不改变使用习惯，只切换顶部系列，就能进入减脂餐的独立菜品库和分类视图。",
    feature: "每个系列共享同一套选菜交互，方便在不同饮食目标之间来回切换。",
  },
  {
    file: "step-3.jpg",
    title: "发现狗狗大餐",
    copy: "把外出就餐也记进菜单",
    description: "狗狗大餐不是宠物食品，而是把火锅、川菜、寿司等外出就餐想法整理成可选择的分类。",
    feature: "可按热辣、中餐、异国、烟火、约会等分组浏览，并为具体菜类补充店铺。",
  },
  {
    file: "step-4.jpg",
    title: "浏览水果",
    copy: "按季节挑一份水果",
    description: "水果页面把品种、上市月份和简单吃法放在一起，让“想吃点水果”也有明确的选择依据。",
    feature: "支持月份筛选，并保留全年供应和跨月份的季节提示。",
  },
  {
    file: "step-5.jpg",
    title: "查看菜品做法",
    copy: "从想吃到会做",
    description: "点开单个菜品后，可以看到参考份量、所需厨具、备菜说明和分步做法，不需要离开菜单再查资料。",
    feature: "详情页可直接把菜品加入今晚菜单，适合边看步骤边完成晚餐规划。",
  },
  {
    file: "step-6.jpg",
    title: "记录好吃的店",
    copy: "把想去的店留在菜品下面",
    description: "外出大餐详情里可以记录店铺名称、地点和口味备注，下次想吃同类料理时不用重新回忆。",
    feature: "店铺记录支持新增、编辑和删除；微信版可按账号保存，换手机也能继续使用。",
  },
  {
    file: "step-7.jpg",
    title: "组成今晚菜单",
    copy: "把喜欢的菜装进今晚",
    description: "选中的菜会集中到今晚菜单，用户可以调整菜品、起一个晚餐标题，再写一句想对对方说的话。",
    feature: "保存后形成一份可回看的晚餐记录，也能在绑定状态下发送给另一位用户。",
  },
  {
    file: "step-8.jpg",
    title: "查看我的回忆",
    copy: "每一顿都留下痕迹",
    description: "“我的”页面把历史晚餐、当前菜单和绑定状态放在一起，回看过去的选择，也可以再次复用一顿旧菜单。",
    feature: "支持再吃一次、删除记录和查看同步结果；本地演示版数据保存在浏览器。",
  },
  {
    file: "step-9.jpg",
    title: "双人晚餐同步",
    copy: "把晚餐写给正在一起生活的人",
    description: "绑定后，双方可以把各自选好的晚餐发送给对方，形成只属于两个人的晚餐信件和回忆。",
    feature: "微信版包含邀请、确认、解绑与恢复流程，并保留私密晚餐的发送、撤回和隐藏状态。",
  },
  {
    file: "step-10.jpg",
    title: "打开晚餐详情",
    copy: "收到一份完整的晚餐心意",
    description: "晚餐详情页会还原这一次选择里的菜品顺序、店铺快照和写给彼此的话，让接收者看到完整上下文。",
    feature: "私密晚餐仅对绑定双方可见；菜品详情仍可继续打开查看做法或外出店铺。",
  },
] as const;

export function ShowcaseGuide() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const active = activeStep === null ? null : DEMO_STEPS[activeStep];

  useEffect(() => {
    if (activeStep === null) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveStep(null);
      if (event.key === "ArrowRight") setActiveStep((value) => value === null ? 0 : (value + 1) % DEMO_STEPS.length);
      if (event.key === "ArrowLeft") setActiveStep((value) => value === null ? DEMO_STEPS.length - 1 : (value - 1 + DEMO_STEPS.length) % DEMO_STEPS.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeStep]);

  return (
    <section className="showcase-guide" aria-labelledby="showcase-title">
      <div className="showcase-heading">
        <div>
          <span className="showcase-eyebrow">REAL DEVICE WALKTHROUGH</span>
          <h2 id="showcase-title">使用说明 · 真机演示</h2>
          <p>先看一分钟操作，再在上方的浏览器体验版里亲手试一遍。</p>
        </div>
        <span className="showcase-index">01—10</span>
      </div>

      <div className="showcase-intro-grid">
        <figure className="showcase-video-card">
          <div className="showcase-video-frame">
            <video controls playsInline preload="metadata" poster="/showcase/step-1.jpg" aria-label="小猫晚餐随心选真机演示视频">
              <source src="/showcase/demo.mp4" type="video/mp4" />
              <track kind="captions" srcLang="zh" src="/showcase/demo.vtt" default />
              当前浏览器不支持视频播放，请直接查看下方操作截图。
            </video>
          </div>
          <figcaption><strong>一分钟上手</strong><span>从选菜、保存菜单到查看双人晚餐</span></figcaption>
        </figure>

        <div className="showcase-steps-card">
          <span className="showcase-eyebrow">QUICK START</span>
          <h3>三步走完一顿晚餐</h3>
          <ol>
            <li><b>01</b><div><strong>先选菜</strong><span>切换四类菜单，搜索、分类或点击“帮我挑”。</span></div></li>
            <li><b>02</b><div><strong>装进今晚</strong><span>点加号加入菜单，补一句备注后保存。</span></div></li>
            <li><b>03</b><div><strong>留下回忆</strong><span>在“我的”里查看历史，也可以进入绑定演示。</span></div></li>
          </ol>
          <p className="showcase-note">网页版本使用浏览器本地数据模拟体验；微信云开发版才会连接真实账号与云端绑定。</p>
        </div>
      </div>

      <div className="showcase-gallery-heading">
        <div><span className="showcase-eyebrow">SCREEN NOTES</span><h3>十个关键画面</h3></div>
        <span>点击查看大图 · ESC 关闭</span>
      </div>
      <div className="showcase-gallery">
        {DEMO_STEPS.map((step, index) => (
          <button key={step.file} type="button" className={`showcase-shot${index >= 8 ? " showcase-shot--focus" : ""}`} onClick={() => setActiveStep(index)} aria-label={`查看：${step.title}`}>
            <span className="showcase-shot__image"><img src={`/showcase/${step.file}`} alt="" loading="lazy" /></span>
            <span className="showcase-shot__meta"><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{step.title}</strong><small>{step.copy}</small></span></span>
            <span className="showcase-shot__detail">
              <span><b>画面说明</b>{step.description}</span>
              <span><b>功能</b>{step.feature}</span>
            </span>
          </button>
        ))}
      </div>

      {active && activeStep !== null && (
        <div className="showcase-lightbox" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setActiveStep(null)}>
          <div className="showcase-lightbox__panel" role="dialog" aria-modal="true" aria-label={active.title}>
            <button type="button" className="showcase-lightbox__close" onClick={() => setActiveStep(null)} aria-label="关闭大图">×</button>
            <img src={`/showcase/${active.file}`} alt={active.title} />
            <div className="showcase-lightbox__caption"><b>{String(activeStep + 1).padStart(2, "0")} / 10</b><span><strong>{active.title}</strong><em>{active.copy}</em><small><b>功能：</b>{active.feature}</small></span></div>
            <button type="button" className="showcase-lightbox__prev" onClick={() => setActiveStep((activeStep - 1 + DEMO_STEPS.length) % DEMO_STEPS.length)} aria-label="上一张">‹</button>
            <button type="button" className="showcase-lightbox__next" onClick={() => setActiveStep((activeStep + 1) % DEMO_STEPS.length)} aria-label="下一张">›</button>
          </div>
        </div>
      )}
    </section>
  );
}
