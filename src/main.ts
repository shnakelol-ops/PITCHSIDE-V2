import "./style.css";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { PitchApp } from "./PitchApp";

const rootEl = document.querySelector<HTMLDivElement>("#app");
if (!rootEl) {
  throw new Error("Missing #app root element.");
}
createRoot(rootEl).render(createElement(PitchApp));
