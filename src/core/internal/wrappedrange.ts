import {isHostMethod} from "../util";
import {onDocReady} from '../api';
import {Module} from "../module";
import {getBody, getContentDocument, getNodeLength} from '../dom';

import {createPrototypeRange, rangeProperties, RangeBase, RangyRange} from "./_";

import * as log4javascript from "log4javascript";

const module = new Module("WrappedRange", ["DomRange"]);

// Wrappers for the browser's native DOM Range implementation
// /* build:replaceWith(api) */rangy/* build:replaceEnd */.createCoreModule("WrappedRange", ["DomRange"], function(api, module) {
    var log = log4javascript.getLogger("rangy.WrappedRange");

    /*----------------------------------------------------------------------------------------------------------------*/

    // if (api.features.implementsDomRange) {
        // This is a wrapper around the browser's native DOM Range. It has two aims:
        // - Provide workarounds for specific browser bugs
        // - provide convenient extensions, which are inherited from Rangy's DomRange

            function updateRangeProperties(range: WrappedRange) {
                for(const prop of rangeProperties) {
                    range[prop] = range.nativeRange[prop];
                }
                // Fix for broken collapsed property in IE 9.
                range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
            }

            function updateNativeRange(range, startContainer, startOffset, endContainer, endOffset) {
                var startMoved = (range.startContainer !== startContainer || range.startOffset != startOffset);
                var endMoved = (range.endContainer !== endContainer || range.endOffset != endOffset);
                var nativeRangeDifferent = !range.equals(range.nativeRange);

                // Always set both boundaries for the benefit of IE9 (see issue 35)
                if (startMoved || endMoved || nativeRangeDifferent) {
                    range.setEnd(endContainer, endOffset);
                    range.setStart(startContainer, startOffset);
                }
            }

export class WrappedRange extends createPrototypeRange(RangeBase, updateNativeRange) /*implements WrappedRangeBase*/ {
            constructor(public nativeRange: Range) {
                super();
                if (!nativeRange) {
                    throw module.createError("WrappedRange: Range must be specified");
                }
                updateRangeProperties(this);
            }
            // nativeRange: Range; //declare here
            selectNode(node) {
                this.nativeRange.selectNode(node);
                updateRangeProperties(this);
            };

            cloneContents() {
                return this.nativeRange.cloneContents();
            };

            // Due to a long-standing Firefox bug that I have not been able to find a reliable way to detect,
            // insertNode() is never delegated to the native range.

            surroundContents(node) {
                this.nativeRange.surroundContents(node);
                updateRangeProperties(this);
            };

            collapse(isStart) {
                this.nativeRange.collapse(isStart);
                updateRangeProperties(this);
            };

            cloneRange() {
                return new WrappedRange(this.nativeRange.cloneRange());
            };

            refresh() {
                updateRangeProperties(this);
            };

            toString() {
                return this.nativeRange.toString();
            };

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for Firefox 2 bug that prevents moving the start of a Range to a point after its current end and
            // correct for it
            // note: rangy2 don't support Firefox <= 2

                setStart(node, offset) {
                    this.nativeRange.setStart(node, offset);
                    updateRangeProperties(this);
                };

                setEnd(node, offset) {
                    this.nativeRange.setEnd(node, offset);
                    updateRangeProperties(this);
                };

            private static createBeforeAfterNodeSetter(name) {
                    return function(node) {
                        this.nativeRange[name](node);
                        updateRangeProperties(this);
                    };
            }

            setStartBefore = WrappedRange.createBeforeAfterNodeSetter("setStartBefore");
            setStartAfter = WrappedRange.createBeforeAfterNodeSetter("setStartAfter");
            setEndBefore = WrappedRange.createBeforeAfterNodeSetter("setEndBefore");
            setEndAfter = WrappedRange.createBeforeAfterNodeSetter("setEndAfter");

            /*--------------------------------------------------------------------------------------------------------*/

            // Always use DOM4-compliant selectNodeContents implementation: it's simpler and less code than testing
            // whether the native implementation can be trusted
            selectNodeContents(node) {
                //implement in domrange
                this.setStartAndEnd(node, 0, getNodeLength(node));
            };

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for and correct WebKit bug that has the behaviour of compareBoundaryPoints round the wrong way for
            // constants START_TO_END and END_TO_START: https://bugs.webkit.org/show_bug.cgi?id=20738
            // note: this bug is fixed in 2008, so rangy2 don't test this

            compareBoundaryPoints(how: number, sourceRange: RangyRange): number {
                return this.nativeRange.compareBoundaryPoints(how, (sourceRange as any).nativeRange || sourceRange);
            }

            /*--------------------------------------------------------------------------------------------------------*/


            getName() {
                return "WrappedRange";
            };
        }
// Object.assign(WrappedRange, comparisonConstants);

// change WrappedRange.{deleteContents, extractContents, createContextualFragment} if need
function docReadyHandler(): void {
            // Create test range and node for feature detection

            var testTextNode = document.createTextNode("test");
            getBody(document).appendChild(testTextNode);
            var range = document.createRange();

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for IE deleteContents() and extractContents() bug and correct it. See issue 107.

            var el = document.createElement("div");
            el.innerHTML = "123";
            var textNode = el.firstChild as CharacterData;
            var body = getBody(document);
            body.appendChild(el);

            range.setStart(textNode, 1);
            range.setEnd(textNode, 2);
            range.deleteContents();

            let rangeProto = WrappedRange.prototype;
            if (textNode.data == "13") {
                // Behaviour is correct per DOM4 Range so wrap the browser's implementation of deleteContents() and
                // extractContents()
                rangeProto.deleteContents = function() {
                    this.nativeRange.deleteContents();
                    updateRangeProperties(this);
                };

                rangeProto.extractContents = function() {
                    var frag = this.nativeRange.extractContents();
                    updateRangeProperties(this);
                    return frag;
                };
            } else {
                log.info("Incorrect native Range deleteContents() implementation. Using Rangy's own.")
            }

            body.removeChild(el);

            /*--------------------------------------------------------------------------------------------------------*/

            // Test for existence of createContextualFragment and delegate to it if it exists
            if (isHostMethod(range, "createContextualFragment")) {
                rangeProto.createContextualFragment = function(fragmentStr) {
                    return this.nativeRange.createContextualFragment(fragmentStr);
                };
            }

            /*--------------------------------------------------------------------------------------------------------*/

            // Clean up
            body.removeChild(testTextNode);
            body = null;
}

onDocReady(docReadyHandler);

            export function createNativeRange(doc?: Document | HTMLIFrameElement| Window): Range {
                doc = getContentDocument(doc, module, "createNativeRange");
                return doc.createRange();
            };

    export function createRange(doc?) {
        doc = getContentDocument(doc, module, "createRange");
        return new WrappedRange(createNativeRange(doc));
    };

    export function shimCreateRange(win?) {
        if(!win) win = window;
        var doc = win.document;
        if (typeof doc.createRange == "undefined") {
            doc.createRange = function() {
                return createRange(doc);
            };
        }
    }
