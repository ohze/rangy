// this file will be copy to dist/<module>/index.d.ts when running scripts/tsc.ts
import * as rangy from "rangy2";
export * from "./index";
import * as m from "./index";

declare module "rangy2" {
    type ClassApplier = m.ClassApplier;
    const ClassApplier: typeof m.ClassApplier;

    type CssClassApplier = m.ClassApplier;
    const CssClassApplier: typeof m.ClassApplier;

    const createClassApplier: typeof m.createClassApplier;
}
