import {Module} from "./module";
import * as util from "./util";
import {getBody} from './util';
import * as log4javascript from "log4javascript";

export {getBody};

const module = new Module("DomUtil", []);

// DOM utility methods used by Rangy
// /* build:replaceWith(api) */rangy/* build:replaceEnd */.createCoreModule("DomUtil", [], function(api, module) {
    var log = log4javascript.getLogger("rangy.dom");
    var UNDEF = "undefined";

    // Perform feature tests
    if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
        module.fail("document missing a Node creation method");
    }

    if (!util.isHostMethod(document, "getElementsByTagName")) {
        module.fail("document missing getElementsByTagName method");
    }

    /*----------------------------------------------------------------------------------------------------------------*/

    // rangy2 dont test this
    // Removed use of indexOf because of a bizarre bug in Opera that is thrown in one of the Acid3 tests. I haven't been
    // able to replicate it outside of the test. The bug is that indexOf returns -1 when called on an Array that
    // contains just the document as a single element and the value searched for is the document.
export function arrayContains(arr, val) {
    return arr.indexOf(val) > -1;
}

    // Opera 11 puts HTML elements in the null namespace, it seems, and IE 7 has undefined namespaceURI
export function isHtmlNamespace(node) {
        var ns;
        return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
    }

export function parentElement(node) {
        var parent = node.parentNode;
        return (parent.nodeType == 1) ? parent : null;
    }

export function getNodeIndex(node) {
        var i = 0;
        while( (node = node.previousSibling) ) {
            ++i;
        }
        return i;
    }

export function getNodeLength(node) {
        switch (node.nodeType) {
            case 7:
            case 10:
                return 0;
            case 3:
            case 8:
                return node.length;
            default:
                return node.childNodes.length;
        }
    }

export function getCommonAncestor(node1, node2) {
        var ancestors = [], n;
        for (n = node1; n; n = n.parentNode) {
            ancestors.push(n);
        }

        for (n = node2; n; n = n.parentNode) {
            if (arrayContains(ancestors, n)) {
                return n;
            }
        }

        return null;
    }

export function isAncestorOf(ancestor, descendant, selfIsAncestor?) {
        var n = selfIsAncestor ? descendant : descendant.parentNode;
        while (n) {
            if (n === ancestor) {
                return true;
            } else {
                n = n.parentNode;
            }
        }
        return false;
    }

export function isOrIsAncestorOf(ancestor, descendant) {
        return isAncestorOf(ancestor, descendant, true);
    }

export function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
        var p, n = selfIsAncestor ? node : node.parentNode;
        while (n) {
            p = n.parentNode;
            if (p === ancestor) {
                return n;
            }
            n = p;
        }
        return null;
    }

// https://basarat.gitbooks.io/typescript/docs/types/typeGuard.html#user-defined-type-guards
export function isCharacterDataNode(node): node is CharacterData {
        var t = node.nodeType;
        return t == 3 || t == 4 || t == 8 ; // Text, CDataSection or Comment
    }

export function isTextOrCommentNode(node) {
        if (!node) {
            return false;
        }
        var t = node.nodeType;
        return t == 3 || t == 8 ; // Text or Comment
    }

export function insertAfter(node, precedingNode) {
        var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
        if (nextNode) {
            parent.insertBefore(node, nextNode);
        } else {
            parent.appendChild(node);
        }
        return node;
    }

    // Note that we cannot use splitText() because it is bugridden in IE 9.
export function splitDataNode(node, index, positionsToPreserve?) {
        log.debug("splitDataNode called at index " + index + " in node " + inspectNode(node));
        var newNode = node.cloneNode(false);
        newNode.deleteData(0, index);
        node.deleteData(index, node.length - index);
        insertAfter(newNode, node);

        // Preserve positions
        if (positionsToPreserve) {
            for (var i = 0, position; position = positionsToPreserve[i++]; ) {
                // Handle case where position was inside the portion of node after the split point
                if (position.node == node && position.offset > index) {
                    position.node = newNode;
                    position.offset -= index;
                }
                // Handle the case where the position is a node offset within node's parent
                else if (position.node == node.parentNode && position.offset > getNodeIndex(node)) {
                    ++position.offset;
                }
            }
        }
        return newNode;
    }

export function getDocument(node) {
        if (node.nodeType == 9) {
            return node;
        } else if (typeof node.ownerDocument != UNDEF) {
            return node.ownerDocument;
        } else if (typeof node.document != UNDEF) {
            return node.document;
        } else if (node.parentNode) {
            return getDocument(node.parentNode);
        } else {
            throw module.createError("getDocument: no document found for node");
        }
    }

export function getWindow(node) {
        var doc = getDocument(node);
        if (typeof doc.defaultView != UNDEF) {
            return doc.defaultView;
        } else if (typeof doc.parentWindow != UNDEF) {
            return doc.parentWindow;
        } else {
            throw module.createError("Cannot get a window object for node");
        }
    }

export function getIframeDocument(iframeEl) {
        if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument;
        } else if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow.document;
        } else {
            throw module.createError("getIframeDocument: No Document object found for iframe element");
        }
    }

export function getIframeWindow(iframeEl) {
        if (typeof iframeEl.contentWindow != UNDEF) {
            return iframeEl.contentWindow;
        } else if (typeof iframeEl.contentDocument != UNDEF) {
            return iframeEl.contentDocument.defaultView;
        } else {
            throw module.createError("getIframeWindow: No Window object found for iframe element");
        }
    }

    // This looks bad. Is it worth it?
