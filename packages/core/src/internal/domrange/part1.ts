import {Constructor} from "../../util";
import {DOMException} from "../../DOMException";
import * as dom from '../../dom';
import {
    comparePoints,
    getDocument,
    getNodeIndex, getNodeLength,
    getRootContainer,
    isCharacterDataNode,
    isOrIsAncestorOf,
    splitDataNode,
    DomPosition
} from "../../dom";

import {
    // from ./util
    assertNode, assertNodeNotReadOnly, assertRangeValid, assertSameDocumentOrFragment, assertValidNodeType,
    getRangeDocument, insertableNodeTypes, isNonTextPartiallySelected, isRangeValid,
    RangeBase, rangeProperties, surroundNodeTypes,
    // from ./RangeIterator
    cloneSubtree, IterableRange, iterateSubtree, RangeIterator,
    // from ./part2
    DomRange
} from "./_";

import {createRange, getSelection} from "../_";

import * as log4javascript from "log4javascript";
const log = log4javascript.getLogger("DomRangeBase");

    function getRangeRoot(range) {
        return getRootContainer(range.startContainer);
    }

    function insertNodeAtPosition(node, n, o) {
        var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
        if (isCharacterDataNode(n)) {
            if (o == n.length) {
                dom.insertAfter(node, n);
            } else {
                n.parentNode.insertBefore(node, o == 0 ? n : splitDataNode(n, o));
            }
        } else if (o >= n.childNodes.length) {
            n.appendChild(node);
        } else {
            n.insertBefore(node, n.childNodes[o]);
        }
        return firstNodeInserted;
    }

    function rangesIntersect(rangeA: AbstractRange, rangeB: AbstractRange, touchingIsIntersecting) {
        assertRangeValid(rangeA);
        assertRangeValid(rangeB);

        if (getRangeDocument(rangeB) != getRangeDocument(rangeA)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }

        var startComparison = comparePoints(rangeA.startContainer, rangeA.startOffset, rangeB.endContainer, rangeB.endOffset),
            endComparison = comparePoints(rangeA.endContainer, rangeA.endOffset, rangeB.startContainer, rangeB.startOffset);

        return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
    }

    function getNodesInRange(range: IterableRange, nodeTypes: number[], filter?: (n: Node) => boolean): Node[] {
        var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
        var filterExists = !!filter;
        if (filterNodeTypes) {
            regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
        }

        var nodes = [];
        iterateSubtree(new RangeIterator(range, false), function(node) {
            if (filterNodeTypes && !regex.test(node.nodeType.toString())) {
                return;
            }
            if (filterExists && !filter(node)) {
                return;
            }
            // Don't include a boundary container if it is a character data node and the range does not contain any
            // of its character data. See issue 190.
            var sc = range.startContainer;
            if (node == sc && isCharacterDataNode(sc) && range.startOffset == sc.length) {
                return;
            }

            var ec = range.endContainer;
            if (node == ec && isCharacterDataNode(ec) && range.endOffset == 0) {
                return;
            }

            nodes.push(node);
        });
        return nodes;
    }

export function rangeInspect(range): string {
        var name = (typeof range.getName == "undefined") ? "Range" : range.getName();
        return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " +
                dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
    }


export function rangeToHtml(range: {
    readonly commonAncestorContainer: Node;
    cloneContents(): DocumentFragment
}): string {
        assertRangeValid(range);
        var container = range.commonAncestorContainer.parentNode.cloneNode(false) as Element;
        container.appendChild( range.cloneContents() );
        return container.innerHTML;
    }

/*----------------------------------------------------------------------------------------------------------------*/

const s2s = 0, s2e = 1, e2e = 2, e2s = 3;
const n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;

export const comparisonConstants = {
    START_TO_START: s2s,
    START_TO_END: s2e,
    END_TO_END: e2e,
    END_TO_START: e2s,

    NODE_BEFORE: n_b,
    NODE_AFTER: n_a,
    NODE_BEFORE_AND_AFTER: n_b_a,
    NODE_INSIDE: n_i,
};
export type ComparisonConstants = typeof comparisonConstants;

/**
 * @deprecated please replace by: `class C extends createPrototypeRange(..){..} Object.assign(C, comparisonConstants)`
 * @param C constructor (a class)
 */
export function copyComparisonConstants(C) {
    Object.assign(C, comparisonConstants);
    Object.assign(C.prototype, comparisonConstants);
}

