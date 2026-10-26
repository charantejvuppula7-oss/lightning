import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch as fetch } from "../../services/api/apiClient.js";
import { navigateToSearchResult } from "./searchNavigation.js";

// Quick Navigation System Pages
const QUICK_PAGES = [
  { id: "pm-overview", title: "Workspace Overview", path: "/pm/dashboard", icon: "space_dashboard", category: "pages", role: "pm" },
  { id: "pm-projects", title: "Projects Management", path: "/pm/projects", icon: "folder_open", category: "pages", role: "pm" },
  { id: "pm-users", title: "User Management", path: "/pm/users", icon: "group", category: "pages", role: "pm" },
  { id: "pm-approvals", title: "Approvals & Work Reviews", path: "/pm/approvals", icon: "fact_check", category: "pages", role: "pm" },
  { id: "pm-workload", title: "Team Workload", path: "/pm/workload", icon: "monitoring", category: "pages", role: "pm" },
  { id: "pm-roles", title: "Roles & Permissions", path: "/pm/roles-permissions", icon: "admin_panel_settings", category: "pages", role: "pm" },
  { id: "pm-tasks", title: "Tasks", path: "/tasks", icon: "assignment_turned_in", category: "pages", role: "pm" },
  { id: "pm-documents", title: "Documents", path: "/pm/documents", icon: "description", category: "pages", role: "pm" },
  { id: "pm-profile", title: "My Profile", path: "/pm/profile", icon: "account_circle", category: "pages", role: "pm" },

  { id: "admin-overview", title: "Administration Overview", path: "/admin/dashboard", icon: "space_dashboard", category: "pages", role: "admin" },
  { id: "admin-projects", title: "All Projects", path: "/admin/all-projects", icon: "folder_open", category: "pages", role: "admin" },
  { id: "admin-users", title: "Users & Accounts", path: "/admin/users", icon: "group", category: "pages", role: "admin" },
  { id: "admin-tasks", title: "Tasks", path: "/tasks", icon: "assignment_turned_in", category: "pages", role: "admin" },
  { id: "admin-documents", title: "Documents", path: "/admin/documents", icon: "description", category: "pages", role: "admin" },
  { id: "admin-roles", title: "Roles & Permissions", path: "/admin/roles-permissions", icon: "admin_panel_settings", category: "pages", role: "admin" },
  { id: "admin-audit", title: "Audit Logs", path: "/admin/audit-logs", icon: "history", category: "pages", role: "admin" },

  { id: "dev-dashboard", title: "My Dashboard", path: "/user/dashboard", icon: "space_dashboard", category: "pages", role: "developer" },
  { id: "dev-tasks", title: "Tasks", path: "/user/tasks", icon: "assignment", category: "pages", role: "developer" },
  { id: "dev-dependencies", title: "Dependencies", path: "/user/dashboard", state: { tab: "dependencies" }, icon: "account_tree", category: "pages", role: "developer" },
  { id: "dev-documents", title: "Documents", path: "/user/dashboard", state: { tab: "documents" }, icon: "description", category: "pages", role: "developer" },
  { id: "dev-calendar", title: "Calendar", path: "/user/calendar", state: { tab: "calendar" }, icon: "calendar_today", category: "pages", role: "developer" },
  { id: "dev-chat", title: "Chat", path: "/user/chat", icon: "chat", category: "pages", role: "developer" },
  { id: "dev-profile", title: "My Profile", path: "/user/profile", icon: "account_circle", category: "pages", role: "developer" },
];

