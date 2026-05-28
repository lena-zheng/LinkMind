"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Filter,
  Flame,
  Loader2,
  Plus,
  Search,
  Star,
} from "lucide-react";
import type { BriefingItem, KnowledgeItem } from "@/lib/types";
import { CATEGORY_ALIASES, CATEGORIES, LEGACY_CATEGORY_LABELS, SOURCE_LABELS } from "@/lib/sources";

type Tab = "briefing" | "knowledge" | "add";
type LoadState = "idle" | "loading";
type UiLanguage = "en" | "zh";
type BriefingTranslation = Pick<BriefingItem, "title" | "summary">;

const UI_TEXT = {
  en: {
    add: "Add Link",
    addDescription: "Paste an article, paper, GitHub project, or product page. The system will extract the content and organize it into your knowledge base.",
    addEyebrow: "Paste a source URL · Extract and organize",
    addHeading: "Add an AI-related link",
    aiNotes: "AI Notes",
    all: "All",
    allCategories: "All categories",
    alreadySaved: "Already saved",
    briefingEmpty: "No briefing items yet. LinkMind will fetch the latest AI news automatically.",
    briefingEyebrow: "Asia/Shanghai · Auto-refreshes daily at 09:00",
    briefingTitle: "AI Briefing",
    dailyBriefing: "Daily Briefing",
    english: "English",
    chinese: "Chinese",
    failedBriefing: "Failed to load briefing.",
    failedKnowledge: "Failed to load knowledge base.",
    failedParse: "Failed to parse the link.",
    failedSave: "Save failed. Please try again.",
    failedTranslate: "Failed to translate briefing items.",
    fullText: "Full Text",
    item: "item",
    items: "items",
    keyPoints: "Key Points",
    knowledgeBase: "Knowledge Base",
    knowledgeEmpty: "No knowledge items yet. Save a briefing item or add a link first.",
    knowledgeEyebrow: () => "Searchable knowledge base",
    knowledgeFilterEmpty: "No knowledge items match these filters.",
    knowledgeTitle: "Organized Knowledge Base",
    language: "EN",
    loadingBriefing: "Loading briefing...",
    loadingKnowledge: "Loading knowledge base...",
    openOriginal: "Open original",
    openArticle: "Open",
    organize: "Organize",
    organizingLink: "Parsing the link and organizing it into the knowledge base...",
    personalRadar: "Personal AI Radar",
    saveAndOrganize: "Save and organize",
    savedToKnowledge: "Saved to knowledge base:",
    searchPlaceholder: "Search saved links",
    selectKnowledge: "Select a knowledge item to view details.",
    sourceUrlPlaceholder: "https://...",
    switchToChinese: "Switch to Chinese",
    switchToEnglish: "Switch to English",
    tags: "Tags",
    priority: "Priority",
    topPriorityBriefing: "Top priority briefing",
    topPriorityList: "Top priority list",
    translatingBriefings: "Translating briefing items...",
    whyItMatters: "Why It Matters",
  },
  zh: {
    add: "添加链接",
    addDescription: "粘贴文章、论文、GitHub 项目或产品页面，系统会提取内容并整理进知识库。",
    addEyebrow: "粘贴来源链接 · 提取并整理",
    addHeading: "添加 AI 相关链接",
    aiNotes: "AI 备注",
    all: "全部",
    allCategories: "全部分类",
    alreadySaved: "已保存",
    briefingEmpty: "还没有资讯。LinkMind 会自动抓取最新 AI 资讯。",
    briefingEyebrow: "北京时间 · 每天 09:00 自动刷新",
    briefingTitle: "AI 资讯",
    dailyBriefing: "每日资讯",
    english: "英文",
    chinese: "中文",
    failedBriefing: "资讯加载失败。",
    failedKnowledge: "知识库加载失败。",
    failedParse: "链接解析失败。",
    failedSave: "保存失败，请重试。",
    failedTranslate: "资讯翻译失败，请检查 OPENAI_API_KEY。",
    fullText: "完整正文",
    item: "条",
    items: "条",
    keyPoints: "要点",
    knowledgeBase: "知识库",
    knowledgeEmpty: "知识库还是空的。先保存一条资讯或添加一个链接。",
    knowledgeEyebrow: () => "可搜索知识库",
    knowledgeFilterEmpty: "没有符合当前筛选的知识条目。",
    knowledgeTitle: "知识库",
    language: "中",
    loadingBriefing: "正在加载资讯...",
    loadingKnowledge: "正在加载知识库...",
    openOriginal: "打开原文",
    openArticle: "打开",
    organize: "整理",
    organizingLink: "正在解析链接并整理进知识库...",
    personalRadar: "个人 AI 雷达",
    saveAndOrganize: "保存并整理",
    savedToKnowledge: "已加入知识库：",
    searchPlaceholder: "搜索已保存链接",
    selectKnowledge: "选择一个知识条目查看详情。",
    sourceUrlPlaceholder: "https://...",
    switchToChinese: "切换到中文",
    switchToEnglish: "切换到英文",
    tags: "标签",
    priority: "优先级",
    topPriorityBriefing: "重点资讯",
    topPriorityList: "重点资讯列表",
    translatingBriefings: "正在翻译资讯...",
    whyItMatters: "为什么重要",
  },
} as const;

