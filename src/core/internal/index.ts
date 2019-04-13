// domrange, wrappedrange, wrappedselection are circularly depended on each other
// so, those 3 modules are bundled together into lib/core/internal.js
// In consumer's code, pls import 'internal' instead of importing directly from those 3 modules.
export * from "./domrange";
export * from "./wrappedrange";
export * from "./wrappedselection";
