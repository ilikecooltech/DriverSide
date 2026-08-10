import React, { useEffect, useState } from "react";
import { C, mono, heading, sans } from "./theme.js";
import { MOCK_DEAL } from "./data/decode.js";
import { initAnalytics, track, identify, resetIdentity } from "./lib/analytics.js";
import { getSession, signOut, authConfigured } from "./lib/supabase.js";
import { Login } from "./components/Login.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { CaptureFlow } from "./components/CaptureFlow.jsx";
import { ManualEntry } from "./components/ManualEntry.jsx";
import { Decoder } from "./components/Decoder.jsx";
import { Paywall } from "./components/Paywall.jsx";
import { ModeSwitch, PrepMode, TableMode } from "./components/Modes.jsx";
import { Walked, Receipt, FreshStart } from "./components/Outcomes.jsx";
import { Profile } from "./components/Profile.jsx";
import { Garage } from "./components/Garage.jsx";

/* App shell: auth -> three tabs -> deal flow (capture/manual/decoder/
   paywall/modes/outcomes) + profile. Monetization gates per
   docs/monetization.md; analytics events per CLAUDE.md success metrics. */

const CONTEXT = {
  goal: "YOUR GOAL", deal: "DEAL DECODER", garage: "GARAGE",
  modes: "MODE", prep: "PREP MODE · TONIGHT", table: "TABLE MODE · ONE HAND",
  walked: "WATCHING · DAY 2", receipt: "SIGNED · THE RECEIPT", freshstart: "FRESH START · YOUR PLAN",
};