type UiText = (typeof UI_TEXT)[UiLanguage];

const CATEGORY_LABELS_ZH: Record<string, string> = {
  "AI Agent": "AI 智能体",
  "AI Coding": "AI 编程",
  "AI Products": "AI 产品",
  "AI Tools": "AI 工具",
  "Business & Funding": "融资商业",
  "Company Updates": "公司动态",
  "Foundation Models": "基础模型",
  "Image / Video Generation": "图像 / 视频生成",
  "Industry Applications": "行业应用",
  Multimodal: "多模态",
  "Open Source": "开源",
  Other: "其他",
  "Policy & Regulation": "政策监管",
  "Research Papers": "论文研究",
  Robotics: "机器人",
  "Voice AI": "语音 AI",
};

function today() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function labelCategory(category: string) {
  return LEGACY_CATEGORY_LABELS[category] || category;
}

function labelCategoryForLanguage(category: string, language: UiLanguage) {
  const normalized = labelCategory(category);
  return language === "zh" ? CATEGORY_LABELS_ZH[normalized] || normalized : normalized;
}

function labelTag(tag: string, language: UiLanguage) {
  const normalized = LEGACY_CATEGORY_LABELS[tag] || SOURCE_LABELS[tag] || tag;
  return language === "zh" ? CATEGORY_LABELS_ZH[normalized] || normalized : normalized;
}

function labelSource(source: string) {
  return SOURCE_LABELS[source] || source;
}

