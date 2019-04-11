import {Module} from "./module";
import {config, features} from "./api";
import {DOMException} from "./DOMException";

import * as util from "./util";
import {Constructor, isHostMethod} from "./util";

import * as dom from "./dom";
import {DomPosition, getDocument, getBody} from "./dom";

//domrange, wrappedrange, wrappedselection are circular depend on each other
import {DomRange, rangesEqual, createNativeRange, createRange, WrappedRange} from "./internal";

import * as log4javascript from "log4javascript";

const module = new Module("WrappedSelection", ["DomRange", "WrappedRange"]);

// This module creates a selection object wrapper that conforms as closely as possible to the Selection specification
// in the HTML Editing spec (http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections)
// /* build:replaceWith(api) */rangy/* build:replaceEnd */.createCoreModule("WrappedSelection", ["DomRange", "WrappedRange"], function(api, module) {
    config.checkSelectionRanges = true;

    var BOOLEAN = "boolean";
    var NUMBER = "number";
    var log = log4javascript.getLogger("rangy.WrappedSelection");

    // Utility function to support direction parameters in the API that may be a string ("backward", "backwards",
    // "forward" or "forwards") or a Boolean (true for backwards).
    function isDirectionBackward(dir?) {
        return (typeof dir == "string") ? /^backward(s)?$/i.test(dir) : !!dir;
    }

    function getWindow(win, methodName) {
        if (!win) {
            return window;
        } else if (dom.isWindow(win)) {
            return win;
        } else if (win instanceof WrappedSelection) {
            return win.win;
        } else {
            var doc = dom.getContentDocument(win, module, methodName);
            return dom.getWindow(doc);
        }
    }

    export function getNativeSelection(winParam?): Selection {
        return getWindow(winParam, "getWinSelection").getSelection();
    }

    function winSelectionIsBackward(sel) {
        var backward = false;
        if (sel.anchorNode) {
            backward = (dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1);
        }
        return backward;
    }
    const selectionIsBackward = winSelectionIsBackward;

/** @deprecated always return true because we don't support TextRange / document.selection in old IE */
export function isSelectionValid() {
    return true;
}

// features. Always use window.getSelection
export const implementsWinGetSelection = true;
//features. document.selection should only be used for IE < 9 which rangy2 don't support
export const implementsDocSelection = false;

    var testSelection = getNativeSelection();

    // In Firefox, the selection is null in an iframe with display: none. See issue #138.
    if (!testSelection) {
        module.fail("Native selection was null (possibly issue 138?)");
        // return false;
    }

    var testRange = createNativeRange(document);
    var body = getBody(document);

    // Obtaining a range from a selection
//features
export const selectionHasAnchorAndFocus = util.areHostProperties(testSelection,
        ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);

    // Test for existence of native selection extend() method
//features
export const selectionHasExtend = isHostMethod(testSelection, "extend");

    // Test if rangeCount exists
//features
export const selectionHasRangeCount = (typeof testSelection.rangeCount == NUMBER);

//features
export let selectionSupportsMultipleRanges = false;
//features
export let collapsedNonEditableSelectionsSupported = true;

const addRangeBackwardToNative = selectionHasExtend
    ?   function(nativeSelection, range) {
            var doc = DomRange.getRangeDocument(range);
            var endRange = createRange(doc);
            endRange.collapseToPoint(range.endContainer, range.endOffset);
            nativeSelection.addRange(getNativeRange(endRange));
            nativeSelection.extend(range.startContainer, range.startOffset);
        }
    :   null;

