import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { Landing } from "./Landing.jsx";
import "./styles.css";

const isDashboard = window.location.pathname === "/dashboard";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isDashboard ? <App /> : <Landing />}
  </React.StrictMode>,
);