export function isWindow(obj) {
        return obj && util.isHostMethod(obj, "setTimeout") && util.isHostObject(obj, "document");
    }

export function getContentDocument(obj, module: Module, methodName) {
        var doc;

        if (!obj) {
            doc = document;
        }

        // Test if a DOM node has been passed and obtain a document object for it if so
        else if (util.isHostProperty(obj, "nodeType")) {
            doc = (obj.nodeType == 1 && obj.tagName.toLowerCase() == "iframe") ?
                getIframeDocument(obj) : getDocument(obj);
        }

        // Test if the doc parameter appears to be a Window object
        else if (isWindow(obj)) {
            doc = obj.document;
        }

        if (!doc) {
            throw module.createError(methodName + "(): Parameter must be a Window object or DOM node");
        }

        return doc;
    }

export function getRootContainer(node) {
        var parent;
        while ( (parent = node.parentNode) ) {
            node = parent;
        }
        return node;
    }

export function comparePoints(nodeA, offsetA, nodeB, offsetB) {
        // See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
        var nodeC, root, childA, childB, n;
        if (nodeA == nodeB) {
            log.debug("case 1");
            // Case 1: nodes are the same
            return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) ) {
            log.debug("case 2", inspectNode(nodeC), getNodeIndex(nodeC));
            // Case 2: node C (container B or an ancestor) is a child node of A
            return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
        } else if ( (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) ) {
            log.debug("case 3");
            // Case 3: node C (container A or an ancestor) is a child node of B
            return getNodeIndex(nodeC) < offsetB  ? -1 : 1;
        } else {
            root = getCommonAncestor(nodeA, nodeB);
            if (!root) {
                throw new Error("comparePoints error: nodes have no common ancestor");
            }

            // Case 4: containers are siblings or descendants of siblings
            log.debug("case 4");
            childA = (nodeA === root) ? root : getClosestAncestorIn(nodeA, root, true);
            childB = (nodeB === root) ? root : getClosestAncestorIn(nodeB, root, true);

            if (childA === childB) {
                // This shouldn't be possible
                log.warn("comparePoints got to case 4 and childA and childB are the same!", nodeA, offsetA, nodeB, offsetB);
                throw module.createError("comparePoints got to case 4 and childA and childB are the same!");
            } else {
                n = root.firstChild;
                while (n) {
                    if (n === childA) {
                        return -1;
                    } else if (n === childB) {
                        return 1;
                    }
                    n = n.nextSibling;
                }
            }
        }
    }

export function inspectNode(node) {
        if (!node) {
            return "[No node]";
        }
        if (isCharacterDataNode(node)) {
            return '"' + node.data + '"';
        }
        if (node.nodeType == 1) {
            var idAttr = node.id ? ' id="' + node.id + '"' : "";
            return "<" + node.nodeName + idAttr + ">[index:" + getNodeIndex(node) + ",length:" + node.childNodes.length + "][" + (node.innerHTML || "[innerHTML not supported]").slice(0, 25) + "]";
        }
        return node.nodeName;
    }

export function fragmentFromNodeChildren(node) {
        var fragment = getDocument(node).createDocumentFragment(), child;
        while ( (child = node.firstChild) ) {
            fragment.appendChild(child);
        }
        return fragment;
    }

    var _getComputedStyleProperty;
    if (typeof window.getComputedStyle != UNDEF) {
        _getComputedStyleProperty = function(el, propName) {
            return getWindow(el).getComputedStyle(el, null)[propName];
        };
    } else if (typeof (document.documentElement as any).currentStyle != UNDEF) {
        _getComputedStyleProperty = function(el, propName) {
            return el.currentStyle ? el.currentStyle[propName] : "";
        };
    } else {
        module.fail("No means of obtaining computed style properties found");
    }
export const getComputedStyleProperty = _getComputedStyleProperty;

export function createTestElement(doc, html, contentEditable) {
        var body = getBody(doc);
        var el = doc.createElement("div");
        el.contentEditable = "" + !!contentEditable;
        if (html) {
            el.innerHTML = html;
        }

        // Insert the test element at the start of the body to prevent scrolling to the bottom in iOS (issue #292)
        var bodyFirstChild = body.firstChild;
        if (bodyFirstChild) {
            body.insertBefore(el, bodyFirstChild);
        } else {
            body.appendChild(el);
        }

        return el;
    }

export function removeNode(node) {
        return node.parentNode.removeChild(node);
    }

export class NodeIterator {
        private _next;
        constructor(public root) {
            this._next = root;
        }
        private static _current = null;

        hasNext() {
            return !!this._next;
        }

        next() {
            var n = NodeIterator._current = this._next;
            var child, next;
            if (NodeIterator._current) {
                child = n.firstChild;
                if (child) {
                    this._next = child;
                } else {
                    next = null;
                    while ((n !== this.root) && !(next = n.nextSibling)) {
                        n = n.parentNode;
                    }
                    this._next = next;
                }
            }
            return NodeIterator._current;
        }

        detach() {
            NodeIterator._current = this._next = this.root = null;
        }
    }

export function createIterator(root) {
        return new NodeIterator(root);
    }

export class DomPosition {
        constructor(public node, public offset) {
        }
        equals(pos) {
            return !!pos && this.node === pos.node && this.offset == pos.offset;
        }

        inspect() {
            return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
        }

        toString() {
            return this.inspect();
        }
    }