// test to set collapsedNonEditableSelectionsSupported, selectionSupportsMultipleRanges
    if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) &&
            typeof testSelection.rangeCount == NUMBER && features.implementsDomRange) {

        (function() {
            // Previously an iframe was used but this caused problems in some circumstances in IE, so tests are
            // performed on the current document's selection. See issue 109.

            // Note also that if a selection previously existed, it is wiped and later restored by these tests. This
            // will result in the selection direction begin reversed if the original selection was backwards and the
            // browser does not support setting backwards selections (Internet Explorer, I'm looking at you).
            var sel = window.getSelection();
            if (sel) {
                // Store the current selection
                var originalSelectionRangeCount = sel.rangeCount;
                var selectionHasMultipleRanges = (originalSelectionRangeCount > 1);
                var originalSelectionRanges = [];
                var originalSelectionBackward = winSelectionIsBackward(sel);
                for (var i = 0; i < originalSelectionRangeCount; ++i) {
                    originalSelectionRanges[i] = sel.getRangeAt(i);
                }

                // Create some test elements
                var testEl = dom.createTestElement(document, "", false);
                var textNode = testEl.appendChild( document.createTextNode("\u00a0\u00a0\u00a0") );

                // Test whether the native selection will allow a collapsed selection within a non-editable element
                var r1 = document.createRange();

                r1.setStart(textNode, 1);
                r1.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r1);
                collapsedNonEditableSelectionsSupported = (sel.rangeCount == 1);
                sel.removeAllRanges();

                // Test whether the native selection is capable of supporting multiple ranges.
                if (!selectionHasMultipleRanges) {
                    // Doing the original feature test here in Chrome 36 (and presumably later versions) prints a
                    // console error of "Discontiguous selection is not supported." that cannot be suppressed. There's
                    // nothing we can do about this while retaining the feature test so we have to resort to a browser
                    // sniff. I'm not happy about it. See
                    // https://code.google.com/p/chromium/issues/detail?id=399791
                    var chromeMatch = window.navigator.appVersion.match(/Chrome\/(.*?) /);
                    if (chromeMatch && parseInt(chromeMatch[1]) >= 36) {
                        selectionSupportsMultipleRanges = false;
                    } else {
                        var r2 = r1.cloneRange();
                        r1.setStart(textNode, 0);
                        r2.setEnd(textNode, 3);
                        r2.setStart(textNode, 2);
                        sel.addRange(r1);
                        sel.addRange(r2);
                        selectionSupportsMultipleRanges = (sel.rangeCount == 2);
                    }
                }

                // Clean up
                dom.removeNode(testEl);
                sel.removeAllRanges();

                for (i = 0; i < originalSelectionRangeCount; ++i) {
                    if (i == 0 && originalSelectionBackward) {
                        if (addRangeBackwardToNative) {
                            addRangeBackwardToNative(sel, originalSelectionRanges[i]);
                        } else {
                            console.log("Rangy initialization: original selection was backwards but selection has been restored forwards because the browser does not support Selection.extend");
                            sel.addRange(originalSelectionRanges[i]);
                        }
                    } else {
                        sel.addRange(originalSelectionRanges[i]);
                    }
                }
            }
        })();
    }

    // ControlRanges
//features
export let implementsControlRange = false;

    if (body && isHostMethod(body, "createControlRange")) {
        let testControlRange = body.createControlRange();
        if (util.areHostProperties(testControlRange, ["item", "add"])) {
            implementsControlRange = true;
        }
    }

    // Selection collapsedness