function categoryMatches(itemCategory: string, selectedCategory: string) {
  return itemCategory === selectedCategory || CATEGORY_ALIASES[selectedCategory]?.includes(itemCategory);
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("briefing");
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("en");
  const [briefings, setBriefings] = useState<BriefingItem[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeItem | null>(null);
  const [briefingCategory, setBriefingCategory] = useState("all");
  const [knowledgeCategory, setKnowledgeCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [briefingState, setBriefingState] = useState<LoadState>("idle");
  const [knowledgeState, setKnowledgeState] = useState<LoadState>("idle");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [featuredId, setFeaturedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [briefingTranslations, setBriefingTranslations] = useState<Record<number, BriefingTranslation>>({});
  const [translationState, setTranslationState] = useState<LoadState>("idle");
  const [translationUnavailable, setTranslationUnavailable] = useState(false);
  const ui = UI_TEXT[uiLanguage];

  const loadBriefings = useCallback(async () => {
    setBriefingState("loading");
    try {
      const params = new URLSearchParams({ date: today(), language: "all", category: "all" });
      const response = await fetch(`/api/briefings?${params.toString()}`);
      if (!response.ok) throw new Error(ui.failedBriefing);
      const data = (await response.json()) as { items: BriefingItem[] };
      setBriefings(data.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.failedBriefing);
    } finally {
      setBriefingState("idle");
    }
  }, [ui.failedBriefing]);

  const loadKnowledge = useCallback(async () => {
    setKnowledgeState("loading");
    try {
      const params = new URLSearchParams({ q: query, language: "all", category: "all" });
      const response = await fetch(`/api/knowledge?${params.toString()}`);
      if (!response.ok) throw new Error(ui.failedKnowledge);
      const data = (await response.json()) as { items: KnowledgeItem[] };
      setKnowledge(data.items);
      setSelectedKnowledge((current) => {
        if (current && data.items.some((item) => item.id === current.id)) return current;
        return data.items[0] || null;
      });
    } catch (error) {
      if (tab === "knowledge") {
        setMessage(error instanceof Error ? error.message : ui.failedKnowledge);
      }
    } finally {
      setKnowledgeState("idle");
    }
  }, [query, tab, ui.failedKnowledge]);

  useEffect(() => {
    const timer = setTimeout(() => void loadBriefings(), 0);
    return () => clearTimeout(timer);
  }, [loadBriefings]);

  useEffect(() => {
    const timer = setTimeout(() => void loadKnowledge(), 200);
    return () => clearTimeout(timer);
  }, [loadKnowledge]);

  useEffect(() => {
    if (uiLanguage !== "zh" || translationUnavailable || !briefings.length) return;

    const untranslated = briefings.filter((item) => item.language !== "zh" && !briefingTranslations[item.id]);
    if (!untranslated.length) return;

    let cancelled = false;
    const translateBriefings = async () => {
      setTranslationState("loading");
      try {
        const response = await fetch("/api/translations/briefings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: untranslated.map((item) => ({
              id: item.id,
              title: item.title,
              summary: item.summary,
            })),
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || ui.failedTranslate);
        }

        const data = (await response.json()) as { items: Array<{ id: number; title: string; summary: string }> };
        if (cancelled) return;
        setBriefingTranslations((current) => ({
          ...current,
          ...Object.fromEntries(data.items.map((item) => [item.id, { title: item.title, summary: item.summary }])),
        }));
      } catch (error) {
        if (!cancelled) {
          setTranslationUnavailable(true);
          setMessage(error instanceof Error ? error.message : ui.failedTranslate);
        }
      } finally {
        if (!cancelled) setTranslationState("idle");
      }
    };

    void translateBriefings();

    return () => {
      cancelled = true;
    };
  }, [briefingTranslations, briefings, translationUnavailable, ui.failedTranslate, uiLanguage]);

  const filteredKnowledge = useMemo(
    () =>
      knowledge.filter((item) => knowledgeCategory === "all" || categoryMatches(item.category, knowledgeCategory)),
    [knowledge, knowledgeCategory],
  );

  const filteredBriefings = useMemo(
    () =>
      briefings.filter((item) => briefingCategory === "all" || categoryMatches(item.category, briefingCategory)),
    [briefings, briefingCategory],
  );

  const briefingCategoryCounts = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((item) => [
          item,
          briefings.filter((briefing) => categoryMatches(briefing.category, item)).length,
        ]),
      ) as Record<string, number>,
    [briefings],
  );

  const featuredBriefings = useMemo(
    () => filteredBriefings.filter((item) => item.importanceScore > 90),
    [filteredBriefings],
  );

  const carouselBriefings = useMemo(
    () => featuredBriefings.slice(0, 4),
    [featuredBriefings],
  );

  const activeFeatured = useMemo(
    () => carouselBriefings.find((item) => item.id === featuredId) || carouselBriefings[0] || null,
    [carouselBriefings, featuredId],
  );

  const regularBriefings = useMemo(() => {
    const featuredIds = new Set(featuredBriefings.map((item) => item.id));
    return filteredBriefings.filter((item) => !featuredIds.has(item.id));
  }, [filteredBriefings, featuredBriefings]);

  useEffect(() => {
    if (tab !== "briefing" || carouselBriefings.length < 2) return;
    const timer = window.setInterval(() => {
      setFeaturedId((currentId) => {
        const currentIndex = carouselBriefings.findIndex((item) => item.id === currentId);
        const nextIndex = currentIndex === -1 ? 1 : (currentIndex + 1) % carouselBriefings.length;
        return carouselBriefings[nextIndex]?.id || carouselBriefings[0]?.id || null;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [carouselBriefings, tab]);

  const favoriteBriefing = async (item: BriefingItem) => {
    setSavingId(item.id);
    setMessage(ui.organizingLink);
    try {
      const response = await fetch(`/api/briefings/${item.id}/favorite`, { method: "POST" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setMessage(data.error || ui.failedSave);
      } else {
        const data = (await response.json()) as { item: KnowledgeItem };
        setMessage(`${ui.savedToKnowledge} ${data.item.title}`);
        setSelectedKnowledge(data.item);
        await Promise.all([loadBriefings(), loadKnowledge()]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.failedSave);
    } finally {
      setSavingId(null);
    }
  };

  const addManualLink = async () => {
    if (!manualUrl.trim()) return;
    setKnowledgeState("loading");
    setMessage(ui.organizingLink);
    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: manualUrl.trim() }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setMessage(data.error || ui.failedParse);
      } else {
        const data = (await response.json()) as { item: KnowledgeItem };
        setManualUrl("");
        setSelectedKnowledge(data.item);
        setTab("knowledge");
        setMessage(`${ui.savedToKnowledge} ${data.item.title}`);
        await loadKnowledge();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.failedParse);
    } finally {
      setKnowledgeState("idle");
    }
  };

  const pageEyebrow =
    tab === "briefing"
      ? ui.briefingEyebrow
      : tab === "knowledge"
        ? ui.knowledgeEyebrow()
        : ui.addEyebrow;
  const pageTitle = tab === "briefing" ? ui.briefingTitle : tab === "knowledge" ? ui.knowledgeTitle : ui.add;
  const languageSwitchLabel = uiLanguage === "en" ? ui.switchToChinese : ui.switchToEnglish;
  const statusMessage = translationState === "loading" && uiLanguage === "zh" ? ui.translatingBriefings : message;
  const getBriefingCopy = (item: BriefingItem) =>
    uiLanguage === "zh" && item.language !== "zh" ? briefingTranslations[item.id] || item : item;

  return (
    <main className={`app-shell lang-${uiLanguage}`}>
      <aside className="sidebar">
        <div>
          <div className="brand-lockup">
            <h1>LinkMind</h1>
          </div>
          <p className="eyebrow">{ui.personalRadar}</p>
        </div>

        <nav className="nav-tabs" aria-label={uiLanguage === "en" ? "Primary navigation" : "主导航"}>
          <button className={tab === "briefing" ? "active" : ""} onClick={() => setTab("briefing")}>
            <Flame size={18} /> {ui.dailyBriefing}
          </button>
          <button className={tab === "knowledge" ? "active" : ""} onClick={() => setTab("knowledge")}>
            <BookOpen size={18} /> {ui.knowledgeBase}
          </button>
          <button className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>
            <Plus size={18} /> {ui.add}
          </button>
        </nav>

        <div className="language-switch">
          <span>EN</span>
          <button
            className={uiLanguage === "zh" ? "active" : ""}
            type="button"
            role="switch"
            aria-checked={uiLanguage === "zh"}
            aria-label={languageSwitchLabel}
            onClick={() => setUiLanguage((current) => (current === "en" ? "zh" : "en"))}
            title={languageSwitchLabel}
          >
            <span />
          </button>
          <span>中</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar topbar-spacious">
          <div>
            <p className="eyebrow">{pageEyebrow}</p>
            <h2>{pageTitle}</h2>
          </div>
        </header>

          {tab === "knowledge" && (
            <div className="knowledge-tablebar">
              <span className="knowledge-count">
                {filteredKnowledge.length} {filteredKnowledge.length === 1 ? ui.item : ui.items}
              </span>
              <div className="topbar-actions">
                <label className="topbar-search">
                  <Search size={18} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ui.searchPlaceholder} />
                </label>
                <label className="topbar-filter">
                  <Filter size={17} />
                  <select value={knowledgeCategory} onChange={(event) => setKnowledgeCategory(event.target.value)}>
                    <option value="all">{ui.allCategories}</option>
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {labelCategoryForLanguage(item, uiLanguage)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

        {tab === "briefing" && (
          <div className="topic-strip" aria-label="Briefing topics">
            <button className={briefingCategory === "all" ? "active" : ""} onClick={() => setBriefingCategory("all")}>
              {ui.all}
              <span className="topic-count">{briefings.length}</span>
            </button>
            {CATEGORIES.slice(0, 8).map((item) => (
              <button
                className={briefingCategory === item ? "active" : ""}
                key={item}
                onClick={() => setBriefingCategory(item)}
              >
                {labelCategoryForLanguage(item, uiLanguage)}
                <span className="topic-count">{briefingCategoryCounts[item] || 0}</span>
              </button>
            ))}
          </div>
        )}

        {statusMessage && <div className="status-line">{statusMessage}</div>}

        {tab === "briefing" && (
          <>
            {activeFeatured && (
              <section className="featured-briefing" aria-label={ui.topPriorityBriefing}>
                <article className="featured-hero">
                  <a className="featured-hero-link" href={activeFeatured.url} target="_blank" rel="noreferrer" aria-label={`${ui.openArticle} ${getBriefingCopy(activeFeatured).title}`}>
                    {activeFeatured.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeFeatured.imageUrl} alt="" />
                    )}
                    <div className="featured-hero-overlay">
                      <div className="featured-hero-tags">
                        <span>{labelCategoryForLanguage(activeFeatured.category, uiLanguage)}</span>
                        <span>{ui.priority} {activeFeatured.importanceScore}</span>
                      </div>
                      <h3>{getBriefingCopy(activeFeatured).title}</h3>
                      <p>{getBriefingCopy(activeFeatured).summary}</p>
                    </div>
                  </a>
                  <button
                    className={`featured-save ${activeFeatured.isFavorite ? "saved" : ""}`}
                    onClick={() => favoriteBriefing(activeFeatured)}
                    disabled={savingId === activeFeatured.id || activeFeatured.isFavorite}
                    title={activeFeatured.isFavorite ? ui.alreadySaved : ui.saveAndOrganize}
                  >
                    {savingId === activeFeatured.id ? <Loader2 className="spin" size={18} /> : <Star size={18} />}
                  </button>
                </article>

                <div className="featured-list" aria-label={ui.topPriorityList}>
                  {carouselBriefings.map((item) => (
                    <a
                      className={activeFeatured.id === item.id ? "active" : ""}
                      href={item.url}
                      key={item.id}
                      target="_blank"
                      rel="noreferrer"
                      onFocus={() => setFeaturedId(item.id)}
                      onMouseEnter={() => setFeaturedId(item.id)}
                    >
                      <strong>{getBriefingCopy(item).title}</strong>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section className="item-list">
              {briefingState === "loading" && <div className="empty">{ui.loadingBriefing}</div>}
              {briefingState === "idle" && filteredBriefings.length === 0 && (
                <div className="empty">{ui.briefingEmpty}</div>
              )}
              {regularBriefings.map((item) => (
                <article className="news-card" key={item.id}>
                  <a className="news-card-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`${ui.openArticle} ${getBriefingCopy(item).title}`}>
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="news-thumb" src={item.imageUrl} alt="" loading="lazy" />
                    )}
                    <div className="tag-row">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span key={tag}>{labelTag(tag, uiLanguage)}</span>
                      ))}
                    </div>
                    <div className="card-main">
                      <h3>{getBriefingCopy(item).title}</h3>
                      <p>{getBriefingCopy(item).summary}</p>
                    </div>
                  </a>
                  <div className="card-actions">
                    <button
                      className={`icon-button ${item.isFavorite ? "saved" : ""}`}
                      onClick={() => favoriteBriefing(item)}
                      disabled={savingId === item.id || item.isFavorite}
                      title={item.isFavorite ? ui.alreadySaved : ui.saveAndOrganize}
                    >
                      {savingId === item.id ? <Loader2 className="spin" size={18} /> : <Star size={18} />}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {tab === "knowledge" && (
          <section className="knowledge-layout">
            <div className="knowledge-list">
              {knowledgeState === "loading" && <div className="empty">{ui.loadingKnowledge}</div>}
              {knowledgeState === "idle" && knowledge.length === 0 && <div className="empty">{ui.knowledgeEmpty}</div>}
              {knowledgeState === "idle" && knowledge.length > 0 && filteredKnowledge.length === 0 && (
                <div className="empty">{ui.knowledgeFilterEmpty}</div>
              )}
              {filteredKnowledge.map((item) => (
                <button
                  key={item.id}
                  className={`knowledge-row ${selectedKnowledge?.id === item.id ? "active" : ""}`}
                  onClick={() => setSelectedKnowledge(item)}
                >
                  <div className="knowledge-row-content">
                    <div className="knowledge-row-tags">
                      <span>{labelCategoryForLanguage(item.category, uiLanguage)}</span>
                    </div>
                    <strong>{item.title}</strong>
                    <div className="knowledge-row-meta">
                      <small>{labelSource(item.source)}</small>
                      <time dateTime={item.savedAt}>
                        {new Date(item.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </time>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <KnowledgeDetail item={selectedKnowledge} ui={ui} uiLanguage={uiLanguage} />
          </section>
        )}

        {tab === "add" && (
          <section className="add-panel">
            <div>
              <h3>{ui.addHeading}</h3>
              <p>{ui.addDescription}</p>
            </div>
            <div className="url-form">
              <input value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder={ui.sourceUrlPlaceholder} />
              <button className="primary-button" onClick={addManualLink} disabled={knowledgeState === "loading"}>
                {knowledgeState === "loading" ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                {ui.organize}
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function KnowledgeDetail({ item, ui, uiLanguage }: { item: KnowledgeItem | null; ui: UiText; uiLanguage: UiLanguage }) {
  if (!item) {
    return <div className="knowledge-detail empty">{ui.selectKnowledge}</div>;
  }

  return (
    <article className="knowledge-detail">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="knowledge-hero-image" src={item.imageUrl} alt="" />
      )}
      <div className="meta-row">
        <span>{item.language === "zh" ? ui.chinese : ui.english}</span>
        <span>{labelCategoryForLanguage(item.category, uiLanguage)}</span>
        <span>{new Date(item.savedAt).toLocaleDateString("en-US")}</span>
      </div>
      <h3>{item.title}</h3>
      <a className="source-link" href={item.url} target="_blank" rel="noreferrer">
        {ui.openOriginal} <ExternalLink size={15} />
      </a>
      <p className="lead">{item.summary}</p>
      <section>
        <h4>{ui.keyPoints}</h4>
        <ul>
          {item.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4>{ui.whyItMatters}</h4>
        <p>{item.whyItMatters}</p>
      </section>
      <section>
        <h4>{ui.tags}</h4>
        <div className="tag-row">
          {item.tags.map((tag) => (
            <span key={tag}>{labelTag(tag, uiLanguage)}</span>
          ))}
        </div>
      </section>
      <section>
        <h4>{ui.aiNotes}</h4>
        <p>{item.aiNotes}</p>
      </section>
      <section>
        <h4>{ui.fullText}</h4>
        <div className="full-text">{item.rawContent}</div>
      </section>
    </article>
  );
}
