// this file will be copy to dist/<module>/index.d.ts when running scripts/tsc.ts
import * as rangy from "rangy2";
export * from "./index";
import * as m from "./index";

declare module "rangy2" {
    const registerHighlighterType: typeof m.registerHighlighterType;
    const createHighlighter: typeof m.createHighlighter;
    type Highlighter = m.Highlighter;
    const Highlighter: typeof m.Highlighter;
}