let selectionIsCollapsed =
    selectionHasAnchorAndFocus
        ? function(sel) {
            return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
        }
        : function(sel) {
            return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
        };

    function updateAnchorAndFocusFromRange(sel, range, backward) {
        var anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
        sel.anchorNode = range[anchorPrefix + "Container"];
        sel.anchorOffset = range[anchorPrefix + "Offset"];
        sel.focusNode = range[focusPrefix + "Container"];
        sel.focusOffset = range[focusPrefix + "Offset"];
    }

    function updateAnchorAndFocusFromNativeSelection(sel) {
        var nativeSel = sel.nativeSelection;
        sel.anchorNode = nativeSel.anchorNode;
        sel.anchorOffset = nativeSel.anchorOffset;
        sel.focusNode = nativeSel.focusNode;
        sel.focusOffset = nativeSel.focusOffset;
    }

    function updateEmptySelection(sel) {
        sel.anchorNode = sel.focusNode = null;
        sel.anchorOffset = sel.focusOffset = 0;
        sel.rangeCount = 0;
        sel.isCollapsed = true;
        sel._ranges.length = 0;
    }

    function getNativeRange(range) {
        var nativeRange;
        if (range instanceof DomRange) {
            nativeRange = createNativeRange(range.getDocument());
            nativeRange.setEnd(range.endContainer, range.endOffset);
            nativeRange.setStart(range.startContainer, range.startOffset);
        } else if (range instanceof WrappedRange) {
            nativeRange = range.nativeRange;
        } else if (features.implementsDomRange && (range instanceof dom.getWindow(range.startContainer).Range)) {
            nativeRange = range;
        }
        return nativeRange;
    }

    var getSelectionRangeAt;

    if (isHostMethod(testSelection, "getRangeAt")) {
        // try/catch is present because getRangeAt() must have thrown an error in some browser and some situation.
        // Unfortunately, I didn't write a comment about the specifics and am now scared to take it out. Let that be a
        // lesson to us all, especially me.
        getSelectionRangeAt = function(sel, index) {
            try {
                return sel.getRangeAt(index);
            } catch (ex) {
                return null;
            }
        };
    } else if (selectionHasAnchorAndFocus) {
        getSelectionRangeAt = function(sel) {
            var doc = getDocument(sel.anchorNode);
            var range = createRange(doc);
            range.setStartAndEnd(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);

            // Handle the case when the selection was selected backwards (from the end to the start in the
            // document)
            if (range.collapsed !== this.isCollapsed) {
                range.setStartAndEnd(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset);
            }

            return range;
        };
    }

    function deleteProperties(sel) {
        sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
        sel.rangeCount = sel.anchorOffset = sel.focusOffset = 0;
        sel.detached = true;
    }

    var cachedRangySelections = [];

    function actOnCachedSelection(win, action?) {
        var i = cachedRangySelections.length, cached, sel;
        while (i--) {
            cached = cachedRangySelections[i];
            sel = cached.selection;
            if (action == "deleteAll") {
                deleteProperties(sel);
            } else if (cached.win == win) {
                if (action == "delete") {
                    cachedRangySelections.splice(i, 1);
                    return true;
                } else {
                    return sel;
                }
            }
        }
        if (action == "deleteAll") {
            cachedRangySelections.length = 0;
        }
        return null;
    }

    export function getSelection(win?) {
        // Check if the parameter is a Rangy Selection object
        if (win && win instanceof WrappedSelection) {
            win.refresh();
            return win;
        }

        win = getWindow(win, "getNativeSelection");

        var sel = actOnCachedSelection(win);
        var nativeSel = getNativeSelection(win);
        if (sel) {
            sel.nativeSelection = nativeSel;
            sel.refresh();
        } else {
            sel = new WrappedSelection(nativeSel, win);
            cachedRangySelections.push( { win: win, selection: sel } );
        }
        return sel;
    };

    var refreshSelection;

    if (isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == NUMBER) {
        refreshSelection = function(sel) {
                sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
                if (sel.rangeCount) {
                    for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                        sel._ranges[i] = new WrappedRange(sel.nativeSelection.getRangeAt(i));
                    }
                    updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
                    sel.isCollapsed = selectionIsCollapsed(sel);
                } else {
                    updateEmptySelection(sel);
                }
        };
    } else if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && features.implementsDomRange) {
        refreshSelection = function(sel) {
            var range, nativeSel = sel.nativeSelection;
            if (nativeSel.anchorNode) {
                range = getSelectionRangeAt(nativeSel, 0);
                sel._ranges = [range];
                sel.rangeCount = 1;
                updateAnchorAndFocusFromNativeSelection(sel);
                sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
                updateEmptySelection(sel);
            }
        };
    } else {
        module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
        //return false;
    }

// WrappedSelection.prototype = api.selectionPrototype;
export class WrappedSelBase {
    _ranges = [];
    readonly rangeCount: number;
    readonly anchorNode: Node | null;
    readonly anchorOffset: number;
    isCollapsed: boolean;

    constructor(public nativeSelection: Selection, public win) {
        //@deprecated the old rangy2 constructor form: (nativeSelection, docSelection: null, win)
        if (arguments.length == 3) {
            this.win = arguments[2];
        }
        (this as any as WrappedSelection).refresh();
    }
}

