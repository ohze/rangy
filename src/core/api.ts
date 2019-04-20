const UNDEF = "undefined";

export const version = "%%build:version%%";
export const isBrowser = typeof window != UNDEF && typeof document != UNDEF;
if (!isBrowser) {
    console.log("Rangy can only run in a browser");
}
export interface Features {
    /** @deprecated always support */
    implementsDomRange: true;
    /** @deprecated always dont support IE < 9 */
    implementsTextRange: false;
    /** @deprecated always don't support IE 6, 7, Pre-Blink Opera */
    htmlParsingConforms: true;
    /** @deprecated
     * Test for IE's crash (IE 6/7) or exception (IE >= 8) when a reference to garbage-collected text node is queried
     * rangy2 don't support IE < 9. I have tested in browserstack.com with updated IE => not crash */
    crashyTextNodes: false;
    /** Always use window.getSelection */
    implementsWinGetSelection: true;
    /** document.selection should only be used for IE < 9 which rangy2 don't support */
    implementsDocSelection: false;
    selectionHasAnchorAndFocus?: boolean;
    selectionHasExtend?: boolean;
    selectionHasRangeCount?: boolean;
    selectionSupportsMultipleRanges: boolean;
    implementsControlRange: false;
    collapsedNonEditableSelectionsSupported: boolean;
}
export const features: Features = {
    implementsDomRange: true,
    implementsTextRange: false,
    htmlParsingConforms: true,
    crashyTextNodes: false,
    implementsWinGetSelection: true,
    implementsDocSelection: false,
    selectionSupportsMultipleRanges: false,
    implementsControlRange: false,
    collapsedNonEditableSelectionsSupported: true,
};
export interface Config {
    /** @deprecated range2 don't have TextRange */
    preferTextRange: false;
    checkSelectionRanges: boolean;
}
export const config: Config = {
    preferTextRange: false,
    checkSelectionRanges: true,
};
    // RangePrototype,
    // rangePrototype: new RangePrototype(),
    // selectionPrototype: new SelectionPrototype(),

export function onDocReady(listener: () => void) {
    if (!isBrowser) return;
    if (document.readyState == "complete") {
        listener();
    } else {
        let onLoaded = function () {
            document.removeEventListener("DOMContentLoaded", onLoaded, false);
            listener();
        };
        document.addEventListener("DOMContentLoaded", onLoaded, false);
    }
}
