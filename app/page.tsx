"use client";
import Link from "next/link";

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "94%", label: "of couples say planning stress dropped significantly" },
  { value: "3×",  label: "faster vendor coordination vs. spreadsheets" },
  { value: "100%", label: "of payments tracked — even without internet" },
];

const FEATURES = [
  { icon: "�", title: "Works offline",          desc: "Every change saves locally and syncs the moment you reconnect. No data lost." },
  { icon: "📱", title: "M-Pesa built in",        desc: "Collect contributions and pay vendors via STK Push — no third-party app needed." },
  { icon: "👥", title: "Multi-role access",      desc: "Couple, planner, committee, and vendors each see exactly what they need." },
  { icon: "🎊", title: "All your events",        desc: "Traditional ceremonies, civil, reception — every event in one coordinated view." },
  { icon: "📋", title: "Committee tracking",     desc: "Track pledges, partial payments, and fulfilment across your entire committee." },
  { icon: "⚠️", title: "Automatic risk alerts",  desc: "Flags for overdue vendors, budget overruns, and low RSVP rates — before they become problems." },
];

const TICKER_ITEMS = [
  "Works offline", "M-Pesa payments", "Guest check-in", "Vendor coordination",
  "Budget tracking", "Committee pledges", "Risk alerts", "Multi-role access",
  "Sync queue", "Day-of schedule",
];

const STATUS_ITEMS = [
  { label: "Payments synced",  val: "✓", color: "#22C55E", bg: "#F0FDF4" },
  { label: "Guests updated",   val: "✓", color: "#22C55E", bg: "#F0FDF4" },
  { label: "Offline queue: 3", val: "↑", color: "#D4A94F", bg: "#FFFBEB" },
];