export default function GlobalSearch({
  placeholder = "Search tasks, docs, people....",
  value: controlledValue,
  onChange: controlledOnChange,
  onSelectResult,
  localData = null,
  style = {},
  inputStyle = {},
  dropdownAlignment = "left",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const canSearchPeople =
    location.pathname === "/pm" ||
    location.pathname.startsWith("/pm/") ||
    location.pathname === "/admin" ||
    location.pathname.startsWith("/admin/");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [internalQuery, setInternalQuery] = useState("");
  const query = controlledValue !== undefined ? controlledValue : internalQuery;

  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Backend API Results
  const [apiResults, setApiResults] = useState({
    tasks: [],
    projects: [],
    people: [],
    documents: [],
  });

  // Recent Searches from localStorage
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("tachyon_recent_searches");
      return saved ? JSON.parse(saved) : ["Sprint 1", "API Integration", "Project Setup"];
    } catch {
      return ["Sprint 1", "API Integration", "Project Setup"];
    }
  });

  const updateQuery = (val) => {
    if (controlledOnChange) {
      controlledOnChange({ target: { value: val } });
    } else {
      setInternalQuery(val);
    }
  };

  const saveRecentSearch = useCallback((term) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    try {
      setRecentSearches((prev) => {
        const updated = [clean, ...prev.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
        localStorage.setItem("tachyon_recent_searches", JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.warn("Failed to persist recent search", e);
    }
  }, []);

  const removeRecentSearch = (e, termToRemove) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== termToRemove);
      setRecentSearches(updated);
      localStorage.setItem("tachyon_recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }
  };

  // ─── Fetch Results from Backend ──────────────────────────────────────
  useEffect(() => {
    if (!query || !query.trim() || query.trim().length < 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear stale results when the query is empty.
      setApiResults({ tasks: [], projects: [], people: [], documents: [] });
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/search/?q=${encodeURIComponent(query.trim())}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setApiResults({
            tasks: Array.isArray(data.tasks) ? data.tasks : [],
            projects: Array.isArray(data.projects) ? data.projects : [],
            people: Array.isArray(data.people) ? data.people : [],
            documents: Array.isArray(data.documents) ? data.documents : [],
          });
        }
      } catch (err) {
        console.error("Search API error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // ─── Client-side Matching (Local data fallback + Quick Pages) ─────────
  const matchingPages = useMemo(() => {
    const role = location.pathname.startsWith("/admin/")
      ? "admin"
      : location.pathname.startsWith("/pm/")
      ? "pm"
      : "developer";
    const pagesForRole = QUICK_PAGES.filter((page) => page.role === role);
    if (!query || !query.trim()) return pagesForRole;
    const q = query.toLowerCase().trim();
    return pagesForRole.filter(
      (p) => p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)
    );
  }, [location.pathname, query]);

  // Combine backend results with any parent-provided localData
  const combinedTasks = useMemo(() => {
    const list = [...apiResults.tasks];
    if (localData?.tasks && Array.isArray(localData.tasks) && query.trim()) {
      const q = query.toLowerCase().trim();
      localData.tasks.forEach((lt) => {
        const title = lt.Task_Name || lt.title || "";
        const desc = lt.description || "";
        const status = lt.Status || lt.status || "";
        const assignee = lt.Assignee || lt.assignee || "";
        if (
          title.toLowerCase().includes(q) ||
          desc.toLowerCase().includes(q) ||
          status.toLowerCase().includes(q) ||
          assignee.toLowerCase().includes(q)
        ) {
          const id = String(lt.Id || lt.id);
          if (!list.some((item) => String(item.id) === id)) {
            list.push({
              id,
              title,
              description: desc.slice(0, 100),
              status,
              project_name: lt.Project_Name || lt.project_name || "",
              project_code: lt.Project_Code || "",
              assignee,
              due_date: lt.Due_Date || lt.due_date,
              raw: lt,
            });
          }
        }
      });
    }
    if (localData?.dependencies && Array.isArray(localData.dependencies) && query.trim()) {
      const q = query.toLowerCase().trim();
      localData.dependencies.forEach((dep) => {
        const title = dep.whatsNeeded || dep.Description || dep.task || "";
        const desc = dep.blockingText || dep.Description || "";
        const assignee = dep.name || "";
        if (
          title.toLowerCase().includes(q) ||
          desc.toLowerCase().includes(q) ||
          assignee.toLowerCase().includes(q)
        ) {
          const id = String(dep.id || dep.Id);
          if (!list.some((item) => String(item.id) === id)) {
            list.push({
              id,
              title: `[Dependency] ${title.slice(0, 60)}`,
              description: desc.slice(0, 100),
              status: dep.status || "",
              project_name: dep.project_name || dep.Task?.Project_Name || "",
              project_code: "",
              assignee,
              due_date: dep.dueDate || dep.Due_Date,
              raw: dep,
              itemType: "dependency",
            });
          }
        }
      });
    }
    return list;
  }, [apiResults.tasks, localData, query]);

  const combinedProjects = useMemo(() => {
    const list = [...apiResults.projects];
    if (localData?.projects && Array.isArray(localData.projects) && query.trim()) {
      const q = query.toLowerCase().trim();
      localData.projects.forEach((lp) => {
        const name = lp.Project_Name || lp.name || "";
        const code = lp.Project_Code || lp.code || "";
        const desc = lp.Description || lp.description || "";
        if (name.toLowerCase().includes(q) || code.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
          const id = String(lp.Id || lp.id);
          if (!list.some((item) => String(item.id) === id)) {
            list.push({
              id,
              name,
              code,
              description: desc.slice(0, 100),
              customer: lp.Customer || lp.client || "General",
              raw: lp,
            });
          }
        }
      });
    }
    return list;
  }, [apiResults.projects, localData, query]);

  const combinedPeople = useMemo(() => {
    if (!canSearchPeople) return [];
    const list = [...apiResults.people];
    if (localData?.users && Array.isArray(localData.users) && query.trim()) {
      const q = query.toLowerCase().trim();
      localData.users.forEach((lu) => {
        const name = `${lu.First_Name || ""} ${lu.Last_Name || ""}`.trim() || lu.user_name || "";
        const email = lu.Email || lu.email || "";
        if (name.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
          const id = String(lu.Id || lu.id);
          if (!list.some((item) => String(item.id) === id)) {
            list.push({
              id,
              name,
              username: lu.user_name,
              email,
              role: lu.Role || lu.role || "member",
              designation: lu.Designation || lu.designation,
              raw: lu,
            });
          }
        }
      });
    }
    return list;
  }, [apiResults.people, canSearchPeople, localData, query]);

  const totalResultsCount =
    combinedTasks.length + combinedProjects.length + combinedPeople.length + apiResults.documents.length + (query.trim() ? matchingPages.length : 0);

  // Filter items by active tab
  const displayItems = useMemo(() => {
    const items = [];
    if (activeCategory === "all" || activeCategory === "tasks") {
      combinedTasks.forEach((t) => items.push({ ...t, itemType: t.itemType || "task" }));
    }
    if (activeCategory === "all" || activeCategory === "projects") {
      combinedProjects.forEach((p) => items.push({ ...p, itemType: "project" }));
    }
    if (activeCategory === "all" || activeCategory === "people") {
      combinedPeople.forEach((u) => items.push({ ...u, itemType: "person" }));
    }
    if (activeCategory === "all" || activeCategory === "documents") {
      apiResults.documents.forEach((d) => items.push({ ...d, itemType: "document" }));
    }
    if (activeCategory === "all" || activeCategory === "pages") {
      matchingPages.forEach((p) => items.push({ ...p, itemType: "page" }));
    }
    return items;
  }, [activeCategory, combinedTasks, combinedProjects, combinedPeople, apiResults.documents, matchingPages]);

  // Reset selected index when items change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset keyboard focus for a different query or category.
    setSelectedIndex(0);
  }, [activeCategory, query]);

  // ─── Click outside detection ──────────────────────────────────────────
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ─── Action on Result Select ──────────────────────────────────────────
  const handleItemSelect = useCallback((item) => {
    saveRecentSearch(query || item.title || item.name);
    setIsOpen(false);

    if (onSelectResult) {
      onSelectResult(item);
      return;
    }

    navigateToSearchResult(item, navigate);
  }, [navigate, onSelectResult, query, saveRecentSearch]);

  // ─── Keyboard Navigation (Ctrl+K, Esc, Arrows) ─────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < displayItems.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : displayItems.length - 1));
      } else if (e.key === "Enter") {
        if (displayItems[selectedIndex]) {
          e.preventDefault();
          handleItemSelect(displayItems[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, displayItems, selectedIndex, handleItemSelect]);

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    let bg = "var(--color-slate-100)";
    let color = "var(--color-slate-600)";
    let label = status || "started";

    if (s.includes("progress")) {
      bg = "var(--color-primary-subtle)";
      color = "var(--color-primary)";
      label = "In Progress";
    } else if (s.includes("complete")) {
      bg = "#ECFDF5";
      color = "#059669";
      label = "Completed";
    } else if (s.includes("review")) {
      bg = "#FDF4FF";
      color = "#9333EA";
      label = "In Review";
    } else if (s.includes("pause")) {
      bg = "#FFFBEB";
      color = "var(--color-warning-dark)";
      label = "Paused";
    }
    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: "600",
          padding: "2px 8px",
          borderRadius: "999px",
          backgroundColor: bg,
          color,
          whiteSpace: "nowrap",
          textTransform: "capitalize",
        }}
      >
        {label}
      </span>
    );
  };

  const getInitials = (name) => {
    if (!name) return "US";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      ref={containerRef}
      className="global-search-container"
      style={{
        position: "relative",
        width: "280px",
        fontFamily: "'Inter', sans-serif",
        ...style,
      }}
    >
      {/* ── Search Input Field ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--color-white)",
          border: isOpen ? "1.5px solid var(--color-primary)" : "1px solid var(--color-slate-200)",
          borderRadius: "8px",
          padding: "0 10px",
          height: "36px",
          boxShadow: isOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "0 1px 2px rgba(0, 0, 0, 0.04)",
          transition: "all 0.2s ease",
          boxSizing: "border-box",
          width: "100%",
          ...inputStyle,
        }}
      >
        {isLoading ? (
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "18px",
              color: "var(--color-primary)",
              marginRight: "8px",
              animation: "spin 1s linear infinite",
            }}
          >
            progress_activity
          </span>
        ) : (
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "18px",
              color: "var(--color-slate-400)",
              marginRight: "8px",
              flexShrink: 0,
            }}
          >
            search
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            updateQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "13px",
            color: "var(--color-slate-900)",
            width: "100%",
            fontFamily: "inherit",
          }}
        />

        {query ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateQuery("");
              inputRef.current?.focus();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              color: "var(--color-slate-400)",
              display: "flex",
              alignItems: "center",
            }}
            title="Clear"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              close
            </span>
          </button>
        ) : null}
      </div>

      {/* ── Dropdown Popover ─────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="global-search-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            [dropdownAlignment === "right" ? "right" : "left"]: 0,
            width: "clamp(380px, 45vw, 540px)",
            maxWidth: "92vw",
            backgroundColor: "var(--color-white)",
            border: "1px solid var(--color-slate-200)",
            borderRadius: "12px",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0,0,0,0.03)",
            zIndex: 9999,
            overflow: "hidden",
            animation: "fadeInDown 0.18s ease-out",
          }}
        >
          <style>{`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-6px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .search-item-hover:hover {
              background-color: var(--color-slate-50) !important;
            }
            .search-tab-btn {
              border: none;
              background: none;
              padding: 6px 12px;
              font-size: 12px;
              font-weight: 600;
              color: var(--color-slate-500);
              cursor: pointer;
              border-radius: 6px;
              display: flex;
              align-items: center;
              gap: 6px;
              transition: all 0.15s ease;
            }
            .search-tab-btn:hover {
              background-color: var(--color-slate-100);
              color: var(--color-slate-900);
            }
            .search-tab-btn.active {
              background-color: var(--color-primary-subtle);
              color: var(--color-primary);
              font-weight: 700;
            }
          `}</style>

          {/* Category Filter Tabs (when searching) */}
          {query.trim() && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "8px 12px",
                borderBottom: "1px solid var(--color-slate-100)",
                backgroundColor: "#FAFBFD",
                overflowX: "auto",
              }}
            >
              <button
                className={`search-tab-btn ${activeCategory === "all" ? "active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                <span>All</span>
                <span style={{ fontSize: "11px", opacity: 0.75 }}>({totalResultsCount})</span>
              </button>
              <button
                className={`search-tab-btn ${activeCategory === "tasks" ? "active" : ""}`}
                onClick={() => setActiveCategory("tasks")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  check_circle
                </span>
                <span>Tasks</span>
                <span style={{ fontSize: "11px", opacity: 0.75 }}>({combinedTasks.length})</span>
              </button>
              <button
                className={`search-tab-btn ${activeCategory === "projects" ? "active" : ""}`}
                onClick={() => setActiveCategory("projects")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  folder
                </span>
                <span>Projects</span>
                <span style={{ fontSize: "11px", opacity: 0.75 }}>({combinedProjects.length})</span>
              </button>
              {canSearchPeople && (
                <button
                  className={`search-tab-btn ${activeCategory === "people" ? "active" : ""}`}
                  onClick={() => setActiveCategory("people")}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                    person
                  </span>
                  <span>People</span>
                  <span style={{ fontSize: "11px", opacity: 0.75 }}>({combinedPeople.length})</span>
                </button>
              )}
              <button
                className={`search-tab-btn ${activeCategory === "documents" ? "active" : ""}`}
                onClick={() => setActiveCategory("documents")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  description
                </span>
                <span>Docs</span>
                <span style={{ fontSize: "11px", opacity: 0.75 }}>({apiResults.documents.length})</span>
              </button>
              <button
                className={`search-tab-btn ${activeCategory === "pages" ? "active" : ""}`}
                onClick={() => setActiveCategory("pages")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  navigation
                </span>
                <span>Pages</span>
              </button>
            </div>
          )}

          {/* ── Results Container ────────────────────────────────────── */}
          <div
            style={{
              maxHeight: "380px",
              overflowY: "auto",
              padding: "6px 0",
            }}
          >
            {/* If query is empty: Show Recent Searches & Quick Nav */}
            {!query.trim() ? (
              <div>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div style={{ padding: "8px 14px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: "var(--color-slate-400)",
                        letterSpacing: "0.5px",
                        marginBottom: "6px",
                      }}
                    >
                      Recent Searches
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          onClick={() => {
                            updateQuery(term);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            backgroundColor: "var(--color-slate-100)",
                            borderRadius: "16px",
                            fontSize: "12px",
                            color: "var(--color-slate-700)",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-slate-200)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-slate-100)")}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>
                            history
                          </span>
                          <span>{term}</span>
                          <span
                            className="material-symbols-outlined"
                            onClick={(e) => removeRecentSearch(e, term)}
                            style={{ fontSize: "13px", color: "var(--color-slate-400)", cursor: "pointer" }}
                            title="Remove"
                          >
                            close
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Navigation Pages */}
                <div style={{ padding: "8px 14px 4px 14px", borderTop: recentSearches.length > 0 ? "1px solid var(--color-slate-100)" : "none" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      color: "var(--color-slate-400)",
                      letterSpacing: "0.5px",
                      marginBottom: "6px",
                    }}
                  >
                    Quick Navigation
                  </div>
                  {matchingPages.slice(0, 6).map((page) => (
                    <div
                      key={page.id}
                      onClick={() => handleItemSelect(page)}
                      className="search-item-hover"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            backgroundColor: "var(--color-primary-subtle)",
                            color: "var(--color-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            {page.icon}
                          </span>
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--color-slate-800)" }}>
                          {page.title}
                        </span>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--color-slate-300)" }}>
                        arrow_forward
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : displayItems.length === 0 ? (
              /* Empty State */
              <div
                style={{
                  padding: "36px 20px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-slate-100)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-slate-400)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                    search_off
                  </span>
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-slate-800)" }}>
                  No results found for "{query}"
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-slate-500)", maxWidth: "300px" }}>
                  Try searching with a different keyword, project code, or teammate's name.
                </div>
              </div>
            ) : (
              /* Item List */
              displayItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.itemType}-${item.id || idx}`}
                    onClick={() => handleItemSelect(item)}
                    className="search-item-hover"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      backgroundColor: isSelected ? "var(--color-slate-50)" : "transparent",
                      cursor: "pointer",
                      borderLeft: isSelected ? "3px solid var(--color-primary)" : "3px solid transparent",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {/* Left: Icon & Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      {/* Icon / Avatar */}
                      {item.itemType === "task" && (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            backgroundColor: "var(--color-primary-subtle)",
                            color: "var(--color-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            check_circle
                          </span>
                        </div>
                      )}

                      {item.itemType === "project" && (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            backgroundColor: "#EEF2FF",
                            color: "#4F46E5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            folder
                          </span>
                        </div>
                      )}

                      {item.itemType === "person" && (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            backgroundColor: "var(--color-primary-light)",
                            color: "var(--color-white)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "11px",
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(item.name)}
                        </div>
                      )}

                      {item.itemType === "document" && (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            backgroundColor: "var(--color-warning-bg)",
                            color: "var(--color-warning-dark)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            description
                          </span>
                        </div>
                      )}

                      {item.itemType === "page" && (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            backgroundColor: "var(--color-slate-100)",
                            color: "var(--color-slate-600)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            {item.icon || "navigation"}
                          </span>
                        </div>
                      )}

                      {/* Text info */}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "var(--color-slate-900)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.title || item.name}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--color-slate-500)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginTop: "1px",
                          }}
                        >
                          {item.itemType === "task" && (
                            <>
                              {item.project_name || "Project"} {item.sprint_name ? `• ${item.sprint_name}` : ""}
                              {item.assignee ? ` • ${item.assignee}` : ""}
                            </>
                          )}
                          {item.itemType === "project" && (
                            <>
                              {item.code ? `[${item.code}] ` : ""}
                              {item.customer ? `• Client: ${item.customer}` : ""}
                            </>
                          )}
                          {item.itemType === "person" && (
                            <>
                              {item.designation || item.role} • {item.email}
                            </>
                          )}
                          {item.itemType === "document" && (
                            <>
                              {item.project_name ? `${item.project_name} • ` : ""}
                              {item.type || "Document"}
                            </>
                          )}
                          {item.itemType === "page" && (
                            <>
                              Jump to page
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Badges / Pill */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                      {item.itemType === "task" && getStatusBadge(item.status)}
                      {item.itemType === "project" && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor: "#EEF2FF",
                            color: "#4F46E5",
                          }}
                        >
                          Project
                        </span>
                      )}
                      {item.itemType === "person" && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            backgroundColor: "var(--color-slate-100)",
                            color: "var(--color-slate-600)",
                            textTransform: "capitalize",
                          }}
                        >
                          {item.role || "Member"}
                        </span>
                      )}
                      {item.itemType === "page" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "var(--color-slate-400)",
                            backgroundColor: "var(--color-slate-100)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Go
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div
            style={{
              padding: "8px 14px",
              borderTop: "1px solid var(--color-slate-100)",
              backgroundColor: "#FAFBFD",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "var(--color-slate-400)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>
                <strong style={{ color: "var(--color-slate-500)" }}>↑↓</strong> navigate
              </span>
              <span>
                <strong style={{ color: "var(--color-slate-500)" }}>↵</strong> select
              </span>
              <span>
                <strong style={{ color: "var(--color-slate-500)" }}>esc</strong> close
              </span>
            </div>
            {query && (
              <span>
                {totalResultsCount} result{totalResultsCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