/*----------------------------------------------------------------------------------------------------------------*/
// `interface Range` (see lib.dom.d.ts) is split to:
// + ComparisonConstants
// + RangeP1 - which is implemented here in `function createDomRangeP1`
// + RangeP2 - which is implemented in "./index.ts" in `function createDomRange`
// + RangeUnImpl - which is unimplemented (also in rangy1)
// + `RangeBase extends AbstractRange` which is implement in `class RangeBase`. see "./util.ts"

/** The Range interface represents a fragment of a document that can contain nodes and parts of text nodes. */
export interface RangeP1 {
    cloneContents(): DocumentFragment;
    cloneRange(): RangyRangeEx;
    compareBoundaryPoints(how: number, sourceRange: RangyRange): number;
    /**
     * Returns −1 if the point is before the range, 0 if the point is
     * in the range, and 1 if the point is after the range.
     */
    comparePoint(node: Node, offset: number): number;
    createContextualFragment(fragment: string): DocumentFragment;
    detach(): void;
    insertNode(node: Node): void;
    /**
     * Returns whether range intersects node.
     * @param touchingIsIntersecting determines whether this method considers a node that borders a range intersects
     * with it (as in WebKit) or not (as in Gecko pre-1.9, and the default)
     */
    intersectsNode(node: Node, touchingIsIntersecting?: boolean): boolean;
    isPointInRange(node: Node, offset: number): boolean;
    surroundContents(newParent: Node): void;
}
export interface RangeP1Ex extends RangeP1 {
    canSurroundContents(): boolean;
    toString(): string;
    /**
     * @deprecated
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Range/compareNode
     * @param node
     */
    compareNode(node: Node): 0|1|2|3;
    toHtml(): string;
    /** Sharing a boundary start-to-end or end-to-start does not count as intersection */
    intersectsRange(range: AbstractRange): boolean;
    /** Sharing a boundary start-to-end or end-to-start does count as intersection */
    intersectsOrTouchesRange(range: AbstractRange): boolean;
    intersection(range: RangyRange): RangyRange | null;
    union(range: RangyRange): RangyRangeEx;
    containsNode(node: Node, allowPartial?: boolean): boolean;
    containsNodeContents(node: Node): boolean;
    containsRange(range: RangyRangeEx): boolean;
    containsNodeText(node: Node): boolean;
    getNodes(nodeTypes: number[], filter?: (n: Node) => boolean): Node[];
    getDocument(): Document;
    collapseBefore(node: Node): void;
    collapseAfter(node: Node): void;
    getBookmark(containerNode: Node): Bookmark;
    moveToBookmark(bookmark: Bookmark): void;
    getName(): string;
    equals(range: AbstractRange): boolean;
    isValid(): boolean;
    inspect(): string;
    select(this: RangyRangeEx, direction?): void;
}
export interface Bookmark {
    start: number;
    end: number;
    containerNode: Node;
}

export interface RangeP2 {
    collapse(toStart?: boolean): void;
    deleteContents(): void;
    extractContents(): DocumentFragment;
    selectNode(node: Node): void;
    selectNodeContents(node: Node): void;
    setEnd(node: Node, offset: number): void;
    setEndAfter(node: Node): void;
    setEndBefore(node: Node): void;
    setStart(node: Node, offset: number): void;
    setStartAfter(node: Node): void;
    setStartBefore(node: Node): void;
}
export interface RangeP2Ex extends RangeP2 {
    /**
     * Convenience method to set a range's start and end boundaries. Overloaded as follows:
     * - Two parameters (node, offset) creates a collapsed range at that position
     * - Three parameters (node, startOffset, endOffset) creates a range contained with node starting at
     *   startOffset and ending at endOffset
     * - Four parameters (startNode, startOffset, endNode, endOffset) creates a range starting at startOffset in
     *   startNode and ending at endOffset in endNode
     */
    setStartAndEnd(...args): void;
    setBoundary(node: Node, offset: number, isStart: boolean): void;
    splitBoundaries(this: RangyRangeEx): void;
    splitBoundariesPreservingPositions(this: RangyRangeEx, positionsToPreserve?: DomPosition[]): void;
    normalizeBoundaries(): void;
    collapseToPoint(node: Node, offset: number): void;
    parentElement(): Node|null;
}

interface RangeUnImpl {
    getBoundingClientRect(): ClientRect | DOMRect;
    getClientRects(): ClientRectList | DOMRectList;
}

export type RangyRange = RangeBase & RangeP1 & RangeP2 & ComparisonConstants;
export type RangyRangeEx = RangyRange & RangeP1Ex & RangeP2Ex;
/*----------------------------------------------------------------------------------------------------------------*/

