/**
 * Rangy, a cross-browser JavaScript range and selection library
 * https://github.com/timdown/rangy
 *
 * Copyright %%build:year%%, Tim Down
 * Licensed under the MIT license.
 * Version: %%build:version%%
 * Build date: %%build:date%%
 */
import {shimCreateRange} from "./wrappedrange";

export * from "./api";
import * as util from "./util";
export {util};

export * from "./DOMException";
import * as dom from "./dom";
export {dom};

export * from "./domrange";

export * from "./wrappedrange";

export * from "./wrappedselection";
import {shimGetSelection, WrappedSelection} from "./wrappedselection";
export type Selection = InstanceType<typeof WrappedSelection>;
export function shim(win?) {
    win = win || window;
    shimCreateRange(win);
    shimGetSelection(win);
}