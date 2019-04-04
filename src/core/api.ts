const UNDEF = "undefined";

// // TODO remove
// // Ensure rangy.rangePrototype and rangy.selectionPrototype are available immediately
// export class RangePrototype {}
// class SelectionPrototype {}

export const version = "%%build:version%%";
export const isBrowser = typeof window != UNDEF && typeof document != UNDEF;
if (!isBrowser) {
    console.log("Rangy can only run in a browser");
}
export const features = {
    implementsDomRange: true, // always support
    implementsTextRange: false, // dont support IE < 9
    htmlParsingConforms: true, // don't support IE 6, 7, Pre-Blink Opera
    // Test for IE's crash (IE 6/7) or exception (IE >= 8) when a reference to garbage-collected text node is queried
    // rangy2 don't support IE < 9. I have tested in browserstack.com with updated IE => not crash
    crashyTextNodes: false,
};
export const config = {
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
