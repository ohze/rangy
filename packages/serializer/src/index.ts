/**
 * Serializer module for Rangy.
 * Serializes Ranges and Selections. An example use would be to store a user's selection on a particular page in a
 * cookie or local storage and restore it on the user's next visit to the same page.
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

import {crc32} from "./crc32";

// don't directly import modules from ../core/<module-path>
// (only import ../core/index)
// otherwise rollup.config.js/ rangyModulesConfigs will failed!
import * as api from "@rangy/core";
import {dom, Module} from "@rangy/core";

const module = new Module("Serializer", ["WrappedSelection"]);

    var UNDEF = "undefined";

    // encodeURIComponent and decodeURIComponent are required for cookie handling
    if (typeof encodeURIComponent == UNDEF || typeof decodeURIComponent == UNDEF) {
        module.fail("encodeURIComponent and/or decodeURIComponent method is missing");
    }

    function escapeTextForHtml(str) {
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

export function nodeToInfoString(node, infoParts?) {
        infoParts = infoParts || [];
        var nodeType = node.nodeType, children = node.childNodes, childCount = children.length;
        var nodeInfo = [nodeType, node.nodeName, childCount].join(":");
        var start = "", end = "";
        switch (nodeType) {
            case 3: // Text node
                start = escapeTextForHtml(node.nodeValue);
                break;
            case 8: // Comment
                start = "<!--" + escapeTextForHtml(node.nodeValue) + "-->";
                break;
            default:
                start = "<" + nodeInfo + ">";
                end = "</>";
                break;
        }
        if (start) {
            infoParts.push(start);
        }
        for (var i = 0; i < childCount; ++i) {
            nodeToInfoString(children[i], infoParts);
        }
        if (end) {
            infoParts.push(end);
        }
        return infoParts;
    }

    // Creates a string representation of the specified element's contents that is similar to innerHTML but omits all
    // attributes and comments and includes child node counts. This is done instead of using innerHTML to work around
    // IE <= 8's policy of including element properties in attributes, which ruins things by changing an element's
    // innerHTML whenever the user changes an input within the element.
export function getElementChecksum(el) {
        var info = nodeToInfoString(el).join("");
        return crc32(info).toString(16);
    }

export function serializePosition(node, offset, rootNode?) {
        var pathParts = [], n = node;
        rootNode = rootNode || dom.getDocument(node).documentElement;
        while (n && n != rootNode) {
            pathParts.push(dom.getNodeIndex(n));
            n = n.parentNode;
        }
        return pathParts.join("/") + ":" + offset;
    }

export function deserializePosition(serialized, rootNode?, doc?) {
        if (!rootNode) {
            rootNode = (doc || document).documentElement;
        }
        var parts = serialized.split(":");
        var node = rootNode;
        var nodeIndices = parts[0] ? parts[0].split("/") : [], i = nodeIndices.length, nodeIndex;

        while (i--) {
            nodeIndex = parseInt(nodeIndices[i], 10);
            if (nodeIndex < node.childNodes.length) {
                node = node.childNodes[nodeIndex];
            } else {
                throw module.createError("deserializePosition() failed: node " + dom.inspectNode(node) +
                        " has no child with index " + nodeIndex + ", " + i);
            }
        }

        return new dom.DomPosition(node, parseInt(parts[1], 10));
    }

export function serializeRange(range, omitChecksum?, rootNode?) {
        rootNode = rootNode || api.DomRange.getRangeDocument(range).documentElement;
        if (!dom.isOrIsAncestorOf(rootNode, range.commonAncestorContainer)) {
            throw module.createError("serializeRange(): range " + range.inspect() +
                " is not wholly contained within specified root node " + dom.inspectNode(rootNode));
        }
        var serialized = serializePosition(range.startContainer, range.startOffset, rootNode) + "," +
            serializePosition(range.endContainer, range.endOffset, rootNode);
        if (!omitChecksum) {
            serialized += "{" + getElementChecksum(rootNode) + "}";
        }
        return serialized;
    }

    var deserializeRegex = /^([^,]+),([^,\{]+)(\{([^}]+)\})?$/;

export function deserializeRange(serialized, rootNode?, doc?) {
        if (rootNode) {
            doc = doc || dom.getDocument(rootNode);
        } else {
            doc = doc || document;
            rootNode = doc.documentElement;
        }
        var result = deserializeRegex.exec(serialized);
        var checksum = result[4];
        if (checksum) {
            var rootNodeChecksum = getElementChecksum(rootNode);
            if (checksum !== rootNodeChecksum) {
                throw module.createError("deserializeRange(): checksums of serialized range root node (" + checksum +
                    ") and target root node (" + rootNodeChecksum + ") do not match");
            }
        }
        var start = deserializePosition(result[1], rootNode, doc), end = deserializePosition(result[2], rootNode, doc);
        var range = api.createRange(doc);
        range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
        return range;
    }

export function canDeserializeRange(serialized, rootNode?, doc?) {
        if (!rootNode) {
            rootNode = (doc || document).documentElement;
        }
        var result = deserializeRegex.exec(serialized);
        var checksum = result[3];
        return !checksum || checksum === getElementChecksum(rootNode);
    }

export function serializeSelection(selection, omitChecksum?, rootNode?) {
        selection = api.getSelection(selection);
        var ranges = selection.getAllRanges(), serializedRanges = [];
        for (var i = 0, len = ranges.length; i < len; ++i) {
            serializedRanges[i] = serializeRange(ranges[i], omitChecksum, rootNode);
        }
        return serializedRanges.join("|");
    }

export function deserializeSelection(serialized, rootNode?, win?) {
        if (rootNode) {
            win = win || dom.getWindow(rootNode);
        } else {
            win = win || window;
            rootNode = win.document.documentElement;
        }
        var serializedRanges = serialized.split("|");
        var sel = api.getSelection(win);
        var ranges = [];

        for (var i = 0, len = serializedRanges.length; i < len; ++i) {
            ranges[i] = deserializeRange(serializedRanges[i], rootNode, win.document);
        }
        sel.setRanges(ranges);

        return sel;
    }

export function canDeserializeSelection(serialized, rootNode?, win?) {
        var doc;
        if (rootNode) {
            doc = win ? win.document : dom.getDocument(rootNode);
        } else {
            win = win || window;
            rootNode = win.document.documentElement;
        }
        var serializedRanges = serialized.split("|");

        for (var i = 0, len = serializedRanges.length; i < len; ++i) {
            if (!canDeserializeRange(serializedRanges[i], rootNode, doc)) {
                return false;
            }
        }

        return true;
    }

    var cookieName = "rangySerializedSelection";

    function getSerializedSelectionFromCookie(cookie) {
        var parts = cookie.split(/[;,]/);
        for (var i = 0, len = parts.length, nameVal, val; i < len; ++i) {
            nameVal = parts[i].split("=");
            if (nameVal[0].replace(/^\s+/, "") == cookieName) {
                val = nameVal[1];
                if (val) {
                    return decodeURIComponent(val.replace(/\s+$/, ""));
                }
            }
        }
        return null;
    }

export function restoreSelectionFromCookie(win?) {
        win = win || window;
        var serialized = getSerializedSelectionFromCookie(win.document.cookie);
        if (serialized) {
            deserializeSelection(serialized, win.doc);
        }
    }

export function saveSelectionCookie(win?, props?) {
        win = win || window;
        props = (typeof props == "object") ? props : {};
        var expires = props.expires ? ";expires=" + props.expires.toUTCString() : "";
        var path = props.path ? ";path=" + props.path : "";
        var domain = props.domain ? ";domain=" + props.domain : "";
        var secure = props.secure ? ";secure" : "";
        var serialized = serializeSelection(api.getSelection(win));
        win.document.cookie = encodeURIComponent(cookieName) + "=" + encodeURIComponent(serialized) + expires + path + domain + secure;
    }
