// https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de
// domrange, wrappedrange, wrappedselection are circularly depended on each other
// In consumer's code, pls import 'internal' instead of importing directly from those 3 modules.
export * from "./domrange/index";
export * from "./wrappedrange";
export * from "./wrappedselection";
