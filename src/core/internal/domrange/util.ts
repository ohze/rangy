import {DOMException} from "../../DOMException";
import * as dom from "../../dom";
import {getDocument, getRootContainer, isCharacterDataNode, isOrIsAncestorOf} from "../../dom";

export function isNonTextPartiallySelected(node: Node, range: AbstractRange) {
    return (node.nodeType != 3) &&
        (isOrIsAncestorOf(node, range.startContainer) || isOrIsAncestorOf(node, range.endContainer));
}
/*----------------------------------------------------------------------------------------------------------------*/

export const beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
export const rootContainerNodeTypes = [2, 9, 11];
const readonlyNodeTypes = [5, 6, 10, 12];
export const insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
export const surroundNodeTypes = [1, 3, 4, 5, 7, 8];

    function createAncestorFinder(nodeTypes: number[]) {
        return function(node: Node, selfIsAncestor: boolean): Node | null {
            var t, n = selfIsAncestor ? node : node.parentNode;
            while (n) {
                t = n.nodeType;
                if (nodeTypes.includes(t)) {
                    return n;
                }
                n = n.parentNode;
            }
            return null;
        };
    }

const getDocumentOrFragmentContainer = createAncestorFinder( [9, 11] );
const getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
const getDocTypeNotationEntityAncestor = createAncestorFinder( [6, 10, 12] );
export const getElementAncestor = createAncestorFinder( [1] );

    export function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
        if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
            throw new DOMException("INVALID_NODE_TYPE_ERR");
        }
    }

    export function assertValidNodeType(node, invalidTypes) {
        if (!invalidTypes.includes(node.nodeType)) {
            throw new DOMException("INVALID_NODE_TYPE_ERR");
        }
    }

    export function assertValidOffset(node, offset) {
        if (offset < 0 || offset > (isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
            throw new DOMException("INDEX_SIZE_ERR");
        }
    }

    export function assertSameDocumentOrFragment(node1, node2) {
        if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
            throw new DOMException("WRONG_DOCUMENT_ERR");
        }
    }

    export function assertNodeNotReadOnly(node) {
        if (getReadonlyAncestor(node, true)) {
            throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
        }
    }

    export function assertNode(node: Node, codeName: string) {
        if (!node) {
            throw new DOMException(codeName);
        }
    }

    function isValidOffset(node, offset) {
        return offset <= (isCharacterDataNode(node) ? node.length : node.childNodes.length);
    }

    export function isRangeValid(range) {
        return (!!range.startContainer && !!range.endContainer &&
                getRootContainer(range.startContainer) == getRootContainer(range.endContainer) &&
                isValidOffset(range.startContainer, range.startOffset) &&
                isValidOffset(range.endContainer, range.endOffset));
    }

    export function assertRangeValid(range) {
        if (!isRangeValid(range)) {
            throw new Error("Range error: Range is not valid. This usually happens after DOM mutation. Range: (" + range.inspect() + ")");
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/
export function getRangeDocument(range: AbstractRange): Document {
    return (range as DomRangeBase).document || getDocument(range.startContainer);
}

export interface BoundaryUpdater {
    (range: RangeBase,
     startContainer: Node,
     startOffset: number,
     endContainer: Node,
     endOffset: number): void
}

// Updates commonAncestorContainer and collapsed after boundary change
function updateCollapsedAndCommonAncestor(range: RangeBase) {
    range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
    range.commonAncestorContainer = range.collapsed ?
        range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
}

export function updateBoundaries(range: DomRangeBase,
                                 startContainer: Node,
                                 startOffset: number,
                                 endContainer: Node,
                                 endOffset: number): void {
    range.startContainer = startContainer;
    range.startOffset = startOffset;
    range.endContainer = endContainer;
    range.endOffset = endOffset;
    range.document = dom.getDocument(startContainer);
    updateCollapsedAndCommonAncestor(range);
}

export const rangeProperties = [
    "startContainer",
    "startOffset",
    "endContainer",
    "endOffset",
    "collapsed",
    "commonAncestorContainer"
];

// note RangeBase's method list == const rangeProperties above
export class RangeBase implements AbstractRange {
    /**
     * Returns the node, furthest away from
     * the document, that is an ancestor of both range's start node and end node.
     */
    commonAncestorContainer: Node;
    collapsed: boolean;
    endContainer: Node;
    endOffset: number;
    startContainer: Node;
    startOffset: number;
}

export class DomRangeBase extends RangeBase {
    document?: Document;
    constructor(doc) {
        super();
        updateBoundaries(this, doc, 0, doc, 0);
    }
}