// ── Ticker ────────────────────────────────────────────────────────────────────

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-y border-[#1F4D3A]/10 py-3 bg-white">
      <div className="flex gap-8 animate-ticker whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-[#1F4D3A]/60 font-medium flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A94F]" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard Preview Card ────────────────────────────────────────────────────

function DashPreview() {
  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-[#1F4D3A]/10 p-6 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest">Wedding OS</p>
          <p className="text-sm font-semibold text-[#14161C]">Wanjiku &amp; Kamau</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Progress bars */}
      <div className="space-y-3 mb-5">
        {[
          { label: "Budget", pct: 68, color: "#1F4D3A" },
          { label: "RSVPs",  pct: 82, color: "#D4A94F" },
          { label: "Tasks",  pct: 54, color: "#C0784A" },
        ].map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-[11px] font-medium text-[#14161C]/60 mb-1">
              <span>{b.label}</span><span>{b.pct}%</span>
            </div>
            <div className="h-1.5 bg-[#F7F5F2] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Status items */}
      <div className="space-y-2">
        {STATUS_ITEMS.map((s) => (
          <div key={s.label}
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium"
            style={{ background: s.bg }}>
            <span className="text-[#14161C]/70 text-xs">{s.label}</span>
            <span className="font-bold text-xs" style={{ color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#14161C]/30 text-center mt-4">Syncing across devices...</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F2] text-[#14161C] font-sans overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1F4D3A] flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="font-heading font-semibold text-[#1F4D3A] text-lg">Ndoa</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#14161C]/60 font-medium">
          <a href="#features" className="hover:text-[#1F4D3A] transition-colors">Features</a>
          <a href="#how" className="hover:text-[#1F4D3A] transition-colors">How it works</a>
          <a href="#why" className="hover:text-[#1F4D3A] transition-colors">Why Ndoa</a>
        </div>
        <Link href="/login"
          className="bg-[#1F4D3A] text-white text-sm font-semibold px-5 py-2.5 rounded-full
            hover:bg-[#16382B] transition-colors flex items-center gap-2">
          Get started
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">↗</span>
        </Link>
      </nav>

      {/* ── HERO — centered, full-width headline ── */}
      <section className="text-center px-6 md:px-10 pt-24 pb-0 max-w-5xl mx-auto">
        

        <h1 className="font-heading text-[clamp(40px,6vw,72px)] font-semibold
          leading-[1.08] tracking-tight text-[#14161C] mb-6">
          A better way to plan<br />
          your{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-[#1F4D3A]">wedding</span>
            <span className="absolute -bottom-1 left-0 w-full h-[4px] bg-[#D4A94F] rounded-full" />
          </span>
        </h1>

        <p className="text-base md:text-lg text-[#14161C]/55 max-w-xl mx-auto leading-relaxed mb-10">
          Coordinate family, vendors, and payments seamlessly —
          even when the network fails. Built for real weddings,
          real people, and real conditions.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap mb-14">
          <Link href="/login"
            className="bg-[#1F4D3A] text-white px-7 py-3.5 rounded-full text-sm font-semibold
              shadow-lg shadow-[#1F4D3A]/20 hover:bg-[#16382B] transition-colors
              flex items-center gap-2">
            Start Planning
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">↗</span>
          </Link>
          <button
            onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
            className="border border-[#1F4D3A]/20 text-[#14161C] px-7 py-3.5 rounded-full
              text-sm font-medium hover:bg-[#1F4D3A]/5 transition-colors
              flex items-center gap-2">
            See how it works
            <span className="w-5 h-5 rounded-full bg-[#1F4D3A]/10 flex items-center justify-center text-xs">▶</span>
          </button>
        </div>

        {/* Dashboard preview — bleeds below */}
        <div className="relative mx-auto max-w-2xl">
          {/* Glow */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-96 h-40
            bg-[#1F4D3A]/10 blur-3xl rounded-full -z-10" />
          <div className="bg-white rounded-t-3xl border border-b-0 border-[#1F4D3A]/10
            shadow-2xl shadow-[#1F4D3A]/10 p-6 pb-0">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-1.5 mb-5">
              <span className="w-3 h-3 rounded-full bg-red-300" />
              <span className="w-3 h-3 rounded-full bg-yellow-300" />
              <span className="w-3 h-3 rounded-full bg-green-300" />
              <div className="flex-1 mx-4 bg-[#F7F5F2] rounded-full h-5 flex items-center px-3">
                <span className="text-[10px] text-[#14161C]/30">ndoa.app/dashboard</span>
              </div>
            </div>
            {/* Dashboard mockup */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total Guests", val: "248", sub: "82% confirmed", color: "#1F4D3A" },
                { label: "Budget Used",  val: "68%", sub: "KSh 1.6M / 2.4M", color: "#D4A94F" },
                { label: "Tasks Done",   val: "54%", sub: "23 remaining", color: "#C0784A" },
              ].map((c) => (
                <div key={c.label} className="bg-[#F7F5F2] rounded-2xl p-3.5">
                  <p className="text-[10px] text-[#14161C]/40 font-medium mb-1">{c.label}</p>
                  <p className="font-heading text-xl font-semibold" style={{ color: c.color }}>{c.val}</p>
                  <p className="text-[10px] text-[#14161C]/40 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#F7F5F2] rounded-2xl p-4 mb-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#14161C]/60">Upcoming tasks</p>
                <span className="text-[10px] text-[#1F4D3A] font-medium">View all →</span>
              </div>
              {["Confirm catering headcount", "Send venue deposit", "Finalise guest list"].map((t, i) => (
                <div key={t} className="flex items-center gap-2.5 py-2 border-b border-[#1F4D3A]/5 last:border-0">
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${i === 0 ? "bg-[#1F4D3A] border-[#1F4D3A]" : "border-[#1F4D3A]/20"}`} />
                  <span className={`text-xs ${i === 0 ? "line-through text-[#14161C]/30" : "text-[#14161C]/70"}`}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── SOCIAL PROOF STRIP ── */}
      {/* <div className="bg-white border-b border-[#1F4D3A]/8 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#1F4D3A","#D4A94F","#C0784A","#5B7FA6"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: c }}>
                  {["W","K","A","M"][i]}
                </div>
              ))}
            </div>
            <span className="text-sm text-[#14161C]/60 font-medium">500+ couples planning their wedding</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#14161C]/50">
            <span>Trusted across Kenya, Uganda &amp; Tanzania</span>
            <button className="w-7 h-7 rounded-full bg-[#1F4D3A] text-white flex items-center justify-center text-xs">▶</button>
          </div>
        </div>
      </div> */}

      {/* ── THE PROBLEM ── */}
      <section className="bg-[#E6C878]/30 px-6 md:px-10 py-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-semibold text-[#1F4D3A]/50 uppercase tracking-widest
              bg-[#1F4D3A]/8 px-3 py-1 rounded-full inline-block mb-6">
              The Problem
            </span>
            <h2 className="font-heading text-[clamp(32px,4vw,52px)] font-semibold
              leading-[1.12] text-[#14161C] mb-6">
              Traditional planning<br />can&apos;t keep up<br />with your wedding
            </h2>
            <p className="text-[#14161C]/60 leading-relaxed mb-8 max-w-md">
              Spreadsheets break. WhatsApp groups get chaotic.
              Vendors go silent. Payments get lost. And none of it
              works when the internet cuts out.
            </p>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#1F4D3A] text-white px-6 py-3 rounded-full text-sm font-semibold
                hover:bg-[#16382B] transition-colors flex items-center gap-2 w-fit">
              See the solution
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">↗</span>
            </button>
          </div>
          {/* Illustration — dashboard card */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#D4A94F]/20 blur-3xl rounded-full -z-10" />
            <DashPreview />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="why" className="bg-[#1F4D3A] px-6 md:px-10 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white text-center mb-12">
            Why couples trust Ndoa
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {STATS.map((s) => (
              <div key={s.value}
                className="bg-[#E6C878]/20 rounded-3xl p-8 border border-white/10">
                <p className="font-heading text-5xl font-bold text-[#D4A94F] mb-3">{s.value}</p>
                <p className="text-white/60 text-sm leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-white px-6 md:px-10 py-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading text-[clamp(28px,4vw,48px)] font-semibold text-center mb-3">
            A platform that does it all
          </h2>
          <p className="text-center text-[#14161C]/50 mb-14 max-w-xl mx-auto leading-relaxed">
            Built around how weddings actually work — committees,
            multiple events, and patchy connectivity.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="p-6 border border-[#1F4D3A]/8 rounded-2xl hover:shadow-md
                  hover:border-[#1F4D3A]/20 transition-all group">
                <span className="text-2xl mb-4 block">{f.icon}</span>
                <h3 className="font-semibold text-[#14161C] mb-2 group-hover:text-[#1F4D3A] transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-[#14161C]/55 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="bg-[#F7F5F2] px-6 md:px-10 py-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading text-[clamp(28px,4vw,48px)] font-semibold text-center mb-14">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-px bg-[#1F4D3A]/10" />
            {[
              { n: "01", title: "Set up your wedding",  desc: "Add your events, budget, and invite your planner and committee members." },
              { n: "02", title: "Work from anywhere",   desc: "The app works fully offline. Every change is saved locally and synced when you reconnect." },
              { n: "03", title: "Execute on the day",   desc: "Check in guests, track vendor arrivals, and manage incidents in real time." },
            ].map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white border-2 border-[#1F4D3A]/15 shadow-sm
                  flex items-center justify-center relative z-10">
                  <span className="font-heading text-lg font-bold text-[#1F4D3A]">{s.n}</span>
                </div>
                <h3 className="font-semibold text-[#14161C]">{s.title}</h3>
                <p className="text-sm text-[#14161C]/55 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRE-FOOTER CTA ── */}
      <section className="px-6 md:px-10 py-6 bg-white">
        <div className="max-w-7xl mx-auto bg-[#EAF3DE] rounded-3xl px-8 md:px-14 py-12
          flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[#14161C] mb-3">
              Start planning your wedding today
            </h2>
            <p className="text-[#14161C]/55 text-sm leading-relaxed mb-6">
              Free to start. No credit card required. Works on any device, online or off.
            </p>
            {/* Scrolling feature pills */}
            <div className="flex flex-wrap gap-2">
              {["Works offline", "M-Pesa ready", "Multi-role", "Guest check-in", "Budget tracking"].map((t) => (
                <span key={t}
                  className="text-xs font-medium text-[#1F4D3A]/70 bg-white/70 border border-[#1F4D3A]/10
                    px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F4D3A]/40" />{t}
                </span>
              ))}
            </div>
          </div>
          <Link href="/login"
            className="bg-[#1F4D3A] text-white px-8 py-4 rounded-full text-sm font-bold
              shadow-lg shadow-[#1F4D3A]/20 hover:bg-[#16382B] transition-colors
              flex items-center gap-2 flex-shrink-0">
            Get started
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">↗</span>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#16382B] text-white px-6 md:px-10 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#D4A94F] flex items-center justify-center">
                  <span className="text-[#1F4D3A] text-xs font-bold">N</span>
                </div>
                <span className="font-heading font-semibold text-lg">Ndoa</span>
              </div>
              <p className="font-heading text-xl font-semibold text-white/80 leading-snug max-w-xs">
                The operating system for modern weddings.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Product</p>
              <div className="space-y-2.5 text-sm text-white/60">
                {["Features", "How it works", "Pricing", "FAQ"].map((l) => (
                  <p key={l} className="hover:text-white cursor-pointer transition-colors">{l}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Company</p>
              <div className="space-y-2.5 text-sm text-white/60">
                {["About", "Contact", "Privacy", "Terms"].map((l) => (
                  <p key={l} className="hover:text-white cursor-pointer transition-colors">{l}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Ndoa. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </main>
  );
}
