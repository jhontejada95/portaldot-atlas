import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { Landing } from "./Landing.jsx";
import { Learn } from "./Learn.jsx";
import "./styles.css";

const isDashboard = window.location.pathname === "/dashboard";
const isLearn = window.location.pathname === "/learn";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isDashboard ? <App /> : isLearn ? <Learn /> : <Landing />}
  </React.StrictMode>,
);
