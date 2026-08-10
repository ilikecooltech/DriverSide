import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/* A blank screen is the worst failure this product can have: a buyer
   standing in a finance office learns nothing from it, and it destroys
   the trust the whole brand runs on. Any render crash shows a readable
   message and a way out instead. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("DriverSide crashed:", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ fontFamily: "Barlow, system-ui, sans-serif", background: "#FAF9F4", color: "#16233B", minHeight: "100vh", padding: 24, boxSizing: "border-box" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 26, marginBottom: 8 }}>
          Something broke on our end.
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: "#5A6478", marginBottom: 16 }}>
          Your saved cars and your goal are safe on this device. Reloading usually fixes it.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ minHeight: 48, padding: "0 18px", border: "none", background: "#5980a6", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 17, letterSpacing: "0.03em", cursor: "pointer" }}
        >
          RELOAD
        </button>
        <pre style={{ marginTop: 20, fontSize: 11, color: "#B23A2E", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, Menlo, monospace" }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
