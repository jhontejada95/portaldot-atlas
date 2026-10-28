import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { Landing } from "./Landing.jsx";
import { Learn } from "./Learn.jsx";
import "./styles.css";

const isDashboard = window.location.pathname === "/dashboard";
const isLearn = window.location.pathname === "/learn";
const isLanding = window.location.pathname === "/" || window.location.pathname === "";

function NotFound() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px", background: "#f6f5f0", color: "#10233d", textAlign: "center", fontFamily: "Inter, sans-serif" }}><div><p style={{ color: "#1e4ed8", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", letterSpacing: ".12em" }}>ATLAS · 404</p><h1 style={{ margin: "12px 0", fontFamily: "Plus Jakarta Sans, Inter, sans-serif", fontSize: "clamp(38px, 8vw, 72px)" }}>Route not found.</h1><p style={{ maxWidth: "460px", margin: "0 auto 24px", color: "#5e7189", lineHeight: 1.6 }}>That path is not part of the Atlas map yet. Return to the public guide and choose a route.</p><a href="/" style={{ display: "inline-flex", padding: "12px 18px", borderRadius: "999px", color: "#fff", background: "#1e4ed8", textDecoration: "none", fontWeight: 700 }}>Back to Atlas</a></div></main>;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isDashboard ? <App /> : isLearn ? <Learn /> : isLanding ? <Landing /> : <NotFound />}
  </React.StrictMode>,
);