function createWrappedSelection<TBase extends Constructor<WrappedSelBase>>(Base: TBase) {
        function addRangeBackward(sel, range) {
            addRangeBackwardToNative(sel.nativeSelection, range);
            sel.refresh();
        };
        const addRange = selectionHasRangeCount
            ? function(range, direction?) {
                    if (isDirectionBackward(direction) && selectionHasExtend) {
                        addRangeBackward(this, range);
                    } else {
                        var previousRangeCount;
                        if (selectionSupportsMultipleRanges) {
                            previousRangeCount = this.rangeCount;
                        } else {
                            this.removeAllRanges();
                            previousRangeCount = 0;
                        }
                        // Clone the native range so that changing the selected range does not affect the selection.
                        // This is contrary to the spec but is the only way to achieve consistency between browsers. See
                        // issue 80.
                        var clonedNativeRange = getNativeRange(range).cloneRange();
                        try {
                            this.nativeSelection.addRange(clonedNativeRange);
                        } catch (ex) {
                            log.error("Native addRange threw error '" + ex + "' with range " + DomRange.inspect(clonedNativeRange), ex);
                        }

                        // Check whether adding the range was successful
                        this.rangeCount = this.nativeSelection.rangeCount;

                        if (this.rangeCount == previousRangeCount + 1) {
                            // The range was added successfully

                            // Check whether the range that we added to the selection is reflected in the last range extracted from
                            // the selection
                            if (config.checkSelectionRanges) {
                                var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
                                if (nativeRange && !rangesEqual(nativeRange, range)) {
                                    // Happens in WebKit with, for example, a selection placed at the start of a text node
                                    range = new WrappedRange(nativeRange);
                                }
                            }
                            this._ranges[this.rangeCount - 1] = range;
                            updateAnchorAndFocusFromRange(this, range, selectionIsBackward(this.nativeSelection));
                            this.isCollapsed = selectionIsCollapsed(this);
                        } else {
                            // The range was not added successfully. The simplest thing is to refresh
                            this.refresh();
                        }
                    }
            }
            : function(range, direction?) {
                if (isDirectionBackward(direction) && selectionHasExtend) {
                    addRangeBackward(this, range);
                } else {
                    this.nativeSelection.addRange(getNativeRange(range));
                    this.refresh();
                }
            };

    // Removal of a single range
    function removeRangeManually(sel, range) {
        var ranges = sel.getAllRanges();
        sel.removeAllRanges();
        for (var i = 0, len = ranges.length; i < len; ++i) {
            if (!rangesEqual(range, ranges[i])) {
                sel.addRange(ranges[i]);
            }
        }
        if (!sel.rangeCount) {
            updateEmptySelection(sel);
        }
    };

    function assertNodeInSameDocument(sel, node) {
        if (sel.win.document != getDocument(node)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    function createStartOrEndSetter(isStart) {
        return function(node, offset) {
            var range;
            if (this.rangeCount) {
                range = this.getRangeAt(0);
                range["set" + (isStart ? "Start" : "End")](node, offset);
            } else {
                range = createRange(this.win.document);
                range.setStartAndEnd(node, offset);
            }
            this.setSingleRange(range, this.isBackward());
        };
    }

    return class S extends Base {
        removeAllRanges() {
            this.nativeSelection.removeAllRanges();
            updateEmptySelection(this);
        };

        //if (selectionHasRangeCount) {
        addRange = addRange;

        setRanges(ranges) {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    this.addRange(ranges[i]);
                }
        };

    getRangeAt(index) {
        if (index < 0 || index >= this.rangeCount) {
            throw new DOMException("INDEX_SIZE_ERR");
        } else {
            // Clone the range to preserve selection-range independence. See issue 80.
            return this._ranges[index].cloneRange();
        }
    };
    refresh(checkForChanges?) {
        var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
        var oldAnchorNode = this.anchorNode, oldAnchorOffset = this.anchorOffset;

        refreshSelection(this);
        if (checkForChanges) {
            // Check the range count first
            var i = oldRanges.length;
            if (i != this._ranges.length) {
                log.debug("Selection.refresh: Range count has changed: was " + i + ", is now " + this._ranges.length);
                return true;
            }

            // Now check the direction. Checking the anchor position is the same is enough since we're checking all the
            // ranges after this
            if (this.anchorNode != oldAnchorNode || this.anchorOffset != oldAnchorOffset) {
                log.debug("Selection.refresh: anchor different, so selection has changed");
                return true;
            }

            // Finally, compare each range in turn
            while (i--) {
                if (!rangesEqual(oldRanges[i], this._ranges[i])) {
                    log.debug("Selection.refresh: Range at index " + i + " has changed: was " + oldRanges[i].inspect() + ", is now " + this._ranges[i].inspect());
                    return true;
                }
            }
            return false;
        }
    };

        removeRange(range) {
            removeRangeManually(this, range);
        };


        isBackward() {
            return selectionIsBackward(this);
        };

    // Create an alias for backwards compatibility. From 1.3, everything is "backward" rather than "backwards"
    isBackwards = this.isBackward;

    // Selection stringifier
    // This is conformant to the old HTML5 selections draft spec but differs from WebKit and Mozilla's implementation.
    // The current spec does not yet define this method.
    toString() {
        log.debug("selection toString called");
        var rangeTexts = [];
        for (var i = 0, len = this.rangeCount; i < len; ++i) {
            rangeTexts[i] = "" + this._ranges[i];
        }
        return rangeTexts.join("");
    };

    // No current browser conforms fully to the spec for this method, so Rangy's own method is always used
    collapse(node, offset) {
        assertNodeInSameDocument(this, node);
        var range = createRange(node);
        range.collapseToPoint(node, offset);
        this.setSingleRange(range);
        this.isCollapsed = true;
    };

    collapseToStart() {
        if (this.rangeCount) {
            var range = this._ranges[0];
            this.collapse(range.startContainer, range.startOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    collapseToEnd() {
        if (this.rangeCount) {
            var range = this._ranges[this.rangeCount - 1];
            this.collapse(range.endContainer, range.endOffset);
        } else {
            throw new DOMException("INVALID_STATE_ERR");
        }
    };

    // The spec is very specific on how selectAllChildren should be implemented and not all browsers implement it as
    // specified so the native implementation is never used by Rangy.
    selectAllChildren(node) {
        assertNodeInSameDocument(this, node);
        var range = createRange(node);
        range.selectNodeContents(node);
        this.setSingleRange(range);
    };

    deleteFromDocument() {
        if (this.rangeCount) {
            var ranges = this.getAllRanges();
            if (ranges.length) {
                this.removeAllRanges();
                for (var i = 0, len = ranges.length; i < len; ++i) {
                    ranges[i].deleteContents();
                }
                // The spec says nothing about what the selection should contain after calling deleteContents on each
                // range. Firefox moves the selection to where the final selected range was, so we emulate that
                this.addRange(ranges[len - 1]);
            }
        }
    };

    // The following are non-standard extensions
    eachRange(func, returnValue?) {
        for (var i = 0, len = this._ranges.length; i < len; ++i) {
            if ( func( this.getRangeAt(i) ) ) {
                return returnValue;
            }
        }
    };

    getAllRanges() {
        var ranges = [];
        this.eachRange(function(range) {
            ranges.push(range);
        });
        return ranges;
    };

    setSingleRange(range, direction?) {
        this.removeAllRanges();
        this.addRange(range, direction);
    };

    callMethodOnEachRange(methodName, params?) {
        var results = [];
        this.eachRange( function(range) {
            results.push( range[methodName].apply(range, params || []) );
        } );
        return results;
    };

    setStart = createStartOrEndSetter(true);
    setEnd = createStartOrEndSetter(false);

    changeEachRange(func) {
        var ranges = [];
        var backward = this.isBackward();

        this.eachRange(function(range) {
            func(range);
            ranges.push(range);
        });

        this.removeAllRanges();
        if (backward && ranges.length == 1) {
            this.addRange(ranges[0], "backward");
        } else {
            this.setRanges(ranges);
        }
    };

    containsNode(node, allowPartial) {
        return this.eachRange( function(range) {
            return range.containsNode(node, allowPartial);
        }, true ) || false;
    };

    getBookmark(containerNode) {
        return {
            backward: this.isBackward(),
            rangeBookmarks: this.callMethodOnEachRange("getBookmark", [containerNode])
        };
    };

    moveToBookmark(bookmark) {
        var selRanges = [];
        for (var i = 0, rangeBookmark, range; rangeBookmark = bookmark.rangeBookmarks[i++]; ) {
            range = createRange(this.win);
            range.moveToBookmark(rangeBookmark);
            selRanges.push(range);
        }
        if (bookmark.backward) {
            this.setSingleRange(selRanges[0], "backward");
        } else {
            this.setRanges(selRanges);
        }
    };

    saveRanges() {
        return {
            backward: this.isBackward(),
            ranges: this.callMethodOnEachRange("cloneRange")
        };
    };

    restoreRanges(selRanges) {
        this.removeAllRanges();
        for (var i = 0, range; range = selRanges.ranges[i]; ++i) {
            this.addRange(range, (selRanges.backward && i == 0));
        }
    };

    toHtml() {
        var rangeHtmls = [];
        this.eachRange(function(range) {
            rangeHtmls.push( DomRange.toHtml(range) );
        });
        return rangeHtmls.join("");
    };

    static inspect(sel) {
        var rangeInspects = [];
        var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
        var focus = new DomPosition(sel.focusNode, sel.focusOffset);
        var name = (typeof sel.getName == "function") ? sel.getName() : "Selection";

        if (typeof sel.rangeCount != "undefined") {
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
            }
        }
        return "[" + name + "(Ranges: " + rangeInspects.join(", ") +
                ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";
    }

    getName() {
        return "WrappedSelection";
    };

    inspect() {
        return S.inspect(this);
    };

    detach() {
        actOnCachedSelection(this.win, "delete");
        deleteProperties(this);
    };

    static detachAll() {
        actOnCachedSelection(null, "deleteAll");
    };

    static isDirectionBackward = isDirectionBackward;
    }
}

export const WrappedSelection = createWrappedSelection(WrappedSelBase);
// export type WrappedSelection = InstanceType<typeof WrappedSelection>;
export interface WrappedSelection extends InstanceType<typeof WrappedSelection>{};
//alias
export const Selection = WrappedSelection;
export interface Selection extends WrappedSelection{};

export function shimGetSelection(win?) {
        if(!win) win = window;
        if (typeof win.getSelection == "undefined") {
            win.getSelection = function() {
                return getSelection(win);
            };
        }
    };
