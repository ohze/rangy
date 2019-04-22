import * as rangy from "rangy2";
export * from "./index";
import * as m from "./index";

declare module "rangy2" {
    const saveRange: typeof m.saveRange;
    const restoreRange: typeof m.restoreRange;
    const saveRanges: typeof m.saveRanges;
    const saveSelection: typeof m.saveSelection;
    const restoreRanges: typeof m.restoreRanges;
    const restoreSelection: typeof m.restoreSelection;
    const removeMarkerElement: typeof m.removeMarkerElement;
    const removeMarkers: typeof m.removeMarkers;
}
