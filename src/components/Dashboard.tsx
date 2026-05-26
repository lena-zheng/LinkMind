"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  Filter,
  Loader2,
  Plus,
  Search,
  Star,
} from "lucide-react";
import type { BriefingItem, KnowledgeItem } from "@/lib/types";
import { CATEGORY_ALIASES, CATEGORIES, LEGACY_CATEGORY_LABELS, SOURCE_LABELS } from "@/lib/sources";

type Tab = "briefing" | "knowledge" | "add";
type LoadState = "idle" | "loading";

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

function labelTag(tag: string) {
  return LEGACY_CATEGORY_LABELS[tag] || SOURCE_LABELS[tag] || tag;
}

function labelSource(source: string) {
  return SOURCE_LABELS[source] || source;
}

function categoryMatches(itemCategory: string, selectedCategory: string) {
  return itemCategory === selectedCategory || CATEGORY_ALIASES[selectedCategory]?.includes(itemCategory);
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("briefing");
  const [briefings, setBriefings] = useState<BriefingItem[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeItem | null>(null);
  const [knowledgeCategory, setKnowledgeCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [briefingState, setBriefingState] = useState<LoadState>("idle");
  const [knowledgeState, setKnowledgeState] = useState<LoadState>("idle");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [featuredId, setFeaturedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const loadBriefings = useCallback(async () => {
    setBriefingState("loading");
    const params = new URLSearchParams({ date: today(), language: "all", category: "all" });
    const response = await fetch(`/api/briefings?${params.toString()}`);
    const data = (await response.json()) as { items: BriefingItem[] };
    setBriefings(data.items);
    setBriefingState("idle");
  }, []);

  const loadKnowledge = useCallback(async () => {
    setKnowledgeState("loading");
    const params = new URLSearchParams({ q: query, language: "all", category: "all" });
    const response = await fetch(`/api/knowledge?${params.toString()}`);
    const data = (await response.json()) as { items: KnowledgeItem[] };
    setKnowledge(data.items);
    setSelectedKnowledge((current) => current || data.items[0] || null);
    setKnowledgeState("idle");
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => void loadBriefings(), 0);
    return () => clearTimeout(timer);
  }, [loadBriefings]);

  useEffect(() => {
    const timer = setTimeout(() => void loadKnowledge(), 200);
    return () => clearTimeout(timer);
  }, [loadKnowledge]);

  const filteredKnowledge = useMemo(
    () =>
      knowledge.filter((item) => knowledgeCategory === "all" || categoryMatches(item.category, knowledgeCategory)),
    [knowledge, knowledgeCategory],
  );

  const featuredBriefings = useMemo(
    () => briefings.filter((item) => item.importanceScore > 90),
    [briefings],
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
    return briefings.filter((item) => !featuredIds.has(item.id));
  }, [briefings, featuredBriefings]);

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
    setMessage("Fetching the original article and organizing it into the knowledge base...");
    const response = await fetch(`/api/briefings/${item.id}/favorite`, { method: "POST" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error || "Save failed. Please try again.");
    } else {
      const data = (await response.json()) as { item: KnowledgeItem };
      setMessage(`Saved to knowledge base: ${data.item.title}`);
      setSelectedKnowledge(data.item);
      await Promise.all([loadBriefings(), loadKnowledge()]);
    }
    setSavingId(null);
  };

  const addManualLink = async () => {
    if (!manualUrl.trim()) return;
    setKnowledgeState("loading");
    setMessage("Parsing the link and organizing it into the knowledge base...");
    const response = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: manualUrl.trim() }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error || "Failed to parse the link.");
    } else {
      const data = (await response.json()) as { item: KnowledgeItem };
      setManualUrl("");
      setSelectedKnowledge(data.item);
      setTab("knowledge");
      setMessage(`Added to knowledge base: ${data.item.title}`);
      await loadKnowledge();
    }
    setKnowledgeState("idle");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Personal AI Radar</p>
          <h1>LinkMind</h1>
        </div>

        <nav className="nav-tabs" aria-label="Primary navigation">
          <button className={tab === "briefing" ? "active" : ""} onClick={() => setTab("briefing")}>
            <CalendarDays size={18} /> Daily Briefing
          </button>
          <button className={tab === "knowledge" ? "active" : ""} onClick={() => setTab("knowledge")}>
            <BookOpen size={18} /> Knowledge Base
          </button>
          <button className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>
            <Plus size={18} /> Add Link
          </button>
        </nav>

      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Asia/Shanghai · Auto-refreshes daily at 09:00</p>
            <h2>{tab === "briefing" ? "AI Briefing" : tab === "knowledge" ? "Organized Knowledge Base" : "Add a Link"}</h2>
          </div>
          {tab === "knowledge" && (
            <div className="topbar-actions">
              <label className="topbar-search">
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved links" />
              </label>
              <label className="topbar-filter">
                <Filter size={17} />
                <select value={knowledgeCategory} onChange={(event) => setKnowledgeCategory(event.target.value)}>
                  <option value="all">All categories</option>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </header>

        {message && <div className="status-line">{message}</div>}

        {tab === "briefing" && (
          <>
            {activeFeatured && (
              <section className="featured-briefing" aria-label="Top priority briefing">
                <article className="featured-hero">
                  <a className="featured-hero-link" href={activeFeatured.url} target="_blank" rel="noreferrer" aria-label={`Open ${activeFeatured.title}`}>
                    {activeFeatured.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeFeatured.imageUrl} alt="" />
                    )}
                    <div className="featured-hero-overlay">
                      <div className="featured-hero-tags">
                        <span>{labelCategory(activeFeatured.category)}</span>
                        <span>Priority {activeFeatured.importanceScore}</span>
                      </div>
                      <h3>{activeFeatured.title}</h3>
                      <p>{activeFeatured.summary}</p>
                    </div>
                  </a>
                  <button
                    className={`featured-save ${activeFeatured.isFavorite ? "saved" : ""}`}
                    onClick={() => favoriteBriefing(activeFeatured)}
                    disabled={savingId === activeFeatured.id || activeFeatured.isFavorite}
                    title={activeFeatured.isFavorite ? "Already saved" : "Save and organize"}
                  >
                    {savingId === activeFeatured.id ? <Loader2 className="spin" size={18} /> : <Star size={18} />}
                  </button>
                </article>

                <div className="featured-list" aria-label="Top priority list">
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
                      <strong>{item.title}</strong>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section className="item-list">
              {briefingState === "loading" && <div className="empty">Loading briefing...</div>}
              {briefingState === "idle" && briefings.length === 0 && (
                <div className="empty">No briefing items yet. LinkMind will fetch the latest AI news automatically.</div>
              )}
              {regularBriefings.map((item) => (
                <article className="news-card" key={item.id}>
                  <a className="news-card-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}>
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="news-thumb" src={item.imageUrl} alt="" loading="lazy" />
                    )}
                    <div className="card-main">
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                      <div className="tag-row">
                        {item.tags.slice(0, 5).map((tag) => (
                          <span key={tag}>{labelTag(tag)}</span>
                        ))}
                      </div>
                    </div>
                  </a>
                  <div className="card-actions">
                    <button
                      className={`icon-button ${item.isFavorite ? "saved" : ""}`}
                      onClick={() => favoriteBriefing(item)}
                      disabled={savingId === item.id || item.isFavorite}
                      title={item.isFavorite ? "Already saved" : "Save and organize"}
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
              {knowledgeState === "loading" && <div className="empty">Loading knowledge base...</div>}
              {knowledgeState === "idle" && knowledge.length === 0 && <div className="empty">No knowledge items yet. Save a briefing item or add a link first.</div>}
              {knowledgeState === "idle" && knowledge.length > 0 && filteredKnowledge.length === 0 && (
                <div className="empty">No knowledge items match these filters.</div>
              )}
              {filteredKnowledge.map((item) => (
                <button
                  key={item.id}
                  className={`knowledge-row ${selectedKnowledge?.id === item.id ? "active" : ""}`}
                  onClick={() => setSelectedKnowledge(item)}
                >
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="knowledge-row-thumb" src={item.imageUrl} alt="" loading="lazy" />
                  )}
                  <div className="knowledge-row-content">
                    <div className="knowledge-row-tags">
                      <span>{labelCategory(item.category)}</span>
                      <span>{new Date(item.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <strong>{item.title}</strong>
                    <small>{labelSource(item.source)}</small>
                  </div>
                </button>
              ))}
            </div>
            <KnowledgeDetail item={selectedKnowledge} />
          </section>
        )}

        {tab === "add" && (
          <section className="add-panel">
            <div>
              <h3>Add an AI-related link</h3>
              <p>Paste an article, paper, GitHub project, or product page. The system will extract the content and organize it into your knowledge base.</p>
            </div>
            <div className="url-form">
              <input value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="https://..." />
              <button className="primary-button" onClick={addManualLink} disabled={knowledgeState === "loading"}>
                {knowledgeState === "loading" ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                Organize
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function KnowledgeDetail({ item }: { item: KnowledgeItem | null }) {
  if (!item) {
    return <div className="knowledge-detail empty">Select a knowledge item to view details.</div>;
  }

  return (
    <article className="knowledge-detail">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="knowledge-hero-image" src={item.imageUrl} alt="" />
      )}
      <div className="meta-row">
        <span>{item.language === "zh" ? "Chinese" : "English"}</span>
        <span>{labelCategory(item.category)}</span>
        <span>{new Date(item.savedAt).toLocaleDateString("en-US")}</span>
      </div>
      <h3>{item.title}</h3>
      <a className="source-link" href={item.url} target="_blank" rel="noreferrer">
        Open original <ExternalLink size={15} />
      </a>
      <p className="lead">{item.summary}</p>
      <section>
        <h4>Key Points</h4>
        <ul>
          {item.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Why It Matters</h4>
        <p>{item.whyItMatters}</p>
      </section>
      <section>
        <h4>Tags</h4>
        <div className="tag-row">
          {item.tags.map((tag) => (
            <span key={tag}>{labelTag(tag)}</span>
          ))}
        </div>
      </section>
      <section>
        <h4>AI Notes</h4>
        <p>{item.aiNotes}</p>
      </section>
    </article>
  );
}