export function createDomRangeP1<TBase extends Constructor<RangeP2 & RangeBase>>(Base: TBase) {
    return class extends Base implements RangeP1Ex {
        compareBoundaryPoints(how: number, range: RangyRange): number {
            assertRangeValid(this);
            assertSameDocumentOrFragment(this.startContainer, range.startContainer);

            var nodeA, offsetA, nodeB, offsetB;
            var prefixA = (how == e2s || how == s2s) ? "start" : "end";
            var prefixB = (how == s2e || how == s2s) ? "start" : "end";
            nodeA = this[prefixA + "Container"];
            offsetA = this[prefixA + "Offset"];
            nodeB = range[prefixB + "Container"];
            offsetB = range[prefixB + "Offset"];
            return comparePoints(nodeA, offsetA, nodeB, offsetB);
        }

        insertNode(node: Node): void {
            assertRangeValid(this);
            assertValidNodeType(node, insertableNodeTypes);
            assertNodeNotReadOnly(this.startContainer);

            if (isOrIsAncestorOf(node, this.startContainer)) {
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }

            // No check for whether the container of the start of the Range is of a type that does not allow
            // children of the type of node: the browser's DOM implementation should do this for us when we attempt
            // to add the node

            var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
            this.setStartBefore(firstNodeInserted);
        }

        cloneContents(): DocumentFragment {
            assertRangeValid(this);

            var clone, frag;
            if (this.collapsed) {
                return getRangeDocument(this).createDocumentFragment();
            } else {
                if (this.startContainer === this.endContainer && isCharacterDataNode(this.startContainer)) {
                    clone = this.startContainer.cloneNode(true);
                    clone.data = clone.data.slice(this.startOffset, this.endOffset);
                    frag = getRangeDocument(this).createDocumentFragment();
                    frag.appendChild(clone);
                    return frag;
                } else {
                    var iterator = new RangeIterator(this, true);
                    clone = cloneSubtree(iterator);
                    iterator.detach();
                }
                return clone;
            }
        }

        canSurroundContents() {
            assertRangeValid(this);
            assertNodeNotReadOnly(this.startContainer);
            assertNodeNotReadOnly(this.endContainer);

            // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
            // no non-text nodes.
            // see https://developer.mozilla.org/en-US/docs/Web/API/Range/surroundContents
            var iterator = new RangeIterator(this, true);
            var boundariesInvalid = (iterator._first && isNonTextPartiallySelected(iterator._first, this) ||
                    (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
            iterator.detach();
            return !boundariesInvalid;
        }

        surroundContents(newParent: Node): void {
            assertValidNodeType(newParent, surroundNodeTypes);

            if (!this.canSurroundContents()) {
                throw new DOMException("INVALID_STATE_ERR");
            }

            // Extract the contents
            var content = this.extractContents();

            // Clear the children of the node
            if (newParent.hasChildNodes()) {
                while (newParent.lastChild) {
                    newParent.removeChild(newParent.lastChild);
                }
            }

            // Insert the new node and add the extracted contents
            insertNodeAtPosition(newParent, this.startContainer, this.startOffset);
            newParent.appendChild(content);

            this.selectNode(newParent);
        }

        cloneRange(): RangyRangeEx {
            assertRangeValid(this);
            var range = new DomRange(getRangeDocument(this));
            for(const prop of rangeProperties) {
                range[prop] = this[prop];
            }
            return range;
        }

        toString() {
            assertRangeValid(this);
            var sc = this.startContainer;
            if (sc === this.endContainer && isCharacterDataNode(sc)) {
                return (sc.nodeType == 3 || sc.nodeType == 4) ? sc.data.slice(this.startOffset, this.endOffset) : "";
            } else {
                var textParts = [], iterator = new RangeIterator(this, true);
                log.info("toString iterator: " + dom.inspectNode(iterator._first) + ", " + dom.inspectNode(iterator._last));
                iterateSubtree(iterator, function(node) {
                    // Accept only text or CDATA nodes, not comments
                    if (node.nodeType == 3 || node.nodeType == 4) {
                        textParts.push((node as CharacterData).data);
                    }
                });
                iterator.detach();
                return textParts.join("");
            }
        }

        // The methods below are all non-standard. The following batch were introduced by Mozilla but have since
        // been removed from Mozilla.
        compareNode(node: Node): 0|1|2|3 {
            assertRangeValid(this);

            var parent = node.parentNode;
            var nodeIndex = getNodeIndex(node);

            if (!parent) {
                throw new DOMException("NOT_FOUND_ERR");
            }

            var startComparison = this.comparePoint(parent, nodeIndex),
                endComparison = this.comparePoint(parent, nodeIndex + 1);

            if (startComparison < 0) { // Node starts before
                return (endComparison > 0) ? n_b_a : n_b;
            } else {
                return (endComparison > 0) ? n_a : n_i;
            }
        }

        /**
         * Returns −1 if the point is before the range, 0 if the point is
         * in the range, and 1 if the point is after the range.
         */
        comparePoint(node: Node, offset: number): number {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            if (comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
                return -1;
            } else if (comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
                return 1;
            }
            return 0;
        }

        // Implementation as per HTML parsing spec, trusting in the browser's implementation of innerHTML. See
        // discussion and base code for this implementation at issue 67.
        // Spec: http://html5.org/specs/dom-parsing.html#extensions-to-the-range-interface
        // Thanks to Aleks Williams.
        createContextualFragment(fragment: string): DocumentFragment {
            // "Let node the context object's start's node."
            var node = this.startContainer;
            var doc = getDocument(node);

            // "If the context object's start's node is null, raise an INVALID_STATE_ERR
            // exception and abort these steps."
            if (!node) {
                throw new DOMException("INVALID_STATE_ERR");
            }

            // "Let element be as follows, depending on node's interface:"
            // Document, Document Fragment: null
            var el = null;

            // "Element: node"
            if (node.nodeType == 1) {
                el = node;

            // "Text, Comment: node's parentElement"
            } else if (isCharacterDataNode(node)) {
                el = dom.parentElement(node);
            }

            // "If either element is null or element's ownerDocument is an HTML document
            // and element's local name is "html" and element's namespace is the HTML
            // namespace"
            if (el === null || (
                el.nodeName == "HTML" &&
                dom.isHtmlNamespace(getDocument(el).documentElement) &&
                dom.isHtmlNamespace(el)
            )) {

            // "let element be a new Element with "body" as its local name and the HTML
            // namespace as its namespace.""
                el = doc.createElement("body");
            } else {
                el = el.cloneNode(false);
            }

            // "If the node's document is an HTML document: Invoke the HTML fragment parsing algorithm."
            // "If the node's document is an XML document: Invoke the XML fragment parsing algorithm."
            // "In either case, the algorithm must be invoked with fragment as the input
            // and element as the context element."
            el.innerHTML = fragment;

            // "If this raises an exception, then abort these steps. Otherwise, let new
            // children be the nodes returned."

            // "Let fragment be a new DocumentFragment."
            // "Append all new children to fragment."
            // "Return fragment."
            return dom.fragmentFromNodeChildren(el);
        }

        toHtml() {
            return rangeToHtml(this);
        }

        // touchingIsIntersecting determines whether this method considers a node that borders a range intersects
        // with it (as in WebKit) or not (as in Gecko pre-1.9, and the default)
        intersectsNode(node: Node, touchingIsIntersecting?: boolean): boolean {
            assertRangeValid(this);
            if (getRootContainer(node) != getRangeRoot(this)) {
                return false;
            }

            var parent = node.parentNode, offset = getNodeIndex(node);
            if (!parent) {
                return true;
            }

            var startComparison = comparePoints(parent, offset, this.endContainer, this.endOffset),
                endComparison = comparePoints(parent, offset + 1, this.startContainer, this.startOffset);

            return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
        }

        isPointInRange(node: Node, offset: number): boolean {
            assertRangeValid(this);
            assertNode(node, "HIERARCHY_REQUEST_ERR");
            assertSameDocumentOrFragment(node, this.startContainer);

            return (comparePoints(node, offset, this.startContainer, this.startOffset) >= 0) &&
                   (comparePoints(node, offset, this.endContainer, this.endOffset) <= 0);
        }

        // The methods below are non-standard and invented by me.

        intersectsRange(range: AbstractRange): boolean {
            return rangesIntersect(this, range, false);
        }

        intersectsOrTouchesRange(range: AbstractRange): boolean {
            return rangesIntersect(this, range, true);
        }

        intersection(range: RangyRange): RangyRange | null {
            if (this.intersectsRange(range)) {
                var startComparison = comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset),
                    endComparison = comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);

                var intersectionRange = this.cloneRange();
                log.info("intersection", this.inspect(), (range as any).inspect(), startComparison, endComparison);
                if (startComparison == -1) {
                    intersectionRange.setStart(range.startContainer, range.startOffset);
                }
                if (endComparison == 1) {
                    intersectionRange.setEnd(range.endContainer, range.endOffset);
                }
                return intersectionRange;
            }
            return null;
        }

        union(range: RangyRange): RangyRangeEx {
            if (this.intersectsOrTouchesRange(range)) {
                var unionRange = this.cloneRange();
                if (comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
                    unionRange.setStart(range.startContainer, range.startOffset);
                }
                if (comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
                    unionRange.setEnd(range.endContainer, range.endOffset);
                }
                return unionRange;
            } else {
                throw new DOMException("Ranges do not intersect");
            }
        }

        containsNode(node: Node, allowPartial?: boolean): boolean {
            if (allowPartial) {
                return this.intersectsNode(node, false);
            } else {
                return this.compareNode(node) == n_i;
            }
        }

        containsNodeContents(node: Node): boolean {
            return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, getNodeLength(node)) <= 0;
        }

        containsRange(range: RangyRangeEx): boolean {
            var intersection = this.intersection(range);
            return intersection !== null && range.equals(intersection);
        }

        containsNodeText(node: Node): boolean {
            var nodeRange = this.cloneRange() as RangyRangeEx;
            nodeRange.selectNode(node);
            var textNodes = nodeRange.getNodes([3]) as CharacterData[];
            if (textNodes.length > 0) {
                nodeRange.setStart(textNodes[0], 0);
                var lastTextNode = textNodes.pop();
                nodeRange.setEnd(lastTextNode, lastTextNode.length);
                return this.containsRange(nodeRange);
            } else {
                return this.containsNodeContents(node);
            }
        }

        getNodes(nodeTypes: number[], filter?: (n: Node) => boolean): Node[] {
            assertRangeValid(this);
            return getNodesInRange(this, nodeTypes, filter);
        }

        getDocument() {
            return getRangeDocument(this);
        }

        collapseBefore(node: Node): void {
            this.setEndBefore(node);
            this.collapse(false);
        }

        collapseAfter(node: Node): void {
            this.setStartAfter(node);
            this.collapse(true);
        }

        getBookmark(containerNode: Node): Bookmark {
            var doc = getRangeDocument(this);
            var preSelectionRange = createRange(doc);
            containerNode = containerNode || dom.getBody(doc);
            preSelectionRange.selectNodeContents(containerNode);
            var range = this.intersection(preSelectionRange);
            var start = 0, end = 0;
            if (range) {
                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                start = preSelectionRange.toString().length;
                end = start + range.toString().length;
            }

            return {
                start: start,
                end: end,
                containerNode: containerNode
            };
        }

        moveToBookmark(bookmark: Bookmark): void {
            var containerNode = bookmark.containerNode;
            var charIndex = 0;
            this.setStart(containerNode, 0);
            this.collapse(true);
            var nodeStack = [containerNode], node, foundStart = false, stop = false;
            var nextCharIndex, i, childNodes;

            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType == 3) {
                    nextCharIndex = charIndex + node.length;
                    if (!foundStart && bookmark.start >= charIndex && bookmark.start <= nextCharIndex) {
                        this.setStart(node, bookmark.start - charIndex);
                        foundStart = true;
                    }
                    if (foundStart && bookmark.end >= charIndex && bookmark.end <= nextCharIndex) {
                        this.setEnd(node, bookmark.end - charIndex);
                        stop = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    childNodes = node.childNodes;
                    i = childNodes.length;
                    while (i--) {
                        nodeStack.push(childNodes[i]);
                    }
                }
            }
        }

        getName(): string {
            return "DomRange";
        }

        equals(range: AbstractRange): boolean {
            return rangesEqual(this, range);
        }

        isValid(): boolean {
            return isRangeValid(this);
        }

        inspect(): string {
            return rangeInspect(this);
        }

        detach(): void {
            // In DOM4, detach() is now a no-op.
        }

        // in rangy1, this method is implement in wrappedselection.js
        select(this: RangyRangeEx, direction?): void {
            getSelection( this.getDocument() ).setSingleRange(this, direction);
        }
    }
} // createDomRangeP1

export function rangesEqual(r1: AbstractRange, r2: AbstractRange) {
    return r1.startContainer === r2.startContainer &&
        r1.startOffset === r2.startOffset &&
        r1.endContainer === r2.endContainer &&
        r1.endOffset === r2.endOffset;
}