export default function App() {
  const [auth, setAuth] = useState(null); // null | 'guest' | 'account'
  const [userName, setUserName] = useState(null);
  const [tab, setTab] = useState("goal");
  const [showProfile, setShowProfile] = useState(false);
  const [archetype, setArchetype] = useState(null);

  const [dealView, setDealView] = useState("capture");
  const [deal, setDeal] = useState(null);
  const [median, setMedian] = useState(null); // shared with modes/outcomes
  const [mode, setMode] = useState("prep");
  const [decodeCount, setDecodeCount] = useState(0);
  const [hasPass, setHasPass] = useState(false);
  const [gate, setGate] = useState({ context: "scripts", back: "decoder", after: null });

  useEffect(() => {
    initAnalytics();
    getSession().then((s) => {
      if (s?.user) {
        setAuth("account");
        setUserName(s.user.email?.split("@")[0] || null);
        identify(s.user.id, { email: s.user.email });
      }
    });
  }, []);

  const handleAuth = (kind) => {
    setAuth(kind);
    track("auth_completed", { kind, configured: authConfigured });
  };

  const handleSignOut = async () => {
    await signOut();
    resetIdentity();
    setAuth(null); setShowProfile(false); setTab("goal");
    setDeal(null); setDealView("capture"); setDecodeCount(0); setHasPass(false);
  };

  const openPaywall = (context, back, after = null) => {
    setGate({ context, back, after });
    setDealView("paywall");
    track("gate_hit", { context });
    track("paywall_viewed", { context, leverage: deal ? deal.junkTotal + deal.taxError : null });
  };

  const startDecode = (d) => {
    const isRedecode = deal && d.vehicle === deal.vehicle;
    setDeal(d);
    setDecodeCount((n) => n + 1);
    setDealView("decoder");
    track(isRedecode ? "quote_redecoded" : "quote_decoded", {
      source: d === MOCK_DEAL ? "demo" : "manual",
      leverage: d.junkTotal + d.taxError,
      has_trade: d.trade.offer > 0,
      underwater: d.negEq > 0,
    });
  };

  const requestNewQuote = () => {
    if (decodeCount >= 1 && !hasPass) openPaywall("second-decode", dealView, "capture");
    else setDealView("capture");
  };

  const goOutcome = (k) => {
    setDealView(k);
    track(k === "walked" ? "outcome_walked" : "outcome_signed");
  };

  const leverage = deal ? deal.junkTotal + deal.taxError : null;
  const dv = tab === "deal" ? dealView : tab;

  if (!auth)
    return (
      <Shell>
        <Login onAuth={handleAuth} />
      </Shell>
    );

  return (
    <Shell
      masthead={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {tab === "deal" && dealView === "decoder" && (
            <>
              <button onClick={requestNewQuote} style={mastBtn}>+ NEW QUOTE</button>
              <button onClick={() => { setDealView("modes"); track("mode_switch_opened"); }} style={mastBtn}>MODES</button>
            </>
          )}
          {!(tab === "deal" && dealView === "decoder") && (
            <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.inkSoft }}>
              {CONTEXT[dv] || CONTEXT[tab]}{hasPass && tab === "deal" ? " · DEAL PASS" : ""}
            </span>
          )}
          <button onClick={() => setShowProfile(true)} aria-label="Profile" style={{ width: 28, height: 28, border: `1.5px solid ${C.ink}`, background: C.card, fontFamily: heading, fontWeight: 600, fontSize: 13, cursor: "pointer", color: C.ink, padding: 0 }}>
            {auth === "guest" ? "G" : (userName || "D")[0].toUpperCase()}
          </button>
        </div>
      }
      tabs={
        <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
          {[["goal", "Your Goal"], ["deal", "Deal Decoder"], ["garage", "Garage"]].map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); setShowProfile(false); }} aria-current={tab === k ? "page" : undefined}
              style={{ flex: 1, minHeight: 42, cursor: "pointer", fontSize: 12.5, fontWeight: 700, border: "none", borderBottom: tab === k ? `2px solid ${C.ink}` : "2px solid transparent", background: "none", color: tab === k ? C.ink : C.inkSoft }}>
              {label}
            </button>
          ))}
        </div>
      }
    >
      {showProfile ? (
        <Profile
          name={userName} isGuest={auth === "guest"}
          archetypeName={archetype?.name} deal={deal}
          onSignOut={handleSignOut} onBack={() => setShowProfile(false)}
        />
      ) : (
        <>
          {tab === "goal" && (
            <Onboarding onConfirm={(arch) => { setArchetype(arch); setTab("deal"); track("onboarding_completed", { archetype: arch.name }); }} />
          )}

          {tab === "deal" && dealView === "capture" && (
            <CaptureFlow
              onSeeDecode={() => startDecode(MOCK_DEAL)}
              onManual={() => {
                if (decodeCount >= 1 && !hasPass) openPaywall("second-decode", "capture", "manual");
                else setDealView("manual");
              }}
            />
          )}
          {tab === "deal" && dealView === "manual" && (
            <ManualEntry onDecode={startDecode} onBack={() => setDealView("capture")} />
          )}
          {tab === "deal" && dealView === "decoder" && deal && (
            <Decoder
              deal={deal} hasPass={hasPass}
              onGate={(ctx) => openPaywall(ctx, "decoder")}
              onMedian={setMedian}
              onFreshStart={() => { setDealView("freshstart"); track("freshstart_viewed", { gap: deal.negEq }); }}
            />
          )}
          {tab === "deal" && dealView === "decoder" && !deal && (
            <CaptureFlow onSeeDecode={() => startDecode(MOCK_DEAL)} onManual={() => setDealView("manual")} />
          )}
          {tab === "deal" && dealView === "paywall" && (
            <Paywall
              leverage={leverage} context={gate.context}
              onBuy={() => {
                setHasPass(true);
                setDealView(gate.after || gate.back || "decoder");
                track("deal_pass_purchased", { context: gate.context, leverage });
              }}
              onClose={() => setDealView(gate.back || (deal ? "decoder" : "capture"))}
            />
          )}
          {tab === "deal" && dealView === "modes" && deal && (
            <ModeSwitch mode={mode} setMode={setMode}
              onOpen={(m) => { setDealView(m); track("mode_opened", { mode: m }); }}
              onOutcome={goOutcome}
            />
          )}
          {tab === "deal" && dealView === "prep" && deal && (
            <PrepMode deal={deal} median={median} onTable={() => { setMode("table"); setDealView("table"); track("mode_opened", { mode: "table" }); }} />
          )}
          {tab === "deal" && dealView === "table" && deal && (
            <TableMode deal={deal} median={median} onFullDecode={() => setDealView("decoder")} />
          )}
          {tab === "deal" && dealView === "walked" && deal && (
            <Walked deal={deal} median={median} onGarage={() => { setTab("garage"); setDealView("decoder"); }} />
          )}
          {tab === "deal" && dealView === "receipt" && deal && (
            <Receipt deal={deal} median={median} onDone={() => { track("refi_watch_set"); setShowProfile(true); setDealView("decoder"); }} />
          )}
          {tab === "deal" && dealView === "freshstart" && deal && (
            <FreshStart deal={deal} onStart={() => { track("freshstart_plan_started", { gap: deal.negEq }); setTab("garage"); setDealView("decoder"); }} />
          )}

          {tab === "garage" && (
            <Garage archetypeName={archetype ? archetype.name : "Family Hauler"} onOpenDecode={() => setTab("deal")} />
          )}
        </>
      )}
    </Shell>
  );
}

const mastBtn = { fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.accentText, background: "none", border: `1px solid ${C.line}`, padding: "5px 8px", cursor: "pointer" };

function Shell({ masthead, tabs, children }) {
  return (
    <div style={{ background: C.paper, height: "100vh", display: "flex", justifyContent: "center", fontFamily: sans, color: C.ink }}>
      <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", minHeight: 0, borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}` }}>
        <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontFamily: heading, fontWeight: 600, fontSize: 19, letterSpacing: "0.01em" }}>DriverSide</span>
          {masthead || <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.inkSoft }}>SIGN IN</span>}
        </div>
        {tabs}
        {children}
      </div>
    </div>
  );
}
