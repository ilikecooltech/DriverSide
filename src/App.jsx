import React, { useEffect, useState } from "react";
import { C, mono, heading, sans } from "./theme.js";
import { MOCK_DEAL } from "./data/decode.js";
import { toGarageItem } from "./data/shopping.js";
import { IMPORTS, connectorName } from "./data/connections.js";
import { loadState, saveState, clearState } from "./lib/storage.js";
import { initAnalytics, track, identify, resetIdentity } from "./lib/analytics.js";
import { getSession, signOut, onAuthChange, authConfigured } from "./lib/supabase.js";
import { useDesktop } from "./components/ui.jsx";
import { Login } from "./components/Login.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { Shop } from "./components/Shop.jsx";
import { Garage } from "./components/Garage.jsx";
import { CaptureFlow } from "./components/CaptureFlow.jsx";
import { ManualEntry } from "./components/ManualEntry.jsx";
import { Decoder } from "./components/Decoder.jsx";
import { Paywall } from "./components/Paywall.jsx";
import { ModeSwitch, PrepMode, TableMode } from "./components/Modes.jsx";
import { Walked, Receipt, FreshStart } from "./components/Outcomes.jsx";
import { Profile } from "./components/Profile.jsx";
import { SignInPrompt } from "./components/SignInPrompt.jsx";
import { requiresAccount } from "./lib/account.js";

/* Three stages, in the order a buyer actually moves through them:
     Shop    — match and value against their stated goal
     Garage  — the shortlist, their ranking, from every source
     Dealer  — the decoder, the modes, and how it ended
   Profile lives in the top bar, reachable from anywhere. */

const DEFAULT_SETUP = {
  zip: "77471", radius: 100,
  apr: 7.2, term: 60,
  tradeCar: "", tradeValue: 0, tradePayoff: 0,
};

const CONTEXT = {
  shop: "SHOP", garage: "GARAGE", dealer: "AT THE DEALER",
  capture: "AT THE DEALER", manual: "MANUAL ENTRY", decoder: "DEAL DECODER",
  paywall: "DEAL PASS", modes: "MODE", prep: "PREP MODE · TONIGHT",
  table: "TABLE MODE · ONE HAND", walked: "WATCHING · DAY 2",
  receipt: "SIGNED · THE RECEIPT", freshstart: "FRESH START · YOUR PLAN",
};

