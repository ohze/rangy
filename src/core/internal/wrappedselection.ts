import {Module} from "../module";
import {config, features} from "../api";
import {DOMException} from "../DOMException";

import * as util from "../util";
import {Constructor, isHostMethod} from "../util";

import * as dom from "../dom";
import {DomPosition, getDocument} from "../dom";

import {
    DomRange, RangeBase, RangyRange, rangesEqual,
    createNativeRange, createRange, WrappedRange, RangyRangeEx
} from "./_";

import * as log4javascript from "log4javascript";
const log = log4javascript.getLogger("rangy.WrappedSelection");

const module = new Module("WrappedSelection", ["DomRange", "WrappedRange"]);

// This module creates a selection object wrapper that conforms as closely as possible to the Selection specification
// in the HTML Editing spec (http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections)
// /* build:replaceWith(api) */rangy/* build:replaceEnd */.createCoreModule("WrappedSelection", ["DomRange", "WrappedRange"], function(api, module) {
    var BOOLEAN = "boolean";
    var NUMBER = "number";

    // Utility function to support direction parameters in the API that may be a string ("backward", "backwards",
    // "forward" or "forwards") or a Boolean (true for backwards).
    function isDirectionBackward(dir?: string|boolean) {
        return (typeof dir == "string") ? /^backward(s)?$/i.test(dir) : !!dir;
    }

    function getWindow(win, methodName: string): Window {
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

    function winSelectionIsBackward(sel: RangySel | Selection): boolean {
        let backward = false;
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

    var testSelection = getNativeSelection();

    // In Firefox, the selection is null in an iframe with display: none. See issue #138.
    if (!testSelection) {
        module.fail("Native selection was null (possibly issue 138?)");
        // return false;
    }

    var testRange = createNativeRange(document);

    // Obtaining a range from a selection
const selectionHasAnchorAndFocus =
    features.selectionHasAnchorAndFocus =
        util.areHostProperties(testSelection, ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);

    // Test for existence of native selection extend() method
const selectionHasExtend =
    features.selectionHasExtend =
        isHostMethod(testSelection, "extend");

    // Test if rangeCount exists
const selectionHasRangeCount =
    features.selectionHasRangeCount =
        (typeof testSelection.rangeCount == NUMBER);

const addRangeBackwardToNative = selectionHasExtend
    ?   function(nativeSelection: Selection, range: AbstractRange) {
            var doc = DomRange.getRangeDocument(range);
            var endRange = createRange(doc);
            endRange.collapseToPoint(range.endContainer, range.endOffset);
            nativeSelection.addRange(getNativeRange(endRange));
            nativeSelection.extend(range.startContainer, range.startOffset);
        }
    :   null;

    // Selection collapsedness
let selectionIsCollapsed =
    selectionHasAnchorAndFocus
        ? function(sel) {
            return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
        }
        : function(sel) {
            return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
        };

    function updateAnchorAndFocusFromRange(sel: WrappedSelection, range, backward) {
        const anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
        sel.anchorNode = range[anchorPrefix + "Container"];
        sel.anchorOffset = range[anchorPrefix + "Offset"];
        sel.focusNode = range[focusPrefix + "Container"];
        sel.focusOffset = range[focusPrefix + "Offset"];
    }

    function updateAnchorAndFocusFromNativeSelection(sel: WrappedSelection) {
        const nativeSel = sel.nativeSelection;
        sel.anchorNode = nativeSel.anchorNode;
        sel.anchorOffset = nativeSel.anchorOffset;
        sel.focusNode = nativeSel.focusNode;
        sel.focusOffset = nativeSel.focusOffset;
    }

    function updateEmptySelection(sel: WrappedSelection) {
        sel.anchorNode = sel.focusNode = null;
        sel.anchorOffset = sel.focusOffset = 0;
        sel.rangeCount = 0;
        sel.isCollapsed = true;
        sel._ranges.length = 0;
    }

    function getNativeRange(range: DomRange | WrappedRange | RangeBase): Range {
        var nativeRange;
        if (range instanceof DomRange) {
            nativeRange = createNativeRange(range.getDocument());
            nativeRange.setEnd(range.endContainer, range.endOffset);
            nativeRange.setStart(range.startContainer, range.startOffset);
        } else if (range instanceof WrappedRange) {
            nativeRange = range.nativeRange;
        // } else if (features.implementsDomRange && ((range as any) instanceof dom.getWindow(range.startContainer).Range)) {
        } else if (range instanceof Range) {
            nativeRange = range;
        }
        return nativeRange;
    }

    let getSelectionRangeAt: undefined | ((sel: Selection|RangySel, index: number) => RangyRange | Range | null);

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
        getSelectionRangeAt = function(sel, index) {
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

    function deleteProperties(sel: WrappedSelection) {
        sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
        sel.rangeCount = sel.anchorOffset = sel.focusOffset = 0;
        sel.detached = true;
    }

    interface Cached {
        win: Window;
        selection: WrappedSelection;
    }
    const cachedRangySelections: Cached[] = [];

    function actOnCachedSelection(win: Window|null, action?: "deleteAll" | "delete"): true | null | WrappedSelection {
        let i = cachedRangySelections.length,
            cached: Cached,
            sel: WrappedSelection;
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

    export function getSelection(win?: Window | WrappedSelection | Document): WrappedSelection {
        // Check if the parameter is a Rangy Selection object
        if (win && win instanceof WrappedSelection) {
            win.refresh();
            return win;
        }

        win = getWindow(win, "getNativeSelection");

        let sel = actOnCachedSelection(win) as WrappedSelection | null;
        var nativeSel = getNativeSelection(win);
        if (sel) {
            sel.nativeSelection = nativeSel;
            sel.refresh();
        } else {
            sel = new WrappedSelection(nativeSel, win);
            cachedRangySelections.push( { win: win, selection: sel } );
        }
        return sel;
    }

    let refreshSelection: (sel: WrappedSelection) => void;

    if (isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == NUMBER) {
        refreshSelection = function(sel: WrappedSelection) {
                sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
                if (sel.rangeCount) {
                    for (let i = 0, len = sel.rangeCount; i < len; ++i) {
                        const r = sel.nativeSelection.getRangeAt(i) as any as Range;
                        sel._ranges[i] = new WrappedRange(r);
                    }
                    updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
                    sel.isCollapsed = selectionIsCollapsed(sel);
                } else {
                    updateEmptySelection(sel);
                }
        };
    } else if (selectionHasAnchorAndFocus &&
        typeof testSelection.isCollapsed == BOOLEAN &&
        typeof testRange.collapsed == BOOLEAN)
    {
        refreshSelection = function(sel: WrappedSelection) {
            const nativeSel = sel.nativeSelection;
            if (nativeSel.anchorNode) {
                const range = getSelectionRangeAt(nativeSel, 0) as WrappedRange; //FIXME is safe to cast this?
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

// function createWrappedSelection<TBase extends Constructor<WrappedSelBase>>(Base: TBase) {
        function addRangeBackward(sel: WrappedSelection, range: AbstractRange) {
            addRangeBackwardToNative(sel.nativeSelection, range);
            sel.refresh();
        };
        const addRange = selectionHasRangeCount
            ? function(this: WrappedSelection, range: RangyRangeEx, direction?: string|boolean): void {
                    if (isDirectionBackward(direction) && selectionHasExtend) {
                        addRangeBackward(this, range);
                    } else {
                        var previousRangeCount;
                        if (features.selectionSupportsMultipleRanges) {
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
                                var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1) as Range;
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
            : function(this: WrappedSelection, range: RangyRangeEx, direction?: string|boolean): void {
                if (isDirectionBackward(direction) && selectionHasExtend) {
                    addRangeBackward(this, range);
                } else {
                    this.nativeSelection.addRange(getNativeRange(range));
                    this.refresh();
                }
            };

    // Removal of a single range
    function removeRangeManually(sel: WrappedSelection, range) {
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
    /** omit some member from interface Selection from `lib.dom.d.ts` */
    interface RangySel {
        readonly anchorNode: Node | null;
        readonly anchorOffset: number;
        readonly focusNode: Node | null;
        readonly focusOffset: number;
        readonly isCollapsed: boolean;
        readonly rangeCount: number;
        // readonly type: string;
        addRange(range: RangyRangeEx, direction?: string|boolean): void;
        collapse(node: Node | null, offset?: number): void;
        collapseToEnd(): void;
        collapseToStart(): void;
        containsNode(node: Node, allowPartialContainment?: boolean): boolean;
        deleteFromDocument(): void;
        empty(): void;
        // extend(node: Node, offset?: number): void;
        getRangeAt(index: number): RangyRangeEx;
        removeAllRanges(): void;
        removeRange(range: Range): void;
        selectAllChildren(node: Node): void;
        // setBaseAndExtent(anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number): void;
        // setPosition(node: Node | null, offset?: number): void;
    }
    export class WrappedSelection implements RangySel {
        anchorNode: Node | null;
        anchorOffset: number;
        focusNode: Node | null;
        focusOffset: number;
        isCollapsed: boolean;
        rangeCount: number;

        _ranges: RangyRangeEx[] = [];
        detached?: boolean;

        constructor(public nativeSelection: Selection, public win: Window) {
            //@deprecated the old rangy2 constructor form: (nativeSelection, docSelection: null, win)
            if (arguments.length == 3) {
                this.win = arguments[2];
            }
            (this as any as WrappedSelection).refresh();
        }

        removeAllRanges() {
            this.nativeSelection.removeAllRanges();
            updateEmptySelection(this);
        };
        empty = this.removeAllRanges;

        //if (selectionHasRangeCount) {
        addRange = addRange;

        setRanges(ranges: WrappedRange[]): void {
                this.removeAllRanges();
                for (const range of ranges) {
                    this.addRange(range);
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
    refresh(checkForChanges?: boolean): boolean {
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


        isBackward(): boolean {
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
    eachRange(func: (range, i?: number) => boolean|void, returnValue?) {
        for (let i = 0, len = this._ranges.length; i < len; ++i) {
            if ( func( this.getRangeAt(i), i ) ) {
                return returnValue;
            }
        }
    };

    getAllRanges(): WrappedRange[] {
        const ranges = [];
        this.eachRange(function(range) {
            ranges.push(range);
        });
        return ranges;
    };

    setSingleRange(range: RangyRangeEx, direction?) {
        this.removeAllRanges();
        this.addRange(range, direction);
    };

    callMethodOnEachRange(methodName: string, params?) {
        const results = [];
        this.eachRange( function(range) {
            results.push( range[methodName].apply(range, params || []) );
        } );
        return results;
    };

    setStart = createStartOrEndSetter(true);
    setEnd = createStartOrEndSetter(false);

    changeEachRange(func: (r: WrappedRange) => void) {
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

    restoreRanges(selRanges): void {
        this.removeAllRanges();
        for (let i = 0, range; range = selRanges.ranges[i]; ++i) {
            this.addRange(range, (selRanges.backward && i == 0));
        }
    };

    toHtml(): string {
        const rangeHtmls = [];
        this.eachRange(function(range) {
            rangeHtmls.push( DomRange.toHtml(range) );
        });
        return rangeHtmls.join("");
    };

    static inspect(sel: RangySel | Selection): string {
        var rangeInspects = [];
        var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
        var focus = new DomPosition(sel.focusNode, sel.focusOffset);
        var name = (typeof (sel as any).getName == "function") ? (sel as any).getName() : "Selection";

        if (typeof sel.rangeCount != "undefined") {
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
            }
        }
        return "[" + name + "(Ranges: " + rangeInspects.join(", ") +
                ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";
    }

    getName(): string {
        return "WrappedSelection";
    };

    inspect(): string {
        return WrappedSelection.inspect(this);
    };

    detach(): void {
        actOnCachedSelection(this.win, "delete");
        deleteProperties(this);
    };

    static detachAll() {
        actOnCachedSelection(null, "deleteAll");
    };

    static isDirectionBackward = isDirectionBackward;
}

export function shimGetSelection(win?) {
        if(!win) win = window;
        if (typeof win.getSelection == "undefined") {
            win.getSelection = function() {
                return getSelection(win);
            };
        }
    };
