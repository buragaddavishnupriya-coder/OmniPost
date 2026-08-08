import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [userEmail, setUserEmail] = useState(localStorage.getItem("user_email") || "");
  const [authMode, setAuthMode] = useState("login"); // login or signup
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, editor, composer, calendar, analytics, automation, brand-voice

  // Additional multi-screen states
  const [allDrafts, setAllDrafts] = useState([]);
  
  // Composer states
  const [composerText, setComposerText] = useState("");
  const [composerPlatforms, setComposerPlatforms] = useState(["linkedin"]);
  const [composerDate, setComposerDate] = useState("");
  const [composerTime, setComposerTime] = useState("");
  const [isComposerSubmitting, setIsComposerSubmitting] = useState(false);

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Analytics states
  const [analyticsData, setAnalyticsData] = useState({
    kpis: { total_posts: 12, engagement_rate: "4.8%", follower_growth: "+12%" },
    charts: {
      engagement_over_time: [
        { date: "01 Oct", value: 150 },
        { date: "07 Oct", value: 120 },
        { date: "14 Oct", value: 140 },
        { date: "21 Oct", value: 100 },
        { date: "30 Oct", value: 180 }
      ],
      content_strategy: { video: 82, carousel: 65, static: 41, stories: 94 }
    },
    top_posts: []
  });

  // Agent Automation states
  const [agents, setAgents] = useState([]);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDescription, setNewAgentDescription] = useState("");
  const [newAgentPlatforms, setNewAgentPlatforms] = useState(["linkedin"]);
  const [newAgentFrequency, setNewAgentFrequency] = useState("Daily");

  // Dashboard Data
  const [stats, setStats] = useState({
    totalPosts: 12,
    engagementRate: "5.4%",
    followerGrowth: "+15%"
  });

  // Editor Data
  const [rawInput, setRawInput] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["linkedin", "twitter", "instagram"]);
  const [activeJob, setActiveJob] = useState(null);
  const [activeJobDrafts, setActiveJobDrafts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  
  // Feedback note for regeneration
  const [regenFeedback, setRegenFeedback] = useState({});

  // Settings States
  const [settingsApiKey, setSettingsApiKey] = useState("");
  const [settingsModel, setSettingsModel] = useState("gemini-2.5-flash");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeLlmModel, setActiveLlmModel] = useState("gemini-2.5-flash");

  // Brand Voice Data
  const [brandVoice, setBrandVoice] = useState({
    tone_descriptors: [],
    avoid_phrases: [],
    gold_examples: []
  });
  const [newTone, setNewTone] = useState("");
  const [newAvoid, setNewAvoid] = useState("");

  // Polling ref for job execution
  const pollingIntervalRef = useRef(null);

  // Authenticate headers
  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // Fetch functions for backend sync
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/settings`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettingsApiKey(data.gemini_api_key || "");
        setSettingsModel(data.preferred_model);
        setActiveLlmModel(data.preferred_model);
        setHasApiKey(data.gemini_api_key ? true : false);
      }
    } catch (err) {
      console.error("Error fetching user settings", err);
    }
  };

  const fetchDrafts = async () => {
    try {
      const res = await fetch(`${API_BASE}/drafts`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllDrafts(data);
      }
    } catch (err) {
      console.error("Error fetching drafts", err);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/agents`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error("Error fetching agents", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/overview`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Error fetching analytics", err);
    }
  };

  // Check login state
  useEffect(() => {
    if (token) {
      fetchBrandVoice();
      fetchDrafts();
      fetchAgents();
      fetchAnalytics();
      fetchSettings();
    }
  }, [token]);

  // Tab dynamic loading
  useEffect(() => {
    if (token) {
      if (activeTab === "calendar" || activeTab === "dashboard") {
        fetchDrafts();
      } else if (activeTab === "automation") {
        fetchAgents();
      } else if (activeTab === "analytics") {
        fetchAnalytics();
      } else if (activeTab === "settings") {
        fetchSettings();
      }
    }
  }, [activeTab, token]);

  // Clean polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    setToken(null);
    setUserEmail("");
    setActiveJob(null);
    setActiveJobDrafts([]);
    setAllDrafts([]);
    setAgents([]);
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/users/settings/test`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          gemini_api_key: settingsApiKey,
          preferred_model: settingsModel
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ status: "success", message: data.message });
      } else {
        setTestResult({ status: "error", message: data.detail || "Connection test failed." });
      }
    } catch (err) {
      console.error(err);
      setTestResult({ status: "error", message: "Network error during connection test." });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSaveResult(null);
    try {
      const res = await fetch(`${API_BASE}/users/settings`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          gemini_api_key: settingsApiKey,
          preferred_model: settingsModel
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveResult({ status: "success", message: "Settings saved successfully!" });
        setSettingsApiKey(data.gemini_api_key || "");
        setSettingsModel(data.preferred_model);
        setActiveLlmModel(data.preferred_model);
        setHasApiKey(data.gemini_api_key ? true : false);
        setTimeout(() => setSaveResult(null), 3000);
      } else {
        setSaveResult({ status: "error", message: data.detail || "Failed to save settings." });
      }
    } catch (err) {
      console.error(err);
      setSaveResult({ status: "error", message: "Network error saving settings." });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Composer post creation
  const handleComposerSubmit = async (isPublishNow) => {
    if (!composerText.trim() || composerPlatforms.length === 0) return;
    setIsComposerSubmitting(true);
    
    let scheduled_time = null;
    if (!isPublishNow && composerDate) {
      scheduled_time = new Date(`${composerDate}T${composerTime || "12:00"}`).toISOString();
    }
    
    try {
      const res = await fetch(`${API_BASE}/drafts`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          body_text: composerText,
          platforms: composerPlatforms,
          scheduled_time
        })
      });
      
      if (res.ok) {
        setComposerText("");
        setComposerDate("");
        setComposerTime("");
        fetchDrafts();
        setActiveTab("calendar"); // Redirect to Calendar tab
      }
    } catch (err) {
      console.error("Error creating manual post", err);
    } finally {
      setIsComposerSubmitting(false);
    }
  };

  // Calendar rescheduling
  const handleRescheduleDraft = async (draftId, newDateStr) => {
    try {
      const res = await fetch(`${API_BASE}/drafts/${draftId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          scheduled_time: new Date(`${newDateStr}T12:00:00`).toISOString()
        })
      });
      if (res.ok) {
        fetchDrafts();
      }
    } catch (err) {
      console.error("Error rescheduling draft", err);
    }
  };

  // Automation toggles and deployment
  const handleToggleAgent = async (agentId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: nextStatus } : a));
    
    try {
      await fetch(`${API_BASE}/agents/${agentId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.error("Error toggling agent", err);
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: currentStatus } : a));
    }
  };

  const handleDeployAgent = async () => {
    if (!newAgentName.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/agents`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: newAgentName,
          description: newAgentDescription,
          platforms: newAgentPlatforms,
          frequency: newAgentFrequency
        })
      });
      if (res.ok) {
        setNewAgentName("");
        setNewAgentDescription("");
        setNewAgentPlatforms(["linkedin"]);
        setNewAgentFrequency("Daily");
        setIsCreateAgentOpen(false);
        fetchAgents();
      }
    } catch (err) {
      console.error("Error creating agent", err);
    }
  };


  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    const url = authMode === "login" ? `${API_BASE}/auth/login` : `${API_BASE}/auth/signup`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }
      
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_email", emailInput);
      setToken(data.access_token);
      setUserEmail(emailInput);
      setEmailInput("");
      setPasswordInput("");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const fetchBrandVoice = async () => {
    try {
      const res = await fetch(`${API_BASE}/brand-voice-profile`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBrandVoice(data);
      }
    } catch (err) {
      console.error("Error fetching voice profile", err);
    }
  };

  const saveBrandVoice = async (updatedVoice) => {
    try {
      const res = await fetch(`${API_BASE}/brand-voice-profile`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(updatedVoice)
      });
      if (res.ok) {
        const data = await res.json();
        setBrandVoice(data);
      }
    } catch (err) {
      console.error("Error saving brand voice", err);
    }
  };

  const handleAddTone = () => {
    if (newTone.trim()) {
      const updated = {
        ...brandVoice,
        tone_descriptors: [...brandVoice.tone_descriptors, newTone.trim()]
      };
      setBrandVoice(updated);
      saveBrandVoice(updated);
      setNewTone("");
    }
  };

  const handleRemoveTone = (index) => {
    const updated = {
      ...brandVoice,
      tone_descriptors: brandVoice.tone_descriptors.filter((_, i) => i !== index)
    };
    setBrandVoice(updated);
    saveBrandVoice(updated);
  };

  const handleAddAvoid = () => {
    if (newAvoid.trim()) {
      const updated = {
        ...brandVoice,
        avoid_phrases: [...brandVoice.avoid_phrases, newAvoid.trim()]
      };
      setBrandVoice(updated);
      saveBrandVoice(updated);
      setNewAvoid("");
    }
  };

  const handleRemoveAvoid = (index) => {
    const updated = {
      ...brandVoice,
      avoid_phrases: brandVoice.avoid_phrases.filter((_, i) => i !== index)
    };
    setBrandVoice(updated);
    saveBrandVoice(updated);
  };

  // Content Job Creation & Polling
  const triggerContentJob = async () => {
    if (!rawInput.trim()) return;
    setIsProcessing(true);
    setActiveJobDrafts([]);
    
    try {
      const res = await fetch(`${API_BASE}/content-jobs`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          raw_input: rawInput,
          platforms: selectedPlatforms
        })
      });
      
      if (!res.ok) throw new Error("Failed to start content job");
      
      const job = await res.json();
      setActiveJob(job);
      
      // Start polling
      startPollingJob(job.id);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const startPollingJob = (jobId) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/content-jobs/${jobId}`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const job = await res.json();
          setActiveJob(job);
          setActiveJobDrafts(job.drafts || []);
          
          if (job.drafts && job.drafts.length > 0 && !selectedDraftId) {
            setSelectedDraftId(job.drafts[0].id);
          }

          if (job.status === "completed" || job.status === "failed") {
            clearInterval(pollingIntervalRef.current);
            setIsProcessing(false);
            fetchBrandVoice(); // Reload brand voice in case any quick updates happened
            setStats(prev => ({
              ...prev,
              totalPosts: prev.totalPosts + job.drafts.length
            }));
          }
        }
      } catch (err) {
        console.error("Error polling job", err);
        clearInterval(pollingIntervalRef.current);
        setIsProcessing(false);
      }
    }, 2000);
  };

  const handleUpdateDraftText = async (draftId, newText) => {
    // Update local state first for instant responsiveness
    setActiveJobDrafts(prev => prev.map(d => d.id === draftId ? { ...d, body_text: newText } : d));
    
    try {
      const res = await fetch(`${API_BASE}/drafts/${draftId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ body_text: newText })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveJobDrafts(prev => prev.map(d => d.id === draftId ? updated : d));
      }
    } catch (err) {
      console.error("Error updating draft text", err);
    }
  };

  const handleRegenerateDraft = async (draftId) => {
    const feedback = regenFeedback[draftId] || "";
    if (!feedback.trim()) return;

    // Set draft state to optimizing
    setActiveJobDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: "optimizing" } : d));

    try {
      const res = await fetch(`${API_BASE}/drafts/${draftId}/regenerate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ feedback })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveJobDrafts(prev => prev.map(d => d.id === draftId ? updated : d));
        setRegenFeedback(prev => ({ ...prev, [draftId]: "" }));
        fetchBrandVoice();
      }
    } catch (err) {
      console.error("Error regenerating draft", err);
    }
  };

  const handleApproveDraft = async (draftId) => {
    try {
      const res = await fetch(`${API_BASE}/drafts/${draftId}/approve`, {
        method: "POST",
        headers: getHeaders()
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveJobDrafts(prev => prev.map(d => d.id === draftId ? updated : d));
        fetchBrandVoice(); // Learned brand voice profile has been updated!
      }
    } catch (err) {
      console.error("Error approving draft", err);
    }
  };

  const handlePublishDraft = async (draftId) => {
    try {
      const res = await fetch(`${API_BASE}/drafts/${draftId}/publish`, {
        method: "POST",
        headers: getHeaders()
      });
      if (res.ok) {
        // Refresh job drafts
        if (activeJob) {
          const jobRes = await fetch(`${API_BASE}/content-jobs/${activeJob.id}`, {
            headers: getHeaders()
          });
          if (jobRes.ok) {
            const updatedJob = await jobRes.json();
            setActiveJobDrafts(updatedJob.drafts || []);
          }
        }
      }
    } catch (err) {
      console.error("Error publishing draft", err);
    }
  };

  // Helper: Status tag classes
  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case "drafting":
      case "critiquing":
      case "optimizing":
      case "analyzing":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">In Review ({status})</span>;
      case "awaiting_approval":
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Awaiting Approval</span>;
      case "approved":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Approved</span>;
      case "published":
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Published</span>;
      case "gated":
      case "failed":
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Gated / Failed</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{status}</span>;
    }
  };

  // Platform specific icon/color mapping
  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case "instagram": return { icon: "photo_camera", color: "text-pink-500" };
      case "twitter": return { icon: "close", color: "text-slate-200" };
      case "linkedin": return { icon: "work", color: "text-sky-500" };
      case "youtube": return { icon: "play_circle", color: "text-red-500" };
      case "facebook": return { icon: "social_leaderboard", color: "text-blue-500" };
      case "reddit": return { icon: "forum", color: "text-orange-500" };
      default: return { icon: "share", color: "text-gray-400" };
    }
  };

  // Prepopulate Curator prompt and jump to editor
  const handleCuratorGenerate = (topicText) => {
    setRawInput(topicText);
    setActiveTab("editor");
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-[#2b3437] flex flex-col justify-center items-center px-4 font-body">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-[0_12px_40px_-12px_rgba(43,52,55,0.08)] border border-slate-200/60 relative overflow-hidden">
          
          <div className="text-center mb-8 relative z-10">
            <div className="flex justify-center items-center gap-2 text-3xl font-black text-slate-900 tracking-tight font-headline">
              <div className="w-9 h-9 rounded-lg bg-[#005ac2] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-lg">hub</span>
              </div>
              <span>OmniPost</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">Say it once. We shape it for everywhere.</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 relative z-10">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === "login" ? "bg-white text-[#005ac2] shadow" : "text-slate-500 hover:text-slate-800"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === "signup" ? "bg-white text-[#005ac2] shadow" : "text-slate-500 hover:text-slate-800"}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 relative z-10">
            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                {authError}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-[#005ac2]/40 transition-all text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-[#005ac2]/40 transition-all text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#005ac2] hover:bg-[#004fab] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-md active:scale-98 transition-all font-headline mt-6"
            >
              {authMode === "login" ? "Launch Workspace" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const selectedDraft = activeJobDrafts.find(d => d.id === selectedDraftId);

  const isDarkTab = false;
  const mainClass = isDarkTab
    ? "min-h-screen bg-[#131314] text-[#e5e2e3] font-body flex overflow-hidden w-full"
    : "min-h-screen bg-[#f8f9fa] text-[#2b3437] font-body flex overflow-hidden w-full";
  
  const sidebarClass = isDarkTab
    ? "w-64 bg-[#1c1b1c] flex flex-col p-6 border-r border-outline-variant/10 shadow-[40px_0_40px_rgba(225,253,255,0.01)] flex-shrink-0"
    : "w-64 bg-slate-50 flex flex-col p-6 border-r border-slate-200/50 flex-shrink-0";

  const sidebarButtonClass = (tab) => {
    const isActive = activeTab === tab;
    if (isDarkTab) {
      return `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 font-headline ${
        isActive ? "text-[#00f2ff] bg-[#353436]" : "text-gray-400 hover:text-white hover:bg-[#2a2a2b]"
      }`;
    } else {
      return `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 font-headline ${
        isActive ? "text-[#005ac2] bg-[#e2e9ec]" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
      }`;
    }
  };
  
  const headerClass = isDarkTab
    ? "h-20 bg-[#131314]/40 backdrop-blur-xl border-b border-outline-variant/5 flex items-center justify-between px-8 sticky top-0 z-30"
    : "h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-30";

  return (
    <div className={mainClass}>
      
      {/* Sidebar Navigation */}
      <aside className={sidebarClass}>
        <div className="mb-10 flex items-center gap-2">
          {isDarkTab ? (
            <span className="text-2xl font-bold bg-gradient-to-br from-[#00f2ff] to-[#7000ff] bg-clip-text text-transparent font-headline tracking-tight">OmniPost</span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#005ac2] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-lg">hub</span>
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">OmniPost</span>
            </div>
          )}
        </div>
        
        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={sidebarButtonClass("dashboard")}>
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>
          <button onClick={() => setActiveTab("editor")} className={sidebarButtonClass("editor")}>
            <span className="material-symbols-outlined">auto_awesome</span>
            <span>AI Studio</span>
          </button>
          <button onClick={() => setActiveTab("composer")} className={sidebarButtonClass("composer")}>
            <span className="material-symbols-outlined">edit_note</span>
            <span>Create Post</span>
          </button>
          <button onClick={() => setActiveTab("calendar")} className={sidebarButtonClass("calendar")}>
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Schedule</span>
          </button>
          <button onClick={() => setActiveTab("analytics")} className={sidebarButtonClass("analytics")}>
            <span className="material-symbols-outlined">bar_chart</span>
            <span>Analytics</span>
          </button>
          <button onClick={() => setActiveTab("automation")} className={sidebarButtonClass("automation")}>
            <span className="material-symbols-outlined">smart_toy</span>
            <span>Automation</span>
          </button>
          <button onClick={() => setActiveTab("brand-voice")} className={sidebarButtonClass("brand-voice")}>
            <span className="material-symbols-outlined">psychology</span>
            <span>Brand Voice</span>
          </button>
          <button onClick={() => setActiveTab("settings")} className={sidebarButtonClass("settings")}>
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button>
        </nav>

        <div className={`mt-auto border-t pt-4 ${isDarkTab ? "border-outline-variant/10" : "border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-4 px-2">
            <span className="material-symbols-outlined text-gray-500 text-sm">account_circle</span>
            <span className={`text-xs truncate ${isDarkTab ? "text-gray-400" : "text-slate-600"}`}>{userEmail}</span>
          </div>
          <button
            onClick={handleLogout}
            className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              isDarkTab 
                ? "bg-surface-container-high hover:bg-surface-container-highest text-gray-300 hover:text-white" 
                : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-950"
            }`}
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className={headerClass}>
          <div>
            <h1 className="text-xl font-bold font-headline">
              {activeTab === "dashboard" && "Dashboard Overview"}
              {activeTab === "editor" && "AI Content Studio"}
              {activeTab === "composer" && "Create Post Interface"}
              {activeTab === "calendar" && "Content Calendar Scheduler"}
              {activeTab === "analytics" && "OmniPost Aura Analytics"}
              {activeTab === "automation" && "AgentFlow Fleet Dashboard"}
              {activeTab === "brand-voice" && "Brand Voice Learning Hub"}
              {activeTab === "settings" && "Workspace Settings"}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <span className={`text-xs border px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold ${
              isDarkTab 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              FastAPI Gateway Connected
            </span>
          </div>
        </header>

        {/* Central Content */}
        <div className="p-8 max-w-7xl w-full mx-auto flex-1">

          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fadeIn text-[#2b3437]">
              
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#005ac2]/5 rounded-full blur-3xl"></div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Posts Scheduled / Sent</p>
                  <h3 className="text-4xl font-headline font-bold text-slate-800">{analyticsData.kpis.total_posts}</h3>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#005ac2] font-semibold">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>Synchronized to DB profiles</span>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#7000ff]/5 rounded-full blur-3xl"></div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Avg Engagement Score</p>
                  <h3 className="text-4xl font-headline font-bold text-[#7000ff]">{analyticsData.kpis.engagement_rate}</h3>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#7000ff] font-semibold">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>Injected Critique Loops</span>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#e8c423]/5 rounded-full blur-3xl"></div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Brand Voice Alignment</p>
                  <h3 className="text-4xl font-headline font-bold text-amber-600">{analyticsData.kpis.follower_growth}</h3>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    <span>Diff Memory Correction</span>
                  </div>
                </div>
              </div>

              {/* Connected Platforms & Pipeline Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left side: Connected Platforms and Pipeline */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Connected Platforms */}
                  <section className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-6">
                    <h2 className="text-lg font-headline font-bold flex items-center gap-2 text-slate-800">
                      <span className="material-symbols-outlined text-[#005ac2]">link</span>
                      <span>Connected Platforms</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { name: "Instagram", icon: "photo_camera", color: "from-pink-500 via-red-500 to-yellow-500", connected: true },
                        { name: "LinkedIn", icon: "work", color: "bg-sky-500", connected: true },
                        { name: "Twitter (X)", icon: "close", color: "bg-slate-700", connected: true },
                        { name: "Facebook", icon: "social_leaderboard", color: "bg-gray-800", connected: false }
                      ].map((plat, idx) => (
                        <div key={idx} className={`glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center gap-3 ${!plat.connected ? "opacity-50" : ""}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${plat.color} shadow-sm`}>
                            <span className="material-symbols-outlined text-xl">{plat.icon}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{plat.name}</p>
                            <span className={`text-[9px] flex items-center justify-center gap-1 mt-0.5 ${plat.connected ? "text-[#005ac2]" : "text-slate-400"}`}>
                              <span className={`w-1 h-1 rounded-full ${plat.connected ? "bg-[#005ac2]" : "bg-slate-400"}`}></span> 
                              {plat.connected ? "Connected" : "Disconnected"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Scheduled Posts Pipeline */}
                  <section className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-headline font-bold flex items-center gap-2 text-slate-800">
                        <span className="material-symbols-outlined text-[#005ac2]">schedule</span>
                        <span>Upcoming Pipeline</span>
                      </h2>
                      <button onClick={() => setActiveTab("calendar")} className="text-xs text-[#005ac2] hover:underline font-bold">View Calendar</button>
                    </div>

                    <div className="space-y-4">
                      {allDrafts.filter(d => d.status !== "published").slice(0, 3).length > 0 ? (
                        allDrafts.filter(d => d.status !== "published").slice(0, 3).map((draft, idx) => {
                          const platInfo = getPlatformIcon(draft.platform);
                          return (
                            <div key={idx} className="glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-200">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100 text-white`}>
                                <span className={`material-symbols-outlined text-2xl ${platInfo.color}`}>{platInfo.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded uppercase font-bold tracking-wider capitalize">
                                  {draft.platform}
                                </span>
                                <h4 className="font-semibold text-sm truncate mt-1 text-slate-700">{draft.body_text || "Empty draft content"}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {draft.scheduled_time 
                                    ? `Scheduled: ${new Date(draft.scheduled_time).toLocaleString()}` 
                                    : "Draft - unscheduled"}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-500 italic">
                          No upcoming drafts. Click "Create Post" to compose one manually or "AI Studio" to run the generator!
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right side: AI suggestions */}
                <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-headline font-bold flex items-center gap-2 mb-6 text-slate-800">
                      <span className="material-symbols-outlined text-[#7000ff]">auto_awesome</span>
                      <span>AI Curator Ideas</span>
                    </h2>
                    <div className="space-y-4">
                      {[
                        {
                          title: "SaaS Launch Announcement",
                          text: "Announcing Omnipost, the autonomous AI social media workspace that trains itself on your exact brand voice over time."
                        },
                        {
                          title: "Why One-Shot LLMs Fail Brand Voice",
                          text: "One-shot social generators sound generic. Explain why you need an active Critic-Optimizer pipeline to preserve nuance."
                        }
                      ].map((idea, index) => (
                        <div key={index} className="glass-panel p-4 rounded-xl space-y-3 hover:translate-y-[-2px] transition-transform">
                          <div>
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Curated Match</span>
                            <h4 className="text-sm font-bold text-slate-800 mt-1 font-headline">{idea.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{idea.text}</p>
                          <button
                            onClick={() => handleCuratorGenerate(idea.text)}
                            className="w-full bg-[#005ac2] hover:bg-[#004fab] text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">bolt</span>
                            <span>Shape This Post</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI CONTENT STUDIO */}
          {activeTab === "editor" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn text-[#2b3437]">
              
              {/* Left Column: Input + Output Workspace */}
              <div className="lg:col-span-7 space-y-6">

                {/* LLM Engine Status Alert */}
                <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 transition-all ${
                  hasApiKey 
                    ? "bg-emerald-50 text-emerald-855 border-emerald-200/80" 
                    : "bg-amber-50 text-amber-855 border-amber-200/80"
                }`}>
                  <span className={`material-symbols-outlined text-lg ${hasApiKey ? "text-emerald-600" : "text-amber-600"}`}>
                    {hasApiKey ? "verified" : "info"}
                  </span>
                  <div className="flex-1">
                    {hasApiKey ? (
                      <p className="font-semibold text-emerald-800">
                        Real Gemini LLM Connection Active: <span className="font-mono bg-emerald-100/50 px-1.5 py-0.5 rounded text-emerald-900">{activeLlmModel}</span>
                      </p>
                    ) : (
                      <p className="font-semibold text-amber-800">
                        Running in Mock Mode: <span className="text-amber-900 font-normal">No Gemini API Key configured. Please go to the <button onClick={() => setActiveTab("settings")} className="underline font-bold text-[#005ac2] hover:text-[#004fab] cursor-pointer">Settings</button> tab to connect Gemini LLM.</span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Input box */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Content Intent / Raw Input</h3>
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Enter your content intent. It could be a topic, draft, voice note transcript, or product description..."
                    className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-1 focus:ring-[#005ac2]/40 transition-all text-slate-800 resize-none"
                    disabled={isProcessing}
                  />

                  {/* Platforms selection */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Platforms</span>
                    <div className="flex flex-wrap gap-2">
                      {["linkedin", "twitter", "instagram", "youtube", "facebook", "reddit"].map(plat => (
                        <button
                          key={plat}
                          onClick={() => {
                            if (selectedPlatforms.includes(plat)) {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== plat));
                            } else {
                              setSelectedPlatforms([...selectedPlatforms, plat]);
                            }
                          }}
                          disabled={isProcessing}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 capitalize transition-all ${selectedPlatforms.includes(plat) ? "bg-slate-100 text-[#005ac2] border-[#005ac2]/40 shadow-sm" : "bg-transparent text-slate-500 border-slate-200 hover:bg-slate-55"}`}
                        >
                          <span className={`material-symbols-outlined text-sm ${getPlatformIcon(plat).color}`}>{getPlatformIcon(plat).icon}</span>
                          <span>{plat}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={triggerContentJob}
                    disabled={isProcessing || !rawInput.trim() || selectedPlatforms.length === 0}
                    className={`w-full py-3.5 rounded-xl font-bold font-headline text-sm flex items-center justify-center gap-2 transition-all ${isProcessing ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" : "bg-[#005ac2] hover:bg-[#004fab] text-white shadow-md active:scale-98"}`}
                  >
                    {isProcessing ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">refresh</span>
                        <span>Agents Orchestrating (Check Pipeline)...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">auto_modes</span>
                        <span>Launch Multi-Agent Pipeline</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Pipeline visual progress (if active job exists) */}
                {activeJob && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Agent Pipelines Status</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${activeJob.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : activeJob.status === "failed" ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"}`}>
                        Job status: {activeJob.status}
                      </span>
                    </div>

                    {/* Horizontal state flowchart */}
                    <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold text-slate-400">
                      <div className={`p-2 rounded-lg border ${activeJob.status !== "pending" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 border-slate-200"}`}>
                        1. Strategy
                      </div>
                      <div className={`p-2 rounded-lg border ${activeJobDrafts.some(d => ["critiquing", "optimizing", "analyzing", "awaiting_approval", "approved", "published"].includes(d.status)) ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 border-slate-200"}`}>
                        2. Writing
                      </div>
                      <div className={`p-2 rounded-lg border ${activeJobDrafts.some(d => ["optimizing", "analyzing", "awaiting_approval", "approved", "published"].includes(d.status)) ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 border-slate-200"}`}>
                        3. Critic Loop
                      </div>
                      <div className={`p-2 rounded-lg border ${activeJobDrafts.some(d => ["analyzing", "awaiting_approval", "approved", "published"].includes(d.status)) ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 border-slate-200"}`}>
                        4. Analytics
                      </div>
                      <div className={`p-2 rounded-lg border ${activeJobDrafts.some(d => ["awaiting_approval", "approved", "published"].includes(d.status)) ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 border-slate-200"}`}>
                        5. Quality Gate
                      </div>
                    </div>
                  </div>
                )}

                {/* Drafts outputs workspace */}
                {activeJobDrafts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Platform Drafts</h3>
                    
                    {/* Platform Selector Tabs */}
                    <div className="flex border-b border-slate-200">
                      {activeJobDrafts.map(draft => {
                        const platInfo = getPlatformIcon(draft.platform);
                        return (
                          <button
                            key={draft.id}
                            onClick={() => setSelectedDraftId(draft.id)}
                            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all capitalize ${selectedDraftId === draft.id ? "border-[#005ac2] text-[#005ac2]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                          >
                            <span className={`material-symbols-outlined text-sm ${platInfo.color}`}>{platInfo.icon}</span>
                            <span>{draft.platform}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">V{draft.version}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Draft Details Card */}
                    {selectedDraft && (
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-xl ${getPlatformIcon(selectedDraft.platform).color}`}>{getPlatformIcon(selectedDraft.platform).icon}</span>
                            <span className="font-bold font-headline capitalize text-slate-800">{selectedDraft.platform} Draft Workspace</span>
                          </div>
                          {getStatusBadge(selectedDraft.status)}
                        </div>

                        {/* Editable Post Body Textarea */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                            <span>Draft Text (Editable)</span>
                            <span>{selectedDraft.body_text?.length || 0} characters</span>
                          </div>
                          <textarea
                            value={selectedDraft.body_text || ""}
                            onChange={(e) => handleUpdateDraftText(selectedDraft.id, e.target.value)}
                            className="w-full min-h-[160px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-1 focus:ring-[#005ac2]/40 transition-all text-slate-800 resize-none"
                            placeholder="Write draft content..."
                          />
                        </div>

                        {/* Critique History */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critique & Improvement Logs</h5>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 max-h-[120px] overflow-y-auto">
                            {selectedDraft.critique_history && selectedDraft.critique_history.length > 0 ? (
                              selectedDraft.critique_history.map((crit, idx) => (
                                <p key={idx} className="text-xs text-slate-600 leading-relaxed font-mono">
                                  {crit}
                                </p>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic">No critiques recorded yet.</p>
                            )}
                          </div>
                        </div>

                        {/* Custom Instruction Box to Regenerate */}
                        {["awaiting_approval", "gated"].includes(selectedDraft.status) && (
                          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3">
                            <label className="text-xs font-bold text-slate-500 block">Feedback-Driven Agent Regeneration</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={regenFeedback[selectedDraft.id] || ""}
                                onChange={(e) => setRegenFeedback(prev => ({ ...prev, [selectedDraft.id]: e.target.value }))}
                                placeholder="Tell the agent what to fix (e.g., 'Make it more funny', 'Include 2 extra hashtags')..."
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#005ac2]/40 transition-all text-slate-800"
                              />
                              <button
                                onClick={() => handleRegenerateDraft(selectedDraft.id)}
                                disabled={!(regenFeedback[selectedDraft.id] || "").trim()}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">refresh</span>
                                <span>Refine</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex justify-between items-center border-t border-slate-150 pt-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500 text-sm">analytics</span>
                            <span className="text-xs font-semibold text-slate-500">Analytic Score: </span>
                            <span className="text-sm font-bold text-indigo-600">{selectedDraft.quality_score} / 10</span>
                          </div>

                          <div className="flex gap-3">
                            {selectedDraft.status === "awaiting_approval" && (
                              <button
                                onClick={() => handleApproveDraft(selectedDraft.id)}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_4px_12px_rgba(16,185,129,0.3)] text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                <span>Approve & Learn Voice</span>
                              </button>
                            )}

                            {selectedDraft.status === "approved" && (
                              <button
                                onClick={() => handlePublishDraft(selectedDraft.id)}
                                className="px-6 py-2 bg-teal-600 hover:bg-teal-500 hover:shadow-[0_4px_12px_rgba(20,184,166,0.3)] text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">send</span>
                                <span>Publish Post</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Live Mockup Preview */}
              <div className="lg:col-span-5">
                <div className="sticky top-28 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Preview Mockup</label>
                    <span className="text-[10px] text-slate-400 italic">Self-scaling layout</span>
                  </div>

                  {selectedDraft ? (
                    <div className="bg-white text-slate-800 rounded-3xl overflow-hidden shadow-md border border-slate-200">
                      
                      {/* Social Header details */}
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-[#005ac2]">
                            {userEmail.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{userEmail.split('@')[0]}</p>
                            <p className="text-[9px] text-slate-400 capitalize">{selectedDraft.platform} Publisher</p>
                          </div>
                        </div>
                        <span className={`material-symbols-outlined text-xl ${getPlatformIcon(selectedDraft.platform).color}`}>{getPlatformIcon(selectedDraft.platform).icon}</span>
                      </div>

                      {/* Draft Content body formatted with linebreaks */}
                      <div className="p-5 min-h-[220px] whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
                        {selectedDraft.body_text || "Orchestrator hasn't populated this draft text yet..."}
                      </div>

                      {/* Footer mock interactions */}
                      <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-medium">
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1 cursor-default hover:text-slate-600"><span className="material-symbols-outlined text-sm">favorite</span> Like</span>
                          <span className="flex items-center gap-1 cursor-default hover:text-slate-600"><span className="material-symbols-outlined text-sm">chat_bubble</span> Comment</span>
                        </div>
                        <span className="text-[10px]">Autosaved to SQLite DB</span>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-8 text-center text-slate-400 min-h-[300px] flex flex-col justify-center items-center gap-3 border border-dashed border-slate-200 shadow-sm">
                      <span className="material-symbols-outlined text-4xl text-slate-350">visibility</span>
                      <p className="text-sm">Submit your input topic on the left to see live previews generated across platforms.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CREATE POST COMPOSER */}
          {activeTab === "composer" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fadeIn text-[#2b3437]">
              
              {/* Left Column: Composer */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Composition</label>
                    <span className="text-xs text-slate-400">{composerText.length} characters</span>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                    <textarea
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      placeholder="What's on your mind? Type a draft, use #hashtags..."
                      className="w-full min-h-[160px] border-none focus:ring-0 text-slate-800 placeholder-slate-400 resize-none text-base p-0"
                    />
                  </div>
                </div>

                {/* Platform selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Publishing To</label>
                  <div className="flex flex-wrap gap-3">
                    {["instagram", "linkedin", "twitter", "facebook"].map(plat => {
                      const platInfo = getPlatformIcon(plat);
                      const isSelected = composerPlatforms.includes(plat);
                      return (
                        <button
                          key={plat}
                          onClick={() => {
                            if (composerPlatforms.includes(plat)) {
                              setComposerPlatforms(composerPlatforms.filter(p => p !== plat));
                            } else {
                              setComposerPlatforms([...composerPlatforms, plat]);
                            }
                          }}
                          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold ${
                            isSelected 
                              ? "bg-white border-[#005ac2] text-[#005ac2] shadow-sm" 
                              : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-base ${platInfo.color}`}>{platInfo.icon}</span>
                          <span className="capitalize">{plat}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#005ac2]"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scheduling Settings */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500">schedule</span>
                    <span>Scheduling Settings</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Date</label>
                      <input
                        type="date"
                        value={composerDate}
                        onChange={(e) => setComposerDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-[#005ac2]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Time</label>
                      <input
                        type="time"
                        value={composerTime}
                        onChange={(e) => setComposerTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-[#005ac2]"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleComposerSubmit(true)}
                    disabled={isComposerSubmitting || !composerText.trim() || composerPlatforms.length === 0}
                    className="flex-1 py-3 bg-[#005ac2] hover:bg-[#004fab] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-md transition-all text-sm"
                  >
                    {isComposerSubmitting ? "Publishing..." : "Publish Now"}
                  </button>
                  <button
                    onClick={() => handleComposerSubmit(false)}
                    disabled={isComposerSubmitting || !composerText.trim() || composerPlatforms.length === 0 || !composerDate}
                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 font-bold rounded-xl transition-all text-sm"
                  >
                    Schedule Post
                  </button>
                </div>
              </div>

              {/* Right Column: Live Composer Mockup Preview */}
              <div className="lg:col-span-5">
                <div className="sticky top-28 space-y-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Preview Mockup</label>
                  <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-200">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-[#005ac2]">
                          MC
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">manual_composer</p>
                          <p className="text-[10px] text-slate-400 capitalize">{composerPlatforms[0] || "Select platform"} Previews</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">Manual Preview</span>
                    </div>

                    <div className="p-5 min-h-[180px] whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
                      {composerText || "Start typing your post details on the left to see your live preview mock..."}
                    </div>

                    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-medium">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">favorite</span> Like</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">chat_bubble</span> Comment</span>
                      </div>
                      <span className="text-[10px]">Ready to sync</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: CONTENT CALENDAR */}
          {activeTab === "calendar" && (() => {
            const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
            const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            
            const cells = [];
            for (let i = 0; i < firstDayIndex; i++) {
              cells.push({ day: null, dateStr: null });
            }
            for (let day = 1; day <= daysInMonth; day++) {
              const monthStr = String(calendarMonth + 1).padStart(2, "0");
              const dayStr = String(day).padStart(2, "0");
              const dateStr = `${calendarYear}-${monthStr}-${dayStr}`;
              cells.push({ day, dateStr });
            }

            const upcomingDrafts = allDrafts.filter(d => d.status !== "published");

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#2b3437] animate-fadeIn">
                
                {/* Left Side Calendar grid */}
                <div className="lg:col-span-8 space-y-6">
                  <header className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold font-headline">{monthNames[calendarMonth]} {calendarYear}</h2>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            if (calendarMonth === 0) {
                              setCalendarMonth(11);
                              setCalendarYear(calendarYear - 1);
                            } else {
                              setCalendarMonth(calendarMonth - 1);
                            }
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button 
                          onClick={() => {
                            if (calendarMonth === 11) {
                              setCalendarMonth(0);
                              setCalendarYear(calendarYear + 1);
                            } else {
                              setCalendarMonth(calendarMonth + 1);
                            }
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">Click a cell to compose or reschedule</span>
                  </header>

                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                      <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>

                    <div className="grid grid-cols-7 auto-rows-[100px] border-b border-slate-100">
                      {cells.map((cell, idx) => {
                        const scheduledPosts = cell.dateStr 
                          ? allDrafts.filter(d => d.scheduled_time && d.scheduled_time.startsWith(cell.dateStr))
                          : [];
                          
                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              if (cell.dateStr) {
                                setComposerDate(cell.dateStr);
                                setComposerTime("12:00");
                                setActiveTab("composer");
                              }
                            }}
                            className={`border-r border-b border-slate-100 p-2 flex flex-col gap-1 transition-all relative group overflow-hidden ${
                              cell.day ? "cursor-pointer hover:bg-slate-50/70" : "bg-slate-50/30 cursor-default"
                            }`}
                          >
                            {cell.day && (
                              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-800 transition-colors">{cell.day}</span>
                            )}
                            
                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[70px] no-scrollbar">
                              {scheduledPosts.map((post, pIdx) => {
                                const platInfo = getPlatformIcon(post.platform);
                                return (
                                  <div 
                                    key={pIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newDate = prompt("Reschedule post date (YYYY-MM-DD):", cell.dateStr);
                                      if (newDate) {
                                        handleRescheduleDraft(post.id, newDate);
                                      }
                                    }}
                                    title={`Click to reschedule: ${post.body_text}`}
                                    className="bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 truncate shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">{platInfo.icon}</span>
                                    <span className="truncate">{post.body_text || "Post details"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side Sidebar: Upcoming Posts */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-base font-bold font-headline">Upcoming Pipeline List</h3>
                    <div className="space-y-3">
                      {upcomingDrafts.length > 0 ? (
                        upcomingDrafts.map((draft, idx) => {
                          const platInfo = getPlatformIcon(draft.platform);
                          return (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl space-y-2 group relative">
                              <div className="flex justify-between items-start">
                                <span className={`flex items-center gap-1 text-[9px] font-bold ${platInfo.color} uppercase tracking-wider`}>
                                  <span className="material-symbols-outlined text-[12px]">{platInfo.icon}</span>
                                  {draft.platform}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  {draft.scheduled_time 
                                    ? new Date(draft.scheduled_time).toLocaleDateString()
                                    : "Unscheduled Draft"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{draft.body_text || "No content details."}</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                          <p className="text-xs text-slate-400">No scheduled posts pending.</p>
                          <button onClick={() => setActiveTab("composer")} className="mt-2 text-xs font-bold text-[#005ac2] hover:underline">Schedule one now</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* TAB 5: OMNIPOST AURA ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-8 text-[#2b3437] animate-fadeIn">
              
              {/* KPIs Rows */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Average Engagement Rate", val: analyticsData.kpis.engagement_rate, trend: "Steady", icon: "analytics", col: "text-[#005ac2]" },
                  { label: "Total Reach (Aggregated)", val: "1.2M", trend: "Above Average (+8.4%)", icon: "public", col: "text-[#005ac2]" },
                  { label: "Aggregated CTR", val: "2.14%", trend: "Optimal", icon: "ads_click", col: "text-[#005ac2]" }
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{kpi.label}</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-4xl font-black text-slate-900 tracking-tighter">{kpi.val}</span>
                      <span className={`text-[10px] font-bold bg-slate-100 ${kpi.col} px-2 py-0.5 rounded-full flex items-center gap-0.5`}>
                        <span className="material-symbols-outlined text-xs">{kpi.icon}</span>
                        {kpi.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bento Grid: Charts & Strategy */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Line graph */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">Engagement Over Time</h3>
                      <p className="text-xs text-slate-400">Daily interactions across profiles (30 days)</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#005ac2]"></span> Current</span>
                    </div>
                  </div>

                  {/* SVG line path representation */}
                  <div className="h-64 w-full relative border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50 p-4">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="svgGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#005ac2" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#005ac2" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M 0 150 Q 100 80, 200 130 T 400 90 T 500 70 L 500 200 L 0 200 Z" fill="url(#svgGrad)" />
                      <path d="M 0 150 Q 100 80, 200 130 T 400 90 T 500 70" fill="none" stroke="#005ac2" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="200" cy="130" r="5" fill="#005ac2" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="400" cy="90" r="5" fill="#005ac2" stroke="#ffffff" strokeWidth="2" />
                    </svg>
                    <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                      {analyticsData.charts.engagement_over_time.map((pt, idx) => (
                        <span key={idx}>{pt.date}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress bars format breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Content Strategy</h3>
                    <p className="text-xs text-slate-400">Engagement score breakdown by post type</p>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { name: "Video / Reels", val: analyticsData.charts.content_strategy.video },
                      { name: "Carousel Posts", val: analyticsData.charts.content_strategy.carousel },
                      { name: "Static Image Posts", val: analyticsData.charts.content_strategy.static },
                      { name: "Stories / Fleets", val: analyticsData.charts.content_strategy.stories }
                    ].map((format, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>{format.name}</span>
                          <span className="text-slate-800">{format.val}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#005ac2] rounded-full" style={{ width: `${format.val}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table of Published / Top Performing Posts */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-800">Top Performing Posts</h3>
                  <span className="text-xs text-slate-400">Diverged dynamically from sqlite publish profiles</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="px-6 py-4">Post Content</th>
                        <th className="px-6 py-4">Platform</th>
                        <th className="px-6 py-4">Est Reach</th>
                        <th className="px-6 py-4">Avg Engagement</th>
                        <th className="px-6 py-4">Click-through Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                      {analyticsData.top_posts.map((post, idx) => {
                        const platInfo = getPlatformIcon(post.platform);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4 font-medium max-w-xs truncate">{post.body_text}</td>
                            <td className="px-6 py-4 capitalize">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 ${platInfo.color}`}>
                                <span className="material-symbols-outlined text-xs">{platInfo.icon}</span>
                                {post.platform}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800">{post.reach}</td>
                            <td className="px-6 py-4 text-emerald-600 font-semibold">{post.engagement}</td>
                            <td className="px-6 py-4 font-semibold">{post.ctr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: AGENT AUTOMATION DASHBOARD */}
          {activeTab === "automation" && (
            <div className="space-y-8 text-[#2b3437] animate-fadeIn">
              
              {/* Header and trigger */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold font-headline">Agent Automation Crew</h2>
                  <p className="text-xs text-slate-400">Configure, deploy, and monitor your fleet of specialized AI operators.</p>
                </div>
                <button
                  onClick={() => setIsCreateAgentOpen(true)}
                  className="px-4 py-2 bg-[#005ac2] hover:bg-[#004fab] text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 active:scale-98 transition-all"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>Create Agent</span>
                </button>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent, idx) => (
                  <div key={idx} className={`bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between h-56 transition-all hover:shadow-md ${
                    agent.status === "paused" ? "opacity-60 border-slate-200" : "border-slate-200/80"
                  }`}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#005ac2]">
                          <span className="material-symbols-outlined text-xl">
                            {agent.name.includes("Bot") ? "trending_up" : agent.name.includes("Specialist") ? "support_agent" : agent.name.includes("Miner") ? "database" : "shield"}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agent.status === "active"}
                            onChange={() => handleToggleAgent(agent.id, agent.status)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#005ac2]"></div>
                        </label>
                      </div>
                      <h3 className="font-bold text-base text-slate-800 mb-1">{agent.name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{agent.description}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                      <span className={agent.status === "active" ? "text-emerald-600 flex items-center gap-1" : "text-slate-400"}>
                        {agent.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                        {agent.status}
                      </span>
                      <div className="flex gap-2 capitalize">
                        {agent.platforms.map((p, pIdx) => (
                          <span key={pIdx} className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Create Agent Workflow Modal */}
              {isCreateAgentOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden text-[#2b3437]">
                    
                    {/* Modal Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold font-headline">Create New Agent</h3>
                        <p className="text-xs text-slate-400">Configure your autonomous crew operator.</p>
                      </div>
                      <button onClick={() => setIsCreateAgentOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Agent Name</label>
                        <input
                          type="text"
                          value={newAgentName}
                          onChange={(e) => setNewAgentName(e.target.value)}
                          placeholder="e.g., Sentiment Sentry"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#005ac2]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Goal / Description</label>
                        <textarea
                          value={newAgentDescription}
                          onChange={(e) => setNewAgentDescription(e.target.value)}
                          placeholder="e.g., Track competitor updates and flag unique brand opportunities..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#005ac2] min-h-[80px]"
                        />
                      </div>

                      {/* Platforms selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Target Platforms</label>
                        <div className="flex gap-2">
                          {["instagram", "linkedin", "twitter", "facebook"].map(plat => {
                            const isSelected = newAgentPlatforms.includes(plat);
                            return (
                              <button
                                key={plat}
                                onClick={() => {
                                  if (newAgentPlatforms.includes(plat)) {
                                    setNewAgentPlatforms(newAgentPlatforms.filter(p => p !== plat));
                                  } else {
                                    setNewAgentPlatforms([...newAgentPlatforms, plat]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${
                                  isSelected 
                                    ? "bg-[#005ac2] text-white border-[#005ac2]" 
                                    : "bg-slate-100 border-slate-200 text-slate-500"
                                }`}
                              >
                                {plat}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Frequency selection */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Frequency</label>
                        <select
                          value={newAgentFrequency}
                          onChange={(e) => setNewAgentFrequency(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#005ac2]"
                        >
                          <option>Hourly</option>
                          <option>Daily</option>
                          <option>Weekly</option>
                          <option>Custom</option>
                        </select>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 bg-slate-50 flex justify-end gap-3">
                      <button
                        onClick={() => setIsCreateAgentOpen(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeployAgent}
                        disabled={!newAgentName.trim()}
                        className="px-6 py-2 bg-[#005ac2] hover:bg-[#004fab] disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-sm"
                      >
                        Deploy Agent
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: BRAND VOICE PROFILE */}
          {activeTab === "brand-voice" && (
            <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto text-[#2b3437]">
              
              {/* Profile Intro Banner */}
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden border border-slate-200 shadow-sm">
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl"></div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 flex items-center justify-center rounded-xl text-indigo-600">
                    <span className="material-symbols-outlined text-2xl">psychology</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-headline font-bold text-slate-800">Brand Voice Core Memory</h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Omnipost observes your edits as you refine drafts. Over time, it updates this profile and feeds these parameters into future prompts, making the AI's drafts sound more and more like you.
                    </p>
                  </div>
                </div>
              </div>

              {/* Memory Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Tone Descriptors */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Tone Descriptors</h3>
                  
                  {/* List */}
                  <div className="flex flex-wrap gap-2">
                    {brandVoice.tone_descriptors && brandVoice.tone_descriptors.length > 0 ? (
                      brandVoice.tone_descriptors.map((tone, idx) => (
                        <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                          <span>{tone}</span>
                          <button onClick={() => handleRemoveTone(idx)} className="hover:text-red-650 text-slate-400 font-bold">×</button>
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No tone descriptors learned yet.</p>
                    )}
                  </div>

                  {/* Add manual descriptor */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newTone}
                      onChange={(e) => setNewTone(e.target.value)}
                      placeholder="Add tone (e.g. funny, analytical)..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#005ac2]/40 text-slate-800"
                    />
                    <button
                      onClick={handleAddTone}
                      className="px-4 py-2 bg-[#005ac2] hover:bg-[#004fab] text-white font-semibold rounded-lg text-xs"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Avoid Phrases */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Vocabulary / Phrases to Avoid</h3>
                  
                  {/* List */}
                  <div className="flex flex-wrap gap-2">
                    {brandVoice.avoid_phrases && brandVoice.avoid_phrases.length > 0 ? (
                      brandVoice.avoid_phrases.map((phrase, idx) => (
                        <span key={idx} className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                          <span>{phrase}</span>
                          <button onClick={() => handleRemoveAvoid(idx)} className="hover:text-red-650 text-slate-400 font-bold">×</button>
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No avoid phrases registered.</p>
                    )}
                  </div>

                  {/* Add manual avoid phrase */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newAvoid}
                      onChange={(e) => setNewAvoid(e.target.value)}
                      placeholder="Add banned phrase..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#005ac2]/40 text-slate-800"
                    />
                    <button
                      onClick={handleAddAvoid}
                      className="px-4 py-2 bg-[#005ac2] hover:bg-[#004fab] text-white font-semibold rounded-lg text-xs"
                    >
                      Add
                    </button>
                  </div>
                </div>

              </div>

              {/* Gold Approved Examples */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Rolling Gold Example Posts (Few-Shot Prompt Injection)</h3>
                <div className="space-y-4">
                  {brandVoice.gold_examples && brandVoice.gold_examples.length > 0 ? (
                    brandVoice.gold_examples.map((example, idx) => (
                      <div key={idx} className="glass-panel p-4 rounded-xl space-y-2 border border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded uppercase font-bold tracking-wider capitalize">
                            {example.platform} Approved
                          </span>
                          <button
                            onClick={() => {
                              const updated = {
                                ...brandVoice,
                                gold_examples: brandVoice.gold_examples.filter((_, i) => i !== idx)
                              };
                              setBrandVoice(updated);
                              saveBrandVoice(updated);
                            }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove example
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{example.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-450 italic">No approved gold examples recorded. Gold examples are added automatically when you edit and approve a post.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto text-[#2b3437]">
              
              {/* Settings Intro Banner */}
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden border border-slate-200 shadow-sm bg-white">
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl"></div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#005ac2]/10 flex items-center justify-center rounded-xl text-[#005ac2]">
                    <span className="material-symbols-outlined text-2xl">settings</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-headline font-bold text-slate-800">Workspace Settings</h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Configure your workspace integration settings, API keys, and model preferences here.
                    </p>
                  </div>
                </div>
              </div>

              {/* LLM / Gemini Configuration */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Gemini LLM Configuration</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure your Gemini API Key to activate the actual Gemini model instead of the mock engine.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-3">Gemini API Key</label>
                    <div className="md:col-span-9 relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={settingsApiKey}
                        onChange={(e) => setSettingsApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-xs focus:ring-1 focus:ring-[#005ac2] text-slate-800 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">{showApiKey ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-3">Preferred Model</label>
                    <div className="md:col-span-9">
                      <select
                        value={settingsModel}
                        onChange={(e) => setSettingsModel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#005ac2] text-slate-800"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Capability)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !settingsApiKey}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-all border border-indigo-200 cursor-pointer"
                    >
                      {isTestingConnection ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">bolt</span>
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-6 py-2 bg-[#005ac2] hover:bg-[#004fab] text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                    >
                      {isSavingSettings ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">save</span>
                          <span>Save Settings</span>
                        </>
                      )}
                    </button>
                  </div>

                  {testResult && (
                    <div className={`p-3 rounded-lg text-xs border ${testResult.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {testResult.message}
                    </div>
                  )}

                  {saveResult && (
                    <div className={`p-3 rounded-lg text-xs border ${saveResult.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {saveResult.message}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </main>
    </div>
  );
}

export default App;
