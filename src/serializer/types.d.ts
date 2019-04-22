// this file will be copy to dist/<module>/index.d.ts when running scripts/tsc.ts
import * as rangy from "rangy2";
export * from "./index";
import * as m from "./index";

declare module "rangy2" {
    const nodeToInfoString: typeof m.nodeToInfoString;
    const getElementChecksum: typeof m.getElementChecksum;
    const serializePosition: typeof m.serializePosition;
    const deserializePosition: typeof m.deserializePosition;
    const serializeRange: typeof m.serializeRange;
    const deserializeRange: typeof m.deserializeRange;
    const canDeserializeRange: typeof m.canDeserializeRange;
    const serializeSelection: typeof m.serializeSelection;
    const deserializeSelection: typeof m.deserializeSelection;
    const canDeserializeSelection: typeof m.canDeserializeSelection;
    const restoreSelectionFromCookie: typeof m.restoreSelectionFromCookie;
    const saveSelectionCookie: typeof m.saveSelectionCookie;
}