export default function App() {
  const persisted = typeof window !== "undefined" ? loadState() : {};

  const [auth, setAuth] = useState(null);
  const [userName, setUserName] = useState(null);
  const [booted, setBooted] = useState(false);

  const [onboarded, setOnboarded] = useState(Boolean(persisted.archetypeKey));
  const [archetype, setArchetype] = useState(persisted.archetype || null);
  const [setup, setSetup] = useState({ ...DEFAULT_SETUP, ...(persisted.setup || {}) });
  const [cars, setCars] = useState(persisted.cars || []);
  const [connections, setConnections] = useState(persisted.connections || {});

  const [tab, setTab] = useState("shop");
  const [showProfile, setShowProfile] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);

  const [dealView, setDealView] = useState("capture");
  const [deal, setDeal] = useState(null);
  const [median, setMedian] = useState(null);
  const [mode, setMode] = useState("prep");
  const [decodeCount, setDecodeCount] = useState(0);
  const [hasPass, setHasPass] = useState(Boolean(persisted.hasPass));
  const [gate, setGate] = useState({ context: "scripts", back: "decoder", after: null });

  const desktop = useDesktop();

  /* A phone-OTP user has no email, so the greeting falls back to the last
     four digits — "Hi 4567" beats "Hi null".

     Called both on boot and when a guest signs in mid-session. It only
     ever adds: no local state is cleared here, so a guest who signs in
     keeps their garage, goal and setup. Only handleSignOut clears. */
  const adoptSession = (user) => {
    setAuth("account");
    const label = user.email
      ? user.email.split("@")[0]
      : user.phone
        ? user.phone.replace(/\D/g, "").slice(-4)
        : null;
    setUserName(label);
    identify(user.id, { email: user.email || null, phone: user.phone || null });
  };

  useEffect(() => {
    initAnalytics();
    getSession().then((s) => {
      if (s?.user) adoptSession(s.user);
      setBooted(true);
    });
    // Catches the OTP verify and the magic-link return trip.
    return onAuthChange((session) => {
      if (session?.user) adoptSession(session.user);
    });
  }, []);

  // Everything the buyer builds survives a refresh.
  useEffect(() => {
    saveState({ archetype, archetypeKey: archetype?.key || null, setup, cars, connections, hasPass });
  }, [archetype, setup, cars, connections, hasPass]);

  const handleAuth = (kind) => {
    setAuth(kind);
    track("auth_completed", { kind, configured: authConfigured });
  };

  const handleSignOut = async () => {
    await signOut();
    resetIdentity();
    clearState();
    setAuth(null); setShowProfile(false); setTab("shop");
    setOnboarded(false); setArchetype(null); setCars([]); setConnections({});
    setSetup(DEFAULT_SETUP); setDeal(null); setDealView("capture");
    setDecodeCount(0); setHasPass(false);
  };

  /* ---- garage ---- */
  const addCar = (item, src) => {
    const car = item.title ? item : toGarageItem(item, src);
    setCars((prev) => (prev.some((c) => c.id === car.id) ? prev : [...prev, car]));
    track("vehicle_saved", { vehicle: car.title, price: car.price, source: car.src });
  };
  const removeCar = (id) => setCars((prev) => prev.filter((c) => c.id !== id));
  const rankCar = (from, to) =>
    setCars((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
      track("garage_reranked", { from, to });
      return next;
    });

  /* ---- connections ---- */
  const connect = (id) => {
    setConnections((c) => ({ ...c, [id]: true }));
    const imported = (IMPORTS[id] || []).map((v) => toGarageItem(v, connectorName(id).toUpperCase()));
    setCars((prev) => {
      const have = new Set(prev.map((c) => c.id));
      return [...prev, ...imported.filter((c) => !have.has(c.id))];
    });
    track("account_connected", { connector: id, imported: imported.length });
  };
  const disconnect = (id) => {
    setConnections((c) => ({ ...c, [id]: false }));
    const name = connectorName(id).toUpperCase();
    setCars((prev) => prev.filter((c) => c.src !== name));
    track("account_disconnected", { connector: id });
  };

  /* ---- the account ask, at the point of need ----
     Guests get the whole app. When they reach for the one or two things a
     phone alone can't do, requireAccount puts the code screen in front of
     them and then puts them back exactly where they were. `requiresAccount`
     is the single table in lib/account.js, so switching a capability on
     later (deal pass, once subscriptions land) needs no change here. */
  const [signInAsk, setSignInAsk] = useState(null); // { capability, after }

  const requireAccount = (capability, after = null) => {
    if (auth === "account" || !requiresAccount(capability)) { after?.(); return true; }
    setSignInAsk({ capability, after });
    track("account_gate_hit", { capability });
    return false;
  };

  /* ---- deal flow ---- */
  const openPaywall = (context, back, after = null) => {
    setGate({ context, back, after });
    setDealView("paywall");
    track("gate_hit", { context });
    track("paywall_viewed", { context, leverage: deal ? deal.junkTotal + deal.taxError : null });
  };
  const startDecode = (d) => {
    const withPre = { ...d, preApproval: { apr: setup.apr, term: setup.term } };
    const isRedecode = deal && d.vehicle === deal.vehicle;
    setDeal(withPre);
    setDecodeCount((n) => n + 1);
    setDealView("decoder");
    track(isRedecode ? "quote_redecoded" : "quote_decoded", {
      source: d === MOCK_DEAL ? "demo" : "manual",
      vehicle: d.vehicle, leverage: d.junkTotal + d.taxError,
      has_trade: d.trade.offer > 0, underwater: d.negEq > 0,
    });
  };
  const requestNewQuote = () => {
    if (decodeCount >= 1 && !hasPass) openPaywall("second-decode", dealView, "capture");
    else setDealView("capture");
  };
  const goOutcome = (k) => {
    setDealView(k);
    track(k === "walked" ? "outcome_walked" : "outcome_signed", { vehicle: deal?.vehicle });
  };

  const leverage = deal ? deal.junkTotal + deal.taxError : null;
  const archetypeKey = archetype?.key || null;

  /* ---- gates before the main app ---- */
  if (!auth)
    return <Shell desktop={desktop}><Login onAuth={handleAuth} /></Shell>;

  if (!onboarded || editingGoal)
    return (
      <Shell desktop={desktop} context="YOUR GOAL">
        <Onboarding
          onConfirm={(arch, key) => {
            setArchetype({ ...arch, key });
            setOnboarded(true);
            setEditingGoal(false);
            setTab("shop");
            track("onboarding_completed", { archetype: arch.name });
          }}
        />
      </Shell>
    );

  /* Sits in front of the app, not at the front door: the guest is
     already inside and goes back to what they were doing either way. */
  if (signInAsk)
    return (
      <Shell desktop={desktop} context="SIGN IN">
        <SignInPrompt
          capability={signInAsk.capability}
          onSignedIn={(session) => {
            /* onAuthChange normally flips auth to "account" for us, but it
               never fires with no Supabase keys set — and the gate would
               then re-ask forever. Adopt the session here when we have one
               and fall back to a bare flip when we don't, so the prototype
               converts too. Either way this only adds: nothing the guest
               built is cleared. */
            if (session?.user) adoptSession(session.user);
            else setAuth("account");
            track("account_gate_converted", { capability: signInAsk.capability });
            const after = signInAsk.after;
            setSignInAsk(null);
            after?.();
          }}
          onClose={() => {
            track("account_gate_dismissed", { capability: signInAsk.capability });
            setSignInAsk(null);
          }}
        />
      </Shell>
    );

  const dv = tab === "dealer" ? dealView : tab;

  return (
    <Shell
      desktop={desktop}
      masthead={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {tab === "dealer" && dealView === "decoder" && (
            <>
              <button onClick={requestNewQuote} style={mastBtn}>+ NEW QUOTE</button>
              <button onClick={() => { setDealView("modes"); track("mode_switch_opened"); }} style={mastBtn}>MODES</button>
            </>
          )}
          {!(tab === "dealer" && dealView === "decoder") && (
            <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.inkSoft }}>
              {CONTEXT[dv] || ""}{hasPass && tab === "dealer" ? " · DEAL PASS" : ""}
            </span>
          )}
          <button
            onClick={() => setShowProfile(!showProfile)}
            aria-label="Profile"
            style={{
              display: "flex", alignItems: "center", gap: 6, minHeight: 30, padding: "0 8px",
              border: `1.5px solid ${showProfile ? C.accent : C.ink}`,
              background: showProfile ? C.accentTint : C.card,
              cursor: "pointer", color: C.ink,
            }}
          >
            <span style={{ fontFamily: heading, fontWeight: 600, fontSize: 13 }}>
              {auth === "guest" ? "G" : (userName || "D")[0].toUpperCase()}
            </span>
            <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.inkSoft }}>PROFILE</span>
          </button>
        </div>
      }
      tabs={
        <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
          {[["shop", "Shop"], ["garage", `Garage${cars.length ? ` (${cars.length})` : ""}`], ["dealer", "At the Dealer"]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setTab(k); setShowProfile(false); }}
              aria-current={tab === k && !showProfile ? "page" : undefined}
              style={{
                flex: 1, minHeight: 42, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                border: "none", borderBottom: tab === k && !showProfile ? `2px solid ${C.ink}` : "2px solid transparent",
                background: "none", color: tab === k && !showProfile ? C.ink : C.inkSoft,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {showProfile ? (
        <Profile
          name={userName} isGuest={auth === "guest"}
          archetypeName={archetype?.name} setup={setup} connections={connections}
          onConnect={connect} onDisconnect={disconnect}
          onSaveSetup={(s) => { setSetup(s); track("setup_updated"); }}
          onEditGoal={() => { setShowProfile(false); setEditingGoal(true); }}
          onSignOut={handleSignOut} onBack={() => setShowProfile(false)}
          onRequireAccount={requireAccount}
        />
      ) : (
        <>
          {tab === "shop" && (
            <Shop
              archetypeKey={archetypeKey} archetypeName={archetype?.name}
              setup={setup} savedIds={cars.map((c) => c.id)}
              onSave={(v) => addCar(v, "SHOPPED")}
              onOpenGoal={() => setEditingGoal(true)}
            />
          )}

          {tab === "garage" && (
            <Garage
              cars={cars} archetypeKey={archetypeKey} archetypeName={archetype?.name}
              onAdd={addCar} onRemove={removeCar} onRank={rankCar}
              onShop={() => setTab("shop")}
              onOpenDecode={() => { setTab("dealer"); setDealView(deal ? "decoder" : "capture"); }}
            />
          )}

          {tab === "dealer" && dealView === "capture" && (
            <CaptureFlow
              onSeeDecode={() => startDecode(MOCK_DEAL)}
              onManual={() => {
                if (decodeCount >= 1 && !hasPass) openPaywall("second-decode", "capture", "manual");
                else setDealView("manual");
              }}
            />
          )}
          {tab === "dealer" && dealView === "manual" && (
            <ManualEntry onDecode={startDecode} onBack={() => setDealView("capture")} />
          )}
          {tab === "dealer" && dealView === "decoder" && deal && (
            <Decoder
              deal={deal} hasPass={hasPass}
              onGate={(ctx) => openPaywall(ctx, "decoder")}
              onMedian={setMedian}
              onFreshStart={() => { setDealView("freshstart"); track("freshstart_viewed", { gap: deal.negEq }); }}
            />
          )}
          {tab === "dealer" && dealView === "decoder" && !deal && (
            <CaptureFlow onSeeDecode={() => startDecode(MOCK_DEAL)} onManual={() => setDealView("manual")} />
          )}
          {tab === "dealer" && dealView === "paywall" && (
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
          {tab === "dealer" && dealView === "modes" && deal && (
            <ModeSwitch mode={mode} setMode={setMode}
              onOpen={(m) => { setDealView(m); track("mode_opened", { mode: m }); }}
              onOutcome={goOutcome} />
          )}
          {tab === "dealer" && dealView === "prep" && deal && (
            <PrepMode deal={deal} median={median} onTable={() => { setMode("table"); setDealView("table"); track("mode_opened", { mode: "table" }); }} />
          )}
          {tab === "dealer" && dealView === "table" && deal && (
            <TableMode deal={deal} median={median} onFullDecode={() => setDealView("decoder")} />
          )}
          {tab === "dealer" && dealView === "walked" && deal && (
            <Walked deal={deal} median={median} onGarage={() => { setTab("garage"); setDealView("decoder"); }} />
          )}
          {tab === "dealer" && dealView === "receipt" && deal && (
            <Receipt deal={deal} median={median} onDone={() => { track("refi_watch_set"); setShowProfile(true); setDealView("decoder"); }} />
          )}
          {tab === "dealer" && dealView === "freshstart" && deal && (
            <FreshStart deal={deal} onStart={() => { track("freshstart_plan_started", { gap: deal.negEq }); setTab("garage"); setDealView("decoder"); }} />
          )}
        </>
      )}
    </Shell>
  );
}

const mastBtn = { fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.accentText, background: "none", border: `1px solid ${C.line}`, padding: "5px 8px", cursor: "pointer" };

function Shell({ masthead, tabs, context, children, desktop }) {
  return (
    <div style={{ background: desktop ? "#EFEEE8" : C.paper, height: "100vh", display: "flex", justifyContent: "center", fontFamily: sans, color: C.ink }}>
      <div style={{ width: "100%", maxWidth: desktop ? 760 : 520, background: C.paper, display: "flex", flexDirection: "column", minHeight: 0, borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}`, boxShadow: desktop ? "0 0 24px rgba(22,35,59,0.06)" : "none" }}>
        <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontFamily: heading, fontWeight: 600, fontSize: 19, letterSpacing: "0.01em" }}>DriverSide</span>
          {masthead || (
            <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.inkSoft }}>{context || "SIGN IN"}</span>
          )}
        </div>
        {tabs}
        {children}
      </div>
    </div>
  );
}
