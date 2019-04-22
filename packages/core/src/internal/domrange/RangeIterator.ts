// RangeIterator code partially borrows from IERange by Tim Ryan (http://github.com/timcameronryan/IERange)

import {DOMException} from "../../DOMException";
import * as dom from "../../dom";
import {
    isCharacterDataNode,
    getClosestAncestorIn,
    removeNode,
    getNodeLength,
    isOrIsAncestorOf
} from "../../dom";
import {
    // from ./util
    isNonTextPartiallySelected, RangeBase, updateBoundaries, getRangeDocument,
    // from ./part2
    DomRange
} from "./_";

import * as log4javascript from "log4javascript";
const log = log4javascript.getLogger("RangeIterator");

export interface IterableRange extends RangeBase {
    cloneRange(): IterableRange;
}

export class RangeIterator {
    protected ec: Node;
    protected eo: number;
    protected sc: Node;
    protected so: number;

    constructor(public range: IterableRange, public clonePartiallySelectedTextNodes) {
        log.info("New RangeIterator ", dom.inspectNode(range.startContainer), range.startOffset, dom.inspectNode(range.endContainer), range.endOffset);

        if (!range.collapsed) {
            this.sc = range.startContainer;
            this.so = range.startOffset;
            this.ec = range.endContainer;
            this.eo = range.endOffset;
            var root = range.commonAncestorContainer;

            if (this.sc === this.ec && isCharacterDataNode(this.sc)) {
                this.isSingleCharacterDataNode = true;
                this._first = this._last = this._next = this.sc;
            } else {
                this._first = this._next = (this.sc === root && !isCharacterDataNode(this.sc)) ?
                    this.sc.childNodes[this.so] : getClosestAncestorIn(this.sc, root, true);
                this._last = (this.ec === root && !isCharacterDataNode(this.ec)) ?
                    this.ec.childNodes[this.eo - 1] : getClosestAncestorIn(this.ec, root, true);
            }
            log.info("RangeIterator first and last", dom.inspectNode(this._first), dom.inspectNode(this._last));
        }
    }

    // TODO the following properties are migrated from RangeIterator.prototype
    // now, those are in RangeIterator's instance
    // so we can remove `detach` method
    protected _current: Node = null;
    protected _next: Node = null;
    _first: Node = null;
    _last: Node = null;
    isSingleCharacterDataNode = false;

    reset() {
        this._current = null;
        this._next = this._first;
    }

    hasNext() {
        return !!this._next;
    }

    detach() {
        this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
    }

    next() {
        // Move to next node
        let current: Node | CharacterData = this._current = this._next;
        if (current) {
            this._next = (current !== this._last) ? current.nextSibling : null;

            // Check for partially selected text nodes
            if (isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
                if (current === this.ec) {
                    current = current.cloneNode(true);
                    (current as CharacterData).deleteData(this.eo, (current as CharacterData).length - this.eo);
                }
                if (this._current === this.sc) {
                    current = current.cloneNode(true);
                    (current as CharacterData).deleteData(0, this.so);
                }
            }
        }

        return current;
    }

    remove() {
        var current = this._current, start, end;

        if (isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
            start = (current === this.sc) ? this.so : 0;
            end = (current === this.ec) ? this.eo : current.length;
            if (start != end) {
                current.deleteData(start, end - start);
            }
        } else {
            if (current.parentNode) {
                removeNode(current);
            } else {
                log.warn("Node to be removed has no parent node. Is this the child of an attribute node in Firefox 2?");
            }
        }
    }

    // Checks if the current node is partially selected
    isPartiallySelectedSubtree() {
        var current = this._current;
        return isNonTextPartiallySelected(current, this.range);
    }

    getSubtreeIterator() {
        var subRange;
        if (this.isSingleCharacterDataNode) {
            subRange = this.range.cloneRange();
            subRange.collapse(false);
        } else {
            subRange = new DomRange(getRangeDocument(this.range));
            var current = this._current;
            var startContainer = current, startOffset = 0, endContainer = current, endOffset = getNodeLength(current);

            if (isOrIsAncestorOf(current, this.sc)) {
                startContainer = this.sc;
                startOffset = this.so;
            }
            if (isOrIsAncestorOf(current, this.ec)) {
                endContainer = this.ec;
                endOffset = this.eo;
            }

            updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
        }
        return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
    }
} // RangeIterator

    export function cloneSubtree(iterator: RangeIterator) {
        var partiallySelected;
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
            partiallySelected = iterator.isPartiallySelectedSubtree();
            log.debug("cloneSubtree got node " + dom.inspectNode(node) + " from iterator. partiallySelected: " + partiallySelected);
            node = node.cloneNode(!partiallySelected);
            if (partiallySelected) {
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(cloneSubtree(subIterator));
                subIterator.detach();
            }

            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }

    export function iterateSubtree(iterator: RangeIterator, func: (node: Node) => boolean|void, iteratorState = { stop: false }): void {
        var it, n;
        for (var node, subIterator; node = iterator.next(); ) {
            if (iterator.isPartiallySelectedSubtree()) {
                if (func(node) === false) {
                    iteratorState.stop = true;
                    return;
                } else {
                    // The node is partially selected by the Range, so we can use a new RangeIterator on the portion of
                    // the node selected by the Range.
                    subIterator = iterator.getSubtreeIterator();
                    iterateSubtree(subIterator, func, iteratorState);
                    subIterator.detach();
                    if (iteratorState.stop) {
                        return;
                    }
                }
            } else {
                // The whole node is selected, so we can use efficient DOM iteration to iterate over the node and its
                // descendants
                it = dom.createIterator(node);
                while ( (n = it.next()) ) {
                    if (func(n) === false) {
                        iteratorState.stop = true;
                        return;
                    }
                }
            }
        }
    }

    export function deleteSubtree(iterator: RangeIterator): void {
        let subIterator;
        while (iterator.next()) {
            if (iterator.isPartiallySelectedSubtree()) {
                subIterator = iterator.getSubtreeIterator();
                deleteSubtree(subIterator);
                subIterator.detach();
            } else {
                iterator.remove();
            }
        }
    }

    export function extractSubtree(iterator: RangeIterator): DocumentFragment {
        log.debug("extract on iterator", iterator);
        for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
            log.debug("extractSubtree got node " + dom.inspectNode(node) + " from iterator. partiallySelected: " + iterator.isPartiallySelectedSubtree());

            if (iterator.isPartiallySelectedSubtree()) {
                node = node.cloneNode(false);
                subIterator = iterator.getSubtreeIterator();
                node.appendChild(extractSubtree(subIterator));
                subIterator.detach();
            } else {
                iterator.remove();
            }
            if (node.nodeType == 10) { // DocumentType
                throw new DOMException("HIERARCHY_REQUEST_ERR");
            }
            frag.appendChild(node);
        }
        return frag;
    }
