/**
 * Utilities module for Rangy.
 * A collection of common selection and range-related tasks, using Rangy.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * https://github.com/timdown/rangy
 *
 * Depends on Rangy core.
 *
 * Copyright %%build:year%%, Tim Down
 * Licensed under the MIT license.
 * Version: %%build:version%%
 * Build date: %%build:date%%
 */
import * as api from "rangy2";
import {
    WrappedSelection as SelProto,
    DomRange as RangeProto,
    getNativeSelection
} from "rangy2";

// const module = new Module("Util", ["WrappedSelection"]);

export class WrappedSelection extends SelProto {
    pasteText(text: string) {
        this.deleteFromDocument();
        var range = this.getRangeAt(0);
        var textNode = range.getDocument().createTextNode(text);
        range.insertNode(textNode);
        this.setSingleRange(range);
    };

    pasteHtml(html) {
        this.deleteFromDocument();
        const range = this.getRangeAt(0);
        const frag = range.createContextualFragment(html);
        const lastNode = frag.lastChild;
        range.insertNode(frag);
        if (lastNode) {
            range.setStartAfter(lastNode)
        }
        this.setSingleRange(range);
    };

    selectNodeContents(node) {
        var range = api.createRange(this.win);
        range.selectNodeContents(node);
        this.setSingleRange(range);
    };
}

export class DomRange extends RangeProto {
    pasteText(text) {
        this.deleteContents();
        var textNode = this.getDocument().createTextNode(text);
        this.insertNode(textNode);
    };

    pasteHtml(html) {
        this.deleteContents();
        var frag = this.createContextualFragment(html);
        this.insertNode(frag);
    };

    selectSelectedTextElements = (function() {
        function isInlineElement(node) {
            return node.nodeType == 1 && api.dom.getComputedStyleProperty(node, "display") == "inline";
        }

        function getOutermostNodeContainingText(range, node) {
            var outerNode = null;
            var nodeRange = range.cloneRange();
            nodeRange.selectNode(node);
            if (nodeRange.toString() !== "") {
                while ( (node = node.parentNode) && isInlineElement(node) && range.containsNodeText(node) ) {
                    outerNode = node;
                }
            }
            return outerNode;
        }

        return function(this: RangeProto) {
            var startNode = getOutermostNodeContainingText(this, this.startContainer);
            if (startNode) {
                this.setStartBefore(startNode);
            }

            var endNode = getOutermostNodeContainingText(this, this.endContainer);
            if (endNode) {
                this.setEndAfter(endNode);
            }
        };
    })();
}

export function createRangeFromNode(node) {
        var range = api.createRange(node);
        range.selectNode(node);
        return range;
    };

export function createRangeFromNodeContents(node) {
        var range = api.createRange(node);
        range.selectNodeContents(node);
        return range;
    };

export function selectNodeContents(node) {
    const nativeSel = getNativeSelection();
    const sel = new WrappedSelection(nativeSel, window)
    sel.selectNodeContents(node);
}

    // TODO: simple selection save/restore

// // for d.ts typescript export purpose only
// import * as _rangy from ".";
// declare global {
//     type RangyUtilModule = typeof _rangy;
//     interface Rangy extends RangyUtilModule{}
// }
