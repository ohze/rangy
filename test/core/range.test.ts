import {DomRange, RangyRange, DOMException, WrappedRange} from "rangy2";

import "../qunit-ex";

var hasNativeDomRange = "createRange" in document;

type RangeCreator = (doc: Document) => Range | DomRange | WrappedRange;

function createRangyRange(doc) {
    return new rangy.DomRange(doc);
}

function createNativeDomRange(doc: Document) {
    return doc.createRange();
}

function createWrappedNativeDomRange(doc?: Document) {
    return rangy.createRange(doc);
}

function getOtherDocument() {
    var iframe = document.getElementById("selectors") as HTMLIFrameElement;
    return iframe.contentDocument || iframe.contentWindow.document;
}

function testExceptionCode(t: Assert, func: () => void, code) {
    //TypeError: Function has non-object prototype 'undefined' in instanceof check
    t.throws(func, (ex) => ex.code == code);
    // t.throws(func, function(ex) {
    //     return ex.code == code
    // });
}

declare global {
    interface Range {
        compareBoundaryPoints(how: number, sourceRange: RangyRange): number;
    }
}
function testRangeCreator(docs: Document[], docName, rangeCreator: RangeCreator, rangeCreatorName) {
    let doc: Document;
    var testRange = rangeCreator(document);

    let nodes: {
        div: HTMLDivElement;
        plainText: Text;
        b: HTMLElement;
        boldText: Text;
        i: HTMLElement;
        boldAndItalicText: Text;
        div2: HTMLDivElement;
        div2Text: Text;
    };

    const hooks: Hooks = {
        beforeEach: function() {
            doc = docs[0];
            var div = doc.createElement("div");
            var plainText = div.appendChild(doc.createTextNode("plain"));
            var b = div.appendChild(doc.createElement("b"));
            var boldText = b.appendChild(doc.createTextNode("bold"));
            var i = b.appendChild(doc.createElement("i"));
            var boldAndItalicText = i.appendChild(doc.createTextNode("bold and italic"));
            doc.body.appendChild(div);
            var div2 = doc.createElement("div");
            var div2Text = div2.appendChild(doc.createTextNode("Second div"));
            doc.body.appendChild(div2);

            nodes = {
                div: div,
                plainText: plainText,
                b: b,
                boldText: boldText,
                i: i,
                boldAndItalicText: boldAndItalicText,
                div2: div2,
                div2Text: div2Text
            };
        },
        afterEach: function() {
            doc.body.removeChild(nodes.div);
            doc.body.removeChild(nodes.div2);
            nodes = null;
        }
    };
    QUnit.module(rangeCreatorName + " in " + docName + " document", hooks);

    QUnit.test("Initial Range values", function(t) {
            var range = rangeCreator(doc);
            t.strictEqual(range.startContainer, doc);
            t.strictEqual(range.startOffset, 0);
            t.strictEqual(range.endContainer, doc);
            t.strictEqual(range.endOffset, 0);
        });

    function isDomRange(rangeCreator, testMethod: string): rangeCreator is ((doc: Document) => DomRange){
        return testRange[testMethod];
    }

        if (isDomRange(rangeCreator, "isValid")) {
            QUnit.test("isValid: remove common container node", function(t) {
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.plainText);
                t.ok(range.isValid());
                nodes.plainText.parentNode.removeChild(nodes.plainText);
                t.ok(range.isValid());
            });

            QUnit.test("isValid: remove start container node", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 0);
                range.setEnd(nodes.boldAndItalicText, 1);
                t.ok(range.isValid());
                nodes.plainText.parentNode.removeChild(nodes.plainText);
                t.notOk(range.isValid());
            });

            QUnit.test("isValid: remove end container node", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 0);
                range.setEnd(nodes.boldAndItalicText, 1);
                t.ok(range.isValid());
                nodes.boldAndItalicText.parentNode.removeChild(nodes.boldAndItalicText);
                t.notOk(range.isValid());
            });

            QUnit.test("isValid: truncate start container node", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 2);
                range.setEnd(nodes.boldAndItalicText, 1);
                t.ok(range.isValid());
                nodes.plainText.data = "1";
                t.notOk(range.isValid());
            });

            QUnit.test("isValid: truncate end container node", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 2);
                range.setEnd(nodes.boldAndItalicText, 2);
                t.ok(range.isValid());
                nodes.boldAndItalicText.data = "1";
                t.notOk(range.isValid());
            });
        }

        QUnit.test("setStart after end test", function(t) {
            var range = rangeCreator(doc);
            //log.info(range);
            range.setEnd(nodes.plainText, 0);
            range.setStart(nodes.plainText, 2);
            t.ok(range.collapsed);
            t.strictEqual(range.startContainer, nodes.plainText);
            t.strictEqual(range.startOffset, 2);
            t.strictEqual(range.endContainer, nodes.plainText);
            t.strictEqual(range.endOffset, 2);
        });

        QUnit.test("setEnd after start test", function(t) {
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.div);
            range.setEnd(nodes.b, 1);
            t.notOk(range.collapsed);
            t.strictEqual(range.startContainer, nodes.div);
            t.strictEqual(range.startOffset, 0);
            t.strictEqual(range.endContainer, nodes.b);
            t.strictEqual(range.endOffset, 1);
        });

        QUnit.test("setStart after interesting end test", function(t) {
            var range = rangeCreator(doc);
            range.setEnd(nodes.b, 1);
            range.setStart(nodes.boldAndItalicText, 2);
            t.ok(range.collapsed);
            t.strictEqual(range.startContainer, nodes.boldAndItalicText);
            t.strictEqual(range.startOffset, 2);
            t.strictEqual(range.endContainer, nodes.boldAndItalicText);
            t.strictEqual(range.endOffset, 2);
        });

        QUnit.test("setEndAfter 1", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 1);
            range.collapse(true);
            range.setEndAfter(nodes.plainText);

            t.notOk(range.collapsed);
            t.equal(range.toString(), "lain");
        });

        var testSetStartOrEnd = function(methodName) {
            QUnit.test(methodName + " error test", function(t) {
                var range = rangeCreator(doc);

                testExceptionCode(t, function() {
                    range[methodName](nodes.plainText, 6);
                }, DOMException.prototype.INDEX_SIZE_ERR);

                testExceptionCode(t, function() {
                    range[methodName](nodes.div2, 2);
                }, DOMException.prototype.INDEX_SIZE_ERR);

                testExceptionCode(t, function() {
                    range[methodName](nodes.div2, -1);
                }, DOMException.prototype.INDEX_SIZE_ERR);

                range.detach();

                // Detach is now a no-op  according to DOM4. Not according to Chrome 35 though.
                t.notThrows(function() {
                    range[methodName](nodes.div2, 0);
                });
            });

            QUnit.test(methodName + " move to other document test", function(t) {
                var range = rangeCreator(doc);
                var otherDoc = getOtherDocument();
                range[methodName](otherDoc.body, 0);
                t.strictEqual(range.startContainer, otherDoc.body);
                t.strictEqual(range.startOffset, 0);
                t.strictEqual(range.endContainer, otherDoc.body);
                t.strictEqual(range.endOffset, 0);
            });
        };

        testSetStartOrEnd("setStart");
        testSetStartOrEnd("setEnd");

        var testSetBeforeOrAfter = function(methodName) {
            QUnit.test(methodName + " error test", function(t) {
                var range = rangeCreator(doc);

                testExceptionCode(t, function() {
                    range[methodName](doc);
                }, DOMException.prototype.INVALID_NODE_TYPE_ERR);

                testExceptionCode(t, function() {
                    range[methodName](doc.createDocumentFragment());
                }, DOMException.prototype.INVALID_NODE_TYPE_ERR);

                range.detach();

                // Detach is now a no-op  according to DOM4. Not according to Chrome 35 though.
                t.notThrows(function() {
                    range[methodName](nodes.div2);
                });
            });
        };

        testSetBeforeOrAfter("setStartBefore");
        testSetBeforeOrAfter("setStartAfter");
        testSetBeforeOrAfter("setEndBefore");
        testSetBeforeOrAfter("setEndAfter");

        if (isDomRange(rangeCreator, "setStartAndEnd")) {
            QUnit.test("setStartAndEnd with two arguments", function(t) {
                var range = rangeCreator(doc);

                range.setStartAndEnd(nodes.plainText, 2);

                t.strictEqual(range.startContainer, nodes.plainText);
                t.strictEqual(range.startOffset, 2);
                t.strictEqual(range.endContainer, nodes.plainText);
                t.strictEqual(range.endOffset, 2);
            });

            QUnit.test("setStartAndEnd with three arguments", function(t) {
                var range = rangeCreator(doc);

                range.setStartAndEnd(nodes.plainText, 2, 3);

                t.strictEqual(range.startContainer, nodes.plainText);
                t.strictEqual(range.startOffset, 2);
                t.strictEqual(range.endContainer, nodes.plainText);
                t.strictEqual(range.endOffset, 3);
            });

            QUnit.test("setStartAndEnd with four arguments", function(t) {
                var range = rangeCreator(doc);

                range.setStartAndEnd(nodes.plainText, 2, nodes.boldAndItalicText, 1);

                t.strictEqual(range.startContainer, nodes.plainText);
                t.strictEqual(range.startOffset, 2);
                t.strictEqual(range.endContainer, nodes.boldAndItalicText);
                t.strictEqual(range.endOffset, 1);
            });
        }

        QUnit.test("compareBoundaryPoints 1", function(t) {
            var range1 = rangeCreator(doc);
            var range2 = rangeCreator(doc) as RangyRange;
            range1.setStart(nodes.b, 1);
            range1.setEnd(nodes.boldAndItalicText, 2);
            range2.setStart(nodes.plainText, 1);
            range2.setEnd(nodes.b, 1);

            t.equal(range1.END_TO_START, 3);
            t.equal(DomRange.END_TO_START, 3);
            t.equal(WrappedRange.END_TO_START, 3);

            t.strictEqual(range1.compareBoundaryPoints(range1.START_TO_START, range2), 1);
            t.strictEqual(range1.compareBoundaryPoints(range1.START_TO_END, range2), 1);
            t.strictEqual(range1.compareBoundaryPoints(range1.END_TO_START, range2), 0);
            t.strictEqual(range1.compareBoundaryPoints(range1.END_TO_END, range2), 1);
        });

        QUnit.test("cloneContents 1", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.b, 1);
            range.setEnd(nodes.div2Text, 2);
            var frag = range.cloneContents();
            t.equal(frag.childNodes.length, 2);
            t.equal(frag.childNodes[0].nodeName.toLowerCase(), "div");
            t.equal(frag.childNodes[1].nodeName.toLowerCase(), "div");
            var fragRange = rangeCreator(doc);
            fragRange.selectNodeContents(frag);
            t.equal(fragRange.toString(), range.toString());
        });

        QUnit.test("cloneContents 2", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 1);
            range.setEnd(nodes.plainText, 2);
            var frag = range.cloneContents();
            t.equal(frag.nodeType, 11);
            t.equal(frag.childNodes.length, 1);
            t.equal(frag.firstChild.nodeType, 3);
            t.equal((frag.firstChild as CharacterData).data, "l");
            t.equal(nodes.plainText.data, "plain");
            t.equal(nodes.plainText.nextSibling.nodeType, 1);
        });

        QUnit.test("extractContents in single text node", function(t) {
            var range = rangeCreator(doc);
            nodes.div.innerHTML = "<p>1 2 <span>3</span> 4 5</p>";
            var p = nodes.div.firstChild;
            range.setStart(p.firstChild, 2);
            range.setEnd(p.lastChild, 2);
            var frag = range.extractContents();
            var container = doc.createElement("div");
            container.appendChild(frag);
            t.equal(container.innerHTML, "2 <span>3</span> 4");
            t.equal(nodes.div.innerHTML, "<p>1  5</p>");
        });

        QUnit.test("extractContents inside paragraph (issue 163)", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 1);
            range.setEnd(nodes.plainText, 2);
            var frag = range.extractContents();
            t.equal(frag.nodeType, 11);
            t.equal(frag.childNodes.length, 1);
            t.equal(frag.firstChild.nodeType, 3);
            t.equal((frag.firstChild as CharacterData).data, "l");
            t.equal(nodes.plainText.data, "pain");
            t.equal(nodes.plainText.nextSibling.nodeType, 1);
        });

        QUnit.test("deleteContents in single text node", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 1);
            range.setEnd(nodes.plainText, 2);
            range.deleteContents();
            t.equal(nodes.plainText.data, "pain");
            t.equal(nodes.plainText.nextSibling.nodeType, 1);
        });

        QUnit.test("toString 1", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 2);
            range.setEnd(nodes.b, 1);
            t.equal("ainbold", range.toString());
        });

        QUnit.test("createContextualFragment 1", function(t) {
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.plainText);
            var frag = range.createContextualFragment("<div>Test</div>");
            t.equal(frag.childNodes.length, 1);
            t.equal(frag.firstChild.nodeName.toLowerCase(), "div");
            t.equal((frag.firstChild.firstChild as CharacterData).data, "Test");
        });

        QUnit.test("selectNode 1", function(t) {
            var range = rangeCreator(doc);
            range.selectNode(nodes.plainText);
            t.equal(range.toString(), nodes.plainText.data);
            t.equal(range.startContainer, nodes.div);
            t.equal(range.startOffset, 0);
            t.equal(range.endContainer, nodes.div);
            t.equal(range.endOffset, 1);
        });

        QUnit.test("selectNode 2", function(t) {
            var range = rangeCreator(doc);
            range.selectNode(nodes.b);
            t.equal(range.startContainer, nodes.div);
            t.equal(range.startOffset, 1);
            t.equal(range.endContainer, nodes.div);
            t.equal(range.endOffset, 2);
        });

        QUnit.test("selectNodeContents 1", function(t) {
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.plainText);
            t.equal(range.startContainer, nodes.plainText);
            t.equal(range.startOffset, 0);
            t.equal(range.endContainer, nodes.plainText);
            t.equal(range.endOffset, nodes.plainText.length);
            t.equal(range.toString(), nodes.plainText.data);
        });

        QUnit.test("selectNodeContents 2", function(t) {
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.b);
            t.equal(range.startContainer, nodes.b);
            t.equal(range.startOffset, 0);
            t.equal(range.endContainer, nodes.b);
            t.equal(range.endOffset, nodes.b.childNodes.length);
        });

        QUnit.test("collapse in element", function(t) {
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.b);
            range.collapse(true);
            t.ok(range.collapsed);
            t.strictEqual(range.startContainer, nodes.b);
            t.equal(range.startOffset, 0);
            t.strictEqual(range.endContainer, nodes.b);
            t.equal(range.endOffset, 0);

            range.selectNodeContents(nodes.b);
            t.notOk(range.collapsed);
            range.collapse(false);
            t.ok(range.collapsed);
            t.strictEqual(range.startContainer, nodes.b);
            t.equal(range.startOffset, nodes.b.childNodes.length);
            t.strictEqual(range.endContainer, nodes.b);
            t.equal(range.endOffset, nodes.b.childNodes.length);
        });

        QUnit.test("collapse in text node", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 1);
            range.setEnd(nodes.plainText, 2);
            range.collapse(true);
            t.ok(range.collapsed);
            t.strictEqual(range.startContainer, nodes.plainText);
            t.equal(range.startOffset, 1);
            t.strictEqual(range.endContainer, nodes.plainText);
            t.equal(range.endOffset, 1);

            range.setStart(nodes.plainText, 1);
            range.setEnd(nodes.plainText, 2);
            t.notOk(range.collapsed);
            range.collapse(false);
            t.ok(range.collapsed);
            t.strictEqual(range.startContainer, nodes.plainText);
            t.equal(range.startOffset, 2);
            t.strictEqual(range.endContainer, nodes.plainText);
            t.equal(range.endOffset, 2);
        });


        if (isDomRange(rangeCreator, "containsNode")) {
            QUnit.test("containsNode 1", function(t) {
                var range = rangeCreator(doc);
                range.selectNode(nodes.plainText);
                t.ok(range.containsNode(nodes.plainText));
                t.notOk(range.containsNode(nodes.b));
                t.notOk(range.containsNode(nodes.div));
            });

            QUnit.test("containsNode 2", function(t) {
                var range = rangeCreator(doc);
                range.selectNode(nodes.b);
                t.ok(range.containsNode(nodes.b));
                t.ok(range.containsNode(nodes.boldText));
                t.ok(range.containsNode(nodes.boldAndItalicText));
                t.ok(range.containsNode(nodes.i));
                t.notOk(range.containsNode(nodes.plainText));
                t.notOk(range.containsNode(nodes.div));
            });
        }

        if (isDomRange(rangeCreator, "containsNodeContents")) {
            QUnit.test("containsNodeContents 1", function(t) {
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.plainText);
                t.ok(range.containsNodeContents(nodes.plainText));
                t.notOk(range.containsNode(nodes.b));
                t.notOk(range.containsNode(nodes.div));
            });

            QUnit.test("containsNodeContents 2", function(t) {
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.plainText);
                range.setStart(nodes.plainText, 1);
                t.notOk(range.containsNodeContents(nodes.plainText));
            });

            QUnit.test("containsNodeContents 3", function(t) {
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.b);
                t.ok(range.containsNodeContents(nodes.b));
                t.ok(range.containsNode(nodes.boldText));
                t.ok(range.containsNode(nodes.boldAndItalicText));
                t.ok(range.containsNode(nodes.i));
                t.notOk(range.containsNodeContents(nodes.plainText));
                t.notOk(range.containsNodeContents(nodes.div));
            });
        }

        if (testRange.intersectsNode) {
            QUnit.test("intersectsNode 1", function(t) {
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.b);
                t.ok(range.intersectsNode(nodes.b));
            });

            QUnit.test("intersectsNode 2", function(t) {
                var range = rangeCreator(doc);
                range.setStartBefore(nodes.b);
                range.collapse(true);
                if (range.intersectsNode.length == 2) {
                    t.ok(range.intersectsNode(nodes.b, true));
                }
                t.notOk(range.intersectsNode(nodes.b));
            });

            QUnit.test("intersectsNode 3", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, nodes.plainText.length);
                range.collapse(true);
                t.notOk(range.intersectsNode(nodes.b));
            });

            QUnit.test("intersectsNode 4", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 1);
                range.setEnd(nodes.boldText, 1);
                t.ok(range.intersectsNode(nodes.plainText));
                t.ok(range.intersectsNode(nodes.boldText));
                t.notOk(range.intersectsNode(nodes.boldAndItalicText));
            });

            QUnit.test("intersectsNode orphan node", function(t) {
                var range = rangeCreator(doc);
                var node = doc.createElement("div");
                node.appendChild(doc.createTextNode("test"));
                range.selectNodeContents(node);
                t.ok(range.intersectsNode(node));
                t.notOk(range.intersectsNode(nodes.boldText));
            });

            QUnit.test("intersectsNode test boundary at end of text node", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, nodes.plainText.length);
                range.setEnd(nodes.boldText, 1);
                t.ok(range.intersectsNode(nodes.plainText));
            });

            QUnit.test("intersectsNode test touching is not intersecting", function(t) {
                var range = rangeCreator(doc);
                range.setStartAfter(nodes.plainText);
                range.setEnd(nodes.boldText, 1);
                t.notOk(range.intersectsNode(nodes.plainText));
            });

            if (testRange.intersectsNode.length == 2) {
                QUnit.test("intersectsNode touching is intersecting at start", function(t) {
                    var range = rangeCreator(doc);
                    range.setStart(nodes.plainText, 0);
                    range.setEndBefore(nodes.boldText);
                    t.notOk(range.intersectsNode(nodes.boldText));
                    t.notOk(range.intersectsNode(nodes.boldText, false));
                    t.ok(range.intersectsNode(nodes.boldText, true));
                });

                QUnit.test("intersectsNode touching is intersecting at end", function(t) {
                    var range = rangeCreator(doc);
                    range.setStartAfter(nodes.plainText);
                    range.setEnd(nodes.boldText, 1);
                    t.notOk(range.intersectsNode(nodes.plainText));
                    t.notOk(range.intersectsNode(nodes.plainText, false));
                    t.ok(range.intersectsNode(nodes.plainText, true));
                });
            }
        }

        if (isDomRange(rangeCreator, "intersection")) {
            QUnit.test("intersection 1", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 1);
                range.setEnd(nodes.boldText, 1);
                var plainTextRange = range.cloneRange() as DomRange;
                plainTextRange.selectNodeContents(nodes.plainText);
                var intersectionRange1 = range.intersection(plainTextRange);
                var intersectionRange2 = plainTextRange.intersection(range);

                t.notStrictEqual(intersectionRange1, null);
                t.notStrictEqual(intersectionRange2, null);
                t.ok(rangy.DomRange.rangesEqual(intersectionRange1, intersectionRange2));

                t.equal(intersectionRange1.startContainer, nodes.plainText);
                t.equal(intersectionRange1.startOffset, 1);
                t.equal(intersectionRange1.endContainer, nodes.plainText);
                t.equal(intersectionRange1.endOffset, nodes.plainText.length);
            });
        }

        if (isDomRange(rangeCreator, "union")) {
            QUnit.test("union of overlapping ranges in text node", function(t) {
                var r1 = rangeCreator(doc);
                r1.setStart(nodes.plainText, 1);
                r1.setEnd(nodes.plainText, 3);

                var r2 = rangeCreator(doc);
                r2.setStart(nodes.plainText, 2);
                r2.setEnd(nodes.plainText, 4);

                var r3 = r1.union(r2), r4 = r2.union(r1);

                t.ok(r3.equals(r4));
                t.strictEqual(r3.startContainer, nodes.plainText);
                t.strictEqual(r3.startOffset, 1);
                t.strictEqual(r3.endContainer, nodes.plainText);
                t.strictEqual(r3.endOffset, 4);
            });

            QUnit.test("union of touching ranges in text node", function(t) {
                var r1 = rangeCreator(doc);
                r1.setStart(nodes.plainText, 1);
                r1.setEnd(nodes.plainText, 3);

                var r2 = rangeCreator(doc);
                r2.setStart(nodes.plainText, 3);
                r2.setEnd(nodes.plainText, 4);

                var r3 = r1.union(r2), r4 = r2.union(r1);

                t.ok(r3.equals(r4));
                t.strictEqual(r3.startContainer, nodes.plainText);
                t.strictEqual(r3.startOffset, 1);
                t.strictEqual(r3.endContainer, nodes.plainText);
                t.strictEqual(r3.endOffset, 4);
            });


            QUnit.test("union of non-overlapping ranges in text node", function(t) {
                var r1 = rangeCreator(doc);
                r1.setStart(nodes.plainText, 1);
                r1.setEnd(nodes.plainText, 2);

                var r2 = rangeCreator(doc);
                r2.setStart(nodes.plainText, 3);
                r2.setEnd(nodes.plainText, 4);

                t.throws(function() {
                    var r3 = r1.union(r2);
                });
                t.throws(function() {
                    var r4 = r2.union(r1);
                });
            });
        }

        if (isDomRange(rangeCreator, "containsNodeText")) {
            QUnit.test("containsNodeText on node with text", function(t) {
                var range = rangeCreator(doc);
                range.setStart(nodes.boldAndItalicText, 0);
                range.setEnd(nodes.boldAndItalicText, nodes.boldAndItalicText.length);

                t.notOk(range.containsNode(nodes.i));
                t.notOk(range.containsNodeContents(nodes.i));
                t.ok(range.containsNodeText(nodes.i));
                range.setStart(nodes.boldAndItalicText, 1);
                t.notOk(range.containsNodeText(nodes.i));
            });

            QUnit.test("containsNodeText on node without text", function(t) {
                var br = nodes.i.appendChild(doc.createElement("br"));
                var range = rangeCreator(doc);
                range.selectNode(nodes.i);

                t.ok(range.containsNode(br));
                t.ok(range.containsNodeContents(br));
                t.ok(range.containsNodeText(br));

                range.selectNodeContents(nodes.boldAndItalicText);

                t.notOk(range.containsNode(br));
                t.notOk(range.containsNodeContents(br));
                t.notOk(range.containsNodeText(br));
            });
        }

        // TODO: Write tests for all possible exceptions

            function concatRangeTextNodes(range) {
                var text = "";
                var nodes = range.getNodes([3]);
                for (var i = 0, len = nodes.length; i < len; ++i) {
                    text += nodes[i].nodeValue;
                }
                return text;
            }

        if (isDomRange(rangeCreator, "splitBoundaries")) {
            QUnit.test("splitBoundaries 'on[e]two' element container", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStart(text1, 1);
                range.setEnd(b, 1);
                t.equal("ne", range.toString());
                range.splitBoundaries();
                t.equal("ne", range.toString());

                t.equal(b.childNodes[1], range.startContainer);
                t.equal(0, range.startOffset);
                t.equal(b, range.endContainer);
                t.equal(2, range.endOffset);
            });

            QUnit.test("splitBoundaries 'on[e]two' element container 2", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStart(text1, 1);
                range.setEnd(b, 2);
                t.equal("netwo", range.toString());
                range.splitBoundaries();
                t.equal("netwo", range.toString());

                t.equal(b.childNodes[1], range.startContainer);
                t.equal(0, range.startOffset);
                t.equal(b, range.endContainer);
                t.equal(3, range.endOffset);
            });

            QUnit.test("Concatenate getNodes([3]) after splitBoundaries same as toString - simple", function(t) {
                var range = rangeCreator(doc);
                range.setStartAndEnd(nodes.plainText, 1, nodes.boldText, 3);
                t.equal(concatRangeTextNodes(range), "plainbold");
                range.splitBoundaries();
                t.equal(concatRangeTextNodes(range), "lainbol");
                t.equal(range.toString(), "lainbol");
            });

            QUnit.test("Concatenate getNodes([3]) after splitBoundaries same as toString - end at position 0 in text node (issue 190)", function(t) {
                var range = rangeCreator(doc);
                range.setStartAndEnd(nodes.plainText, 1, nodes.boldText, 0);
                range.splitBoundaries();
                t.equal(concatRangeTextNodes(range), "lain");
                t.equal(range.toString(), "lain");
            });

            QUnit.test("Concatenate getNodes([3]) after splitBoundaries same as toString - start position at end of text node (issue 190)", function(t) {
                var range = rangeCreator(doc);
                range.setStartAndEnd(nodes.plainText, 5, nodes.boldText, 3);
                range.splitBoundaries();
                t.equal(concatRangeTextNodes(range), "bol");
                t.equal(range.toString(), "bol");
            });

            QUnit.test("Concatenate getNodes([3]) after splitBoundaries same as toString - start position at end of text node and end at position 0 in text node (issue 190)", function(t) {
                var range = rangeCreator(doc);
                range.setStartAndEnd(nodes.plainText, 5, nodes.boldText, 0);
                range.splitBoundaries();
                t.equal(concatRangeTextNodes(range), "");
                t.equal(range.toString(), "");
            });
        }

        if (isDomRange(rangeCreator, "normalizeBoundaries")) {
            QUnit.test("normalizeBoundaries 'one|two' element container", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.collapseToPoint(b, 1);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onetwo", (b.childNodes[0] as CharacterData).data);
                t.equal(text1, b.childNodes[0]);
                t.equal(text1, range.startContainer);
                t.equal(text1, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(3, range.endOffset);
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one|two' one", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.collapseToPoint(text1, 3);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onetwo", (b.childNodes[0] as CharacterData).data);
                t.equal(text1, b.childNodes[0]);
                t.equal(text1, range.startContainer);
                t.equal(text1, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(3, range.endOffset);
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one|two' two", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.collapseToPoint(text2, 0);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onetwo", (b.childNodes[0] as CharacterData).data);
                t.equal(text1, b.childNodes[0]);
                t.equal(text1, range.startContainer);
                t.equal(text1, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(3, range.endOffset);
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one|two|three' 1", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.setStart(b, 1);
                range.setEnd(b, 2);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onetwothree", (b.childNodes[0] as CharacterData).data);
                t.equal(text2, b.childNodes[0]);
                t.equal(text2, range.startContainer);
                t.equal(text2, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(6, range.endOffset);
                t.equal("two", range.toString());
                t.notOk(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one|two|three' 2", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.setStart(b, 1);
                range.setEnd(text2, 3);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onetwothree", (b.childNodes[0] as CharacterData).data);
                t.equal(text2, b.childNodes[0]);
                t.equal(text2, range.startContainer);
                t.equal(text2, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(6, range.endOffset);
                t.equal("two", range.toString());
                t.notOk(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one|two|three' 3", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.setStart(text2, 0);
                range.setEnd(b, 2);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onetwothree", (b.childNodes[0] as CharacterData).data);
                t.equal(text2, b.childNodes[0]);
                t.equal(text2, range.startContainer);
                t.equal(text2, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(6, range.endOffset);
                t.equal("two", range.toString());
                t.notOk(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one|two|three' 4", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.setStart(text2, 0);
                range.setEnd(text2, 3);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onetwothree", (b.childNodes[0] as CharacterData).data);
                t.equal(text2, b.childNodes[0]);
                t.equal(text2, range.startContainer);
                t.equal(text2, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(6, range.endOffset);
                t.equal("two", range.toString());
                t.notOk(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one||three' 1", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.setStart(text2, 0);
                range.setEnd(text2, 0);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onethree", (b.childNodes[0] as CharacterData).data);
                t.equal(text2, b.childNodes[0]);
                t.equal(text2, range.startContainer);
                t.equal(text2, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(3, range.endOffset);
                t.equal("", range.toString());
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one||three' 2", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.setStart(b, 1);
                range.setEnd(b, 1);
                range.normalizeBoundaries();
                t.equal(2, b.childNodes.length);
                t.equal("one", (b.childNodes[0] as CharacterData).data);
                t.equal("three", (b.childNodes[1] as CharacterData).data);
                t.equal(text1, b.childNodes[0]);
                t.equal(text3, b.childNodes[1]);
                t.equal(text1, range.startContainer);
                t.equal(text1, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(3, range.endOffset);
                t.equal("", range.toString());
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one||three' 3", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.setStart(b, 2);
                range.setEnd(b, 2);
                range.normalizeBoundaries();
                t.equal(2, b.childNodes.length);
                t.equal("one", (b.childNodes[0] as CharacterData).data);
                t.equal("three", (b.childNodes[1] as CharacterData).data);
                t.equal(text1, b.childNodes[0]);
                t.equal(text2, b.childNodes[1]);
                t.equal(text2, range.startContainer);
                t.equal(text2, range.endContainer);
                t.equal(0, range.startOffset);
                t.equal(0, range.endOffset);
                t.equal("", range.toString());
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries 'one||three' 4", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.setStart(b, 1);
                range.setEnd(b, 2);
                range.normalizeBoundaries();
                t.equal(1, b.childNodes.length);
                t.equal("onethree", (b.childNodes[0] as CharacterData).data);
                t.equal(text2, b.childNodes[0]);
                t.equal(text2, range.startContainer);
                t.equal(text2, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(3, range.endOffset);
                t.equal("", range.toString());
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries collapsed at start of element first child", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;

                range.collapseToPoint(b, 0);
                range.normalizeBoundaries();
                t.equal(b, range.startContainer);
                t.equal(b, range.endContainer);
                t.equal(0, range.startOffset);
                t.equal(0, range.endOffset);
                t.equal("", range.toString());
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries collapsed at start of element text node", function(t) {
                var range = rangeCreator(doc);
                var boldText = nodes.boldText;

                range.collapseToPoint(boldText, 0);
                range.normalizeBoundaries();
                t.equal(boldText, range.startContainer);
                t.equal(boldText, range.endContainer);
                t.equal(0, range.startOffset);
                t.equal(0, range.endOffset);
                t.equal("", range.toString());
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries collapsed at end of element last child", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var i = b.appendChild( doc.createElement("i") );
                var text2 = i.appendChild( doc.createTextNode("two") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.collapseToPoint(i, 1);
                range.normalizeBoundaries();
                t.equal(i, range.startContainer);
                t.equal(i, range.endContainer);
                t.equal(1, range.startOffset);
                t.equal(1, range.endOffset);
                t.equal("", range.toString());
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries collapsed at end of element text node", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var i = b.appendChild( doc.createElement("i") );
                var text2 = i.appendChild( doc.createTextNode("two") );
                var text3 = b.appendChild( doc.createTextNode("three") );

                range.collapseToPoint(text2, 3);
                range.normalizeBoundaries();
                t.equal(text2, range.startContainer);
                t.equal(text2, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(3, range.endOffset);
                t.equal("", range.toString());
                t.ok(range.collapsed);
            });

            QUnit.test("normalizeBoundaries end boundary shift 1 ", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                var span = b.appendChild( doc.createElement("span") );

                range.setStart(text2, 0);
                range.setEnd(b, 2);
                t.equal(range.toString(), "two");
                range.normalizeBoundaries();
                t.equal(range.toString(), "two");
                t.equal(b.childNodes[0], range.startContainer);
                t.equal(b, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(1, range.endOffset);
            });

            QUnit.test("normalizeBoundaries end boundary shift 2", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                var span = b.appendChild( doc.createElement("span") );
                span.innerHTML = "three";

                range.setStart(text2, 0);
                range.setEnd(b, 3);
                t.equal(range.toString(), "twothree");
                range.normalizeBoundaries();
                t.equal(range.toString(), "twothree");
                t.equal(b.childNodes[0], range.startContainer);
                t.equal(b, range.endContainer);
                t.equal(3, range.startOffset);
                t.equal(2, range.endOffset);
            });

            QUnit.test("normalizeBoundaries when collapsed range is at end of text node that is immediately followed by another", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStartAndEnd(text1, 3);
                range.normalizeBoundaries();
                t.equal(text1.data, "onetwo");
                t.equal(range.startContainer, text1);
                t.equal(range.startOffset, 3);
                t.equal(range.endContainer, text1);
                t.equal(range.endOffset, 3);
            });

            QUnit.test("normalizeBoundaries when collapsed range is between two text nodes", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStartAndEnd(b, 1);
                range.normalizeBoundaries();
                t.equal(text1.data, "onetwo");
                t.equal(range.startContainer, text1);
                t.equal(range.startOffset, 3);
                t.equal(range.endContainer, text1);
                t.equal(range.endOffset, 3);
            });


            QUnit.test("normalizeBoundaries when the end of an uncollapsed range is at end of text node that is immediately followed by another", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStartAndEnd(text1, 2, text1, 3);
                range.normalizeBoundaries();
                t.equal(text1.data, "onetwo");
                t.equal(range.startContainer, text1);
                t.equal(range.startOffset, 2);
                t.equal(range.endContainer, text1);
                t.equal(range.endOffset, 3);
            });

            QUnit.test("normalizeBoundaries when the end of an uncollapsed range is between two text nodes", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStartAndEnd(text1, 2, b, 1);
                range.normalizeBoundaries();
                t.equal(text1.data, "onetwo");
                t.equal(range.startContainer, text1);
                t.equal(range.startOffset, 2);
                t.equal(range.endContainer, text1);
                t.equal(range.endOffset, 3);
            });

            QUnit.test("normalizeBoundaries when the start of an uncollapsed range is between two text nodes", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStartAndEnd(b, 1, text2, 1);
                range.normalizeBoundaries();
                t.equal(text2.data, "onetwo");
                t.equal(range.startContainer, text2);
                t.equal(range.startOffset, 3);
                t.equal(range.endContainer, text2);
                t.equal(range.endOffset, 4);
            });

            QUnit.test("normalizeBoundaries when the start of an uncollapsed range is at start of text node that is immediately preceded by another", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStartAndEnd(b, 1, text2, 1);
                range.normalizeBoundaries();
                t.equal(text2.data, "onetwo");
                t.equal(range.startContainer, text2);
                t.equal(range.startOffset, 3);
                t.equal(range.endContainer, text2);
                t.equal(range.endOffset, 4);
            });

            QUnit.test("normalizeBoundaries when the start of an uncollapsed range is at end of text node that is immediately followed by another", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStartAndEnd(text1, 3, text2, 1);
                range.normalizeBoundaries();
                t.equal(text1.data, "onetwo");
                t.equal(range.startContainer, text1);
                t.equal(range.startOffset, 3);
                t.equal(range.endContainer, text1);
                t.equal(range.endOffset, 4);
            });

            QUnit.test("normalizeBoundaries when the end of an uncollapsed range is at start of text node that is immediately preceded by another", function(t) {
                var range = rangeCreator(doc);
                var b = nodes.b;
                b.innerHTML = "";
                var text1 = b.appendChild( doc.createTextNode("one") );
                var text2 = b.appendChild( doc.createTextNode("two") );
                range.setStartAndEnd(text1, 2, text2, 0);
                range.normalizeBoundaries();
                t.equal(text1.data, "onetwo");
                t.equal(range.startContainer, text1);
                t.equal(range.startOffset, 2);
                t.equal(range.endContainer, text1);
                t.equal(range.endOffset, 3);
            });
        }

        if (testRange.createContextualFragment) {
            QUnit.test("createContextualFragment create b fragment in xmp", function(t) {
                var range = rangeCreator(doc);
                var el = doc.createElement("xmp");
                var textNode = doc.createTextNode("foo");
                el.appendChild(textNode);
                doc.body.appendChild(el);

                range.setStart(textNode, 1);
                range.setEnd(textNode, 2);
                var frag = range.createContextualFragment("<b>abc</b>");
                var nodeType = frag.firstChild.nodeType;
                doc.body.removeChild(el);

                t.equal(nodeType, 3);
            });

            QUnit.test("createContextualFragment create b fragment in div", function(t) {
                var range = rangeCreator(doc);
                var el = doc.createElement("div");
                var textNode =  doc.createTextNode("foo");
                el.appendChild(textNode);
                doc.body.appendChild(el);

                range.setStart(textNode, 1);
                range.setEnd(textNode, 2);
                var frag = range.createContextualFragment("<b>abc</b>");
                var nodeType = frag.firstChild.nodeType;
                doc.body.removeChild(el);

                t.equal(nodeType, 1);
            });
        }

        if (isDomRange(rangeCreator, "containsRange")) {
            QUnit.test("containsRange positive test", function(t) {
                var range1 = rangeCreator(doc);
                range1.selectNode(nodes.b);

                var range2 = rangeCreator(doc);
                range2.selectNode(nodes.i);

                t.ok(range1.containsRange(range2));
                t.notOk(range2.containsRange(range1));
            });

            QUnit.test("containsRange negative test", function(t) {
                var range1 = rangeCreator(doc);
                range1.selectNode(nodes.plainText);

                var range2 = rangeCreator(doc);
                range2.selectNode(nodes.i);

                t.notOk(range1.containsRange(range2));
                t.notOk(range2.containsRange(range1));
            });
        }
}

function testAcid3(rangeCreator, rangeCreatorName) {
    QUnit.module("Acid 3 tests for " + rangeCreatorName);
        // Tests adapted from Acid3 Range tests at http://acid3.acidtests.org/

        QUnit.test("Acid3 test 7: basic ranges initial position tests", function(t) {
            var r = rangeCreator(document);
            t.ok(r, "range not created");
            t.ok(r.collapsed, "new range wasn't collapsed");
            t.equal(r.commonAncestorContainer, document, "new range's common ancestor wasn't the document");
            t.equal(r.startContainer, document, "new range's start container wasn't the document");
            t.equal(r.startOffset, 0, "new range's start offset wasn't zero");
            t.equal(r.endContainer, document, "new range's end container wasn't the document");
            t.equal(r.endOffset, 0, "new range's end offset wasn't zero");
            t.ok(r.cloneContents(), "cloneContents() didn't return an object");
            t.equal(r.cloneContents().childNodes.length, 0, "nothing cloned was more than nothing");
            t.equal(r.cloneRange().toString(), "", "nothing cloned stringifed to more than nothing");
            r.collapse(true); // no effect
            t.equal(r.compareBoundaryPoints(r.START_TO_END, r.cloneRange()), 0, "starting boundary point of range wasn't the same as the end boundary point of the clone range");
            r.deleteContents(); // no effect
            t.equal(r.extractContents().childNodes.length, 0, "nothing removed was more than nothing");
            var endOffset = r.endOffset;
            r.insertNode(document.createComment("commented inserted to test ranges"));
            r.setEnd(r.endContainer, endOffset + 1); // added to work around spec bug that smaug is blocking the errata for
            try {
                t.ok(!r.collapsed, "range with inserted comment is collapsed");
                console.log(r);
                t.equal(r.commonAncestorContainer, document, "range with inserted comment has common ancestor that isn't the document");
                t.equal(r.startContainer, document, "range with inserted comment has start container that isn't the document");
                t.equal(r.startOffset, 0, "range with inserted comment has start offset that isn't zero");
                t.equal(r.endContainer, document, "range with inserted comment has end container that isn't the document");
                t.equal(r.endOffset, 1, "range with inserted comment has end offset that isn't after the comment");
            } finally {
                document.removeChild(document.firstChild);
            }
        });

        QUnit.test("Acid3 test 8: moving boundary points", function(t) {
            // test 8: moving boundary points
            var doc;
            if (document.implementation && document.implementation.createDocument) {
                doc = document.implementation.createDocument(null, null, null);
            } /*else if (window.ActiveXObject) {
                doc = new ActiveXObject("MSXML2.DOMDocument");
            }*/
            var root = doc.createElement("root");
            doc.appendChild(root);
            var e1 = doc.createElement("e");
            root.appendChild(e1);
            var e2 = doc.createElement("e");
            root.appendChild(e2);
            var e3 = doc.createElement("e");
            root.appendChild(e3);
            var r = rangeCreator(doc);
            r.setStart(e2, 0);
            r.setEnd(e3, 0);
            t.ok(!r.collapsed, "non-empty range claims to be collapsed");
            r.setEnd(e1, 0);
            t.ok(r.collapsed, "setEnd() didn't collapse the range");
            t.equal(r.startContainer, e1, "startContainer is wrong after setEnd()");
            t.equal(r.startOffset, 0, "startOffset is wrong after setEnd()");
            t.equal(r.endContainer, e1, "endContainer is wrong after setEnd()");
            t.equal(r.endOffset, 0, "endOffset is wrong after setEnd()");
            r.setStartBefore(e3);
            t.ok(r.collapsed, "setStartBefore() didn't collapse the range");
            t.equal(r.startContainer, root, "startContainer is wrong after setStartBefore()");
            t.equal(r.startOffset, 2, "startOffset is wrong after setStartBefore()");
            t.equal(r.endContainer, root, "endContainer is wrong after setStartBefore()");
            t.equal(r.endOffset, 2, "endOffset is wrong after setStartBefore()");
            r.setEndAfter(root);
            t.ok(!r.collapsed, "setEndAfter() didn't uncollapse the range");
            t.equal(r.startContainer, root, "startContainer is wrong after setEndAfter()");
            t.equal(r.startOffset, 2, "startOffset is wrong after setEndAfter()");
            t.equal(r.endContainer, doc, "endContainer is wrong after setEndAfter()");
            t.equal(r.endOffset, 1, "endOffset is wrong after setEndAfter()");
            r.setStartAfter(e2);
            t.ok(!r.collapsed, "setStartAfter() collapsed the range");
            t.equal(r.startContainer, root, "startContainer is wrong after setStartAfter()");
            t.equal(r.startOffset, 2, "startOffset is wrong after setStartAfter()");
            t.equal(r.endContainer, doc, "endContainer is wrong after setStartAfter()");
            t.equal(r.endOffset, 1, "endOffset is wrong after setStartAfter()");
            var msg = '';
            try {
                r.setEndBefore(doc);
                msg = "no exception thrown for setEndBefore() the document itself";
            } catch (e) {
                /*
                This section is now commented out in 2011 Acid3 update

                if (e.BAD_BOUNDARYPOINTS_ERR != 1)
                  msg = 'not a RangeException';
                else if (e.INVALID_NODE_TYPE_ERR != 2)
                  msg = 'RangeException has no INVALID_NODE_TYPE_ERR';
                else if ("INVALID_ACCESS_ERR" in e)
                  msg = 'RangeException has DOMException constants';
                else*/ if (e.code != e.INVALID_NODE_TYPE_ERR)
                  msg = 'wrong exception raised from setEndBefore()';
            }
            t.ok(msg == "", msg);
            t.ok(!r.collapsed, "setEndBefore() collapsed the range");
            t.equal(r.startContainer, root, "startContainer is wrong after setEndBefore()");
            t.equal(r.startOffset, 2, "startOffset is wrong after setEndBefore()");
            t.equal(r.endContainer, doc, "endContainer is wrong after setEndBefore()");
            t.equal(r.endOffset, 1, "endOffset is wrong after setEndBefore()");
            r.collapse(false);
            t.ok(r.collapsed, "collapse() collapsed the range");
            t.equal(r.startContainer, doc, "startContainer is wrong after collapse()");
            t.equal(r.startOffset, 1, "startOffset is wrong after collapse()");
            t.equal(r.endContainer, doc, "endContainer is wrong after collapse()");
            t.equal(r.endOffset, 1, "endOffset is wrong after collapse()");
            r.selectNodeContents(root);
            t.ok(!r.collapsed, "collapsed is wrong after selectNodeContents()");
            t.equal(r.startContainer, root, "startContainer is wrong after selectNodeContents()");
            t.equal(r.startOffset, 0, "startOffset is wrong after selectNodeContents()");
            t.equal(r.endContainer, root, "endContainer is wrong after selectNodeContents()");
            t.equal(r.endOffset, 3, "endOffset is wrong after selectNodeContents()");
            r.selectNode(e2);
            t.ok(!r.collapsed, "collapsed is wrong after selectNode()");
            t.equal(r.startContainer, root, "startContainer is wrong after selectNode()");
            t.equal(r.startOffset, 1, "startOffset is wrong after selectNode()");
            t.equal(r.endContainer, root, "endContainer is wrong after selectNode()");
            t.equal(r.endOffset, 2, "endOffset is wrong after selectNode()");
        });

        function getTestDocument() {
            var iframe = document.getElementById("selectors") as HTMLIFrameElement;
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            for (var i = doc.documentElement.childNodes.length-1; i >= 0; i -= 1) {
                doc.documentElement.removeChild(doc.documentElement.childNodes[i]);
            }
            doc.documentElement.appendChild(doc.createElement('head'));
            doc.documentElement.firstChild.appendChild(doc.createElement('title'));
            doc.documentElement.appendChild(doc.createElement('body'));
            return doc;
        }

        QUnit.test("Acid3 test 9: extractContents() in a Document", function(t) {
            var doc = getTestDocument();
            var h1 = doc.createElement('h1');
            var t1 = doc.createTextNode('Hello ');
            h1.appendChild(t1);
            var em = doc.createElement('em');
            var t2 = doc.createTextNode('Wonderful');
            em.appendChild(t2);
            h1.appendChild(em);
            var t3 = doc.createTextNode(' Kitty');
            h1.appendChild(t3);
            doc.body.appendChild(h1);
            var p = doc.createElement('p');
            var t4 = doc.createTextNode('How are you?');
            p.appendChild(t4);
            doc.body.appendChild(p);
            var r = rangeCreator(doc);
            r.selectNodeContents(doc);
            t.equal(r.toString(), "Hello Wonderful KittyHow are you?", "toString() on range selecting Document gave wrong output: " + r.toString());
            r.setStart(t2, 6);
            r.setEnd(p, 0);
            // <body><h1>Hello <em>Wonder ful<\em> Kitty<\h1><p> How are you?<\p><\body>     (the '\'s are to avoid validation errors)
            //                           ^----------------------^
            t.equal(r.toString(), "ful Kitty", "toString() on range crossing text nodes gave wrong output");
            var f = r.extractContents();
            // <h1><em>ful<\em> Kitty<\h1><p><\p>
            // ccccccccccccccccMMMMMMcccccccccccc
            t.equal(f.nodeType, 11, "failure 1");
            t.ok(f.childNodes.length == 2, "expected two children in the result, got " + f.childNodes.length);
            t.equal(f.childNodes[0].tagName, "H1", "failure 3");
            t.ok(f.childNodes[0] != h1, "failure 4");
            t.equal(f.childNodes[0].childNodes.length, 2, "failure 5");
            t.equal(f.childNodes[0].childNodes[0].tagName, "EM", "failure 6");
            t.ok(f.childNodes[0].childNodes[0] != em, "failure 7");
            t.equal(f.childNodes[0].childNodes[0].childNodes.length, 1, "failure 8");
            t.equal(f.childNodes[0].childNodes[0].childNodes[0].data, "ful", "failure 9");
            t.ok(f.childNodes[0].childNodes[0].childNodes[0] != t2, "failure 10");
            t.equal(f.childNodes[0].childNodes[1], t3, "failure 11");
            t.ok(f.childNodes[0].childNodes[1] != em, "failure 12");
            t.equal(f.childNodes[1].tagName, "P", "failure 13");
            t.equal(f.childNodes[1].childNodes.length, 0, "failure 14");
            t.ok(f.childNodes[1] != p, "failure 15");
        });

        QUnit.skip("Acid3 test 10: Ranges and Attribute Nodes", function(t) {
            // test 10: Ranges and Attribute Nodes
            // COMMENTED OUT FOR 2011 UPDATE - turns out instead of dropping Attr entirely, as Acid3 originally expected, the API is just being refactored
            /*
            var e = document.getElementById('test');
            if (!e.getAttributeNode) {
                return; // support for attribute nodes is optional in Acid3, because attribute nodes might be removed from DOM Core in the future.
            }
            // however, if they're supported, they'd better work:
            var a = e.getAttributeNode('id');
            var r = rangeCreator(document);
            r.selectNodeContents(a);
            t.equal(r.toString(), "test", "toString() didn't work for attribute node");
            var t2 = a.firstChild;
            var f = r.extractContents();
            t.equal(f.childNodes.length, 1, "extracted contents were the wrong length");
            t.equal(f.childNodes[0], t2, "extracted contents were the wrong node");
            t.equal(t2.textContent, 'test', "extracted contents didn't match old attribute value");
            t.equal(r.toString(), '', "extracting contents didn't empty attribute value; instead equals '" + r.toString() + "'");
            t.equal(e.getAttribute('id'), '', "extracting contents didn't change 'id' attribute to empty string");
            e.id = 'test';
            */
        });

        QUnit.test("Acid3 test 11: Ranges and Comments", function(t) {
            // test 11: Ranges and Comments
            var msg;
            var doc = getTestDocument();
            var c1 = doc.createComment("11111");
            doc.appendChild(c1);
            var r = rangeCreator(doc);
            r.selectNode(c1);
            msg = 'wrong exception raised';
            try {
                r.surroundContents(doc.createElement('a'));
                msg = 'no exception raised';
            } catch (e) {
                if ('code' in e) msg += '; code = ' + e.code;
                if (e.code == 3) msg = '';
            }
            t.ok(msg == '', "when inserting <a> into Document with another child: " + msg);
            var c2 = doc.createComment("22222");
            doc.body.appendChild(c2);
            var c3 = doc.createComment("33333");
            doc.body.appendChild(c3);
            r.setStart(c2, 2);
            r.setEnd(c3, 3);
            msg = 'wrong exception raised';
            try {
                r.surroundContents(doc.createElement('a'));
                msg = 'no exception raised';
            } catch (e) {
                // COMMENTED OUT FOR 2011 UPDATE - DOM Core changes the exception from RangeException.BAD_BOUNDARYPOINTS_ERR (1) to DOMException.INVALID_STATE_ERR (11)
                /*if ('code' in e) msg += '; code = ' + e.code;
                if (e.code == 1) */msg = '';
            }
            t.ok(msg == '', "when trying to surround two halves of comment: " + msg);
            t.equal(r.toString(), "", "comments returned text");
        });

        QUnit.test("Acid3 test 12: Ranges under mutations: insertion into text nodes", function(t) {
            var doc = getTestDocument();
            var p = doc.createElement('p');
            var t1 = doc.createTextNode('12345');
            p.appendChild(t1);
            var t2 = doc.createTextNode('ABCDE');
            p.appendChild(t2);
            doc.body.appendChild(p);
            var r = rangeCreator(doc);
            r.setStart(p.firstChild, 2);
            r.setEnd(p.firstChild, 3);
            t.ok(!r.collapsed, "collapsed is wrong at start");
            t.equal(r.commonAncestorContainer, p.firstChild, "commonAncestorContainer is wrong at start");
            t.equal(r.startContainer, p.firstChild, "startContainer is wrong at start");
            t.equal(r.startOffset, 2, "startOffset is wrong at start");
            t.equal(r.endContainer, p.firstChild, "endContainer is wrong at start");
            t.equal(r.endOffset, 3, "endOffset is wrong at start");
            t.equal(r.toString(), "3", "range in text node stringification failed");
            r.insertNode(p.lastChild);
            t.equal(p.childNodes.length, 3, "insertion of node made wrong number of child nodes");
            t.equal(p.childNodes[0], t1, "unexpected first text node");
            t.equal((p.childNodes[0] as CharacterData).data, "12", "unexpected first text node contents");
            t.equal(p.childNodes[1], t2, "unexpected second text node");
            t.equal((p.childNodes[1] as CharacterData).data, "ABCDE", "unexpected second text node");
            t.equal((p.childNodes[2] as CharacterData).data, "345", "unexpected third text node contents");
            // The spec is very vague about what exactly should be in the range afterwards:
            // the insertion results in a splitText(), which it says is equivalent to a truncation
            // followed by an insertion, but it doesn't say what to do when you have a truncation,
            // so we don't know where either the start or the end boundary points end up.
            // The spec really should be clarified for how to handle splitText() and
            // text node truncation in general
            // The only thing that seems very clear is that the inserted text node should
            // be in the range, and it has to be at the start, since insertion always puts it at
            // the start.

            // Tim's note: I disagree with the conclusions the following tests draw from the spec, so they are removed
/*
            t.ok(!r.collapsed, "collapsed is wrong after insertion");
            t.ok(r.toString().match(/^ABCDE/), "range didn't start with the expected text; range stringified to '" + r.toString() + "'");
*/
        });

        // Mutation handling not yet implemented

/*    QUnit.test("Acid3 test 13: Ranges under mutations: deletion", function(t) {
        var doc = getTestDocument();
        var p = doc.createElement('p');
        p.appendChild(doc.createTextNode("12345"));
        doc.body.appendChild(p);
        var r = rangeCreator(doc);
        r.setEnd(doc.body, 1);
        r.setStart(p.firstChild, 2);
        t.ok(!r.collapsed, "collapsed is wrong at start");
        t.equal(r.commonAncestorContainer, doc.body, "commonAncestorContainer is wrong at start");
        t.equal(r.startContainer, p.firstChild, "startContainer is wrong at start");
        t.equal(r.startOffset, 2, "startOffset is wrong at start");
        t.equal(r.endContainer, doc.body, "endContainer is wrong at start");
        t.equal(r.endOffset, 1, "endOffset is wrong at start");
        doc.body.removeChild(p);
        t.ok(r.collapsed, "collapsed is wrong after deletion");
        t.equal(r.commonAncestorContainer, doc.body, "commonAncestorContainer is wrong after deletion");
        t.equal(r.startContainer, doc.body, "startContainer is wrong after deletion");
        t.equal(r.startOffset, 0, "startOffset is wrong after deletion");
        t.equal(r.endContainer, doc.body, "endContainer is wrong after deletion");
        t.equal(r.endOffset, 0, "endOffset is wrong after deletion");
    });*/
}

testRangeCreator([document], "main", createRangyRange, "Rangy Range");
testRangeCreator([document], "main", createWrappedNativeDomRange, "Wrapped native Range");

if (hasNativeDomRange) {
    testRangeCreator([document], "main", createNativeDomRange, "native Range");
}

var iframeDoc = [];
testRangeCreator(iframeDoc, "iframe", createRangyRange, "Rangy Range");
testRangeCreator(iframeDoc, "iframe", createWrappedNativeDomRange, "Wrapped native Range");

if (hasNativeDomRange) {
    testRangeCreator(iframeDoc, "iframe", createNativeDomRange, "native Range");
}

var iframeEl;

window.addEventListener("load", function() {
    // Do it in an iframe
    iframeEl = document.body.appendChild(document.createElement("iframe"));
    var doc = iframeEl.contentDocument || iframeEl.contentWindow.document;
    doc.open();
    doc.write("<html><head><title>Rangy Test</title></head><body>Content</body></html>");
    doc.close();
    iframeDoc[0] = doc;
});

testAcid3(createRangyRange, "Rangy Range");
testAcid3(createWrappedNativeDomRange, "Wrapped native Range");

if (hasNativeDomRange) {
    testAcid3(createNativeDomRange, "native Range");
}

var hasRangyRangePrototype = "rangePrototype" in rangy;

QUnit.module("Range miscellaneous");
    QUnit.test("rangy.rangePrototype is removed in rangy2", function(t) {
        t.notOk(hasRangyRangePrototype);
    });

    function testRangeDoc(t, range, doc) {
        t.equal(rangy.dom.getDocument(range.startContainer), doc);
    }

    QUnit.test("createRange() parameter tests", function(t) {
        var range = rangy.createRange();
        testRangeDoc(t, range, document);

        range = rangy.createRange(document);
        testRangeDoc(t, range, document);

        range = rangy.createRange(window);
        testRangeDoc(t, range, document);

        range = rangy.createRange(document.body);
        testRangeDoc(t, range, document);

        range = rangy.createRange(document.firstChild);
        testRangeDoc(t, range, document);

        t.throws(function() {
            range = rangy.createRange({});
        });
    });

    QUnit.test("iframe createRange() parameter tests", function(t) {
        var doc = rangy.dom.getIframeDocument(iframeEl);

        var range = rangy.createRange(doc);
        testRangeDoc(t, range, doc);

        range = rangy.createRange(rangy.dom.getIframeWindow(iframeEl));
        testRangeDoc(t, range, doc);

        range = rangy.createRange(iframeEl);
        testRangeDoc(t, range, doc);

        range = rangy.createRange(doc.body);
        testRangeDoc(t, range, doc);

        range = rangy.createRange(doc.firstChild);
        testRangeDoc(t, range, doc);

        range = rangy.createRange(iframeEl.parentNode);
        testRangeDoc(t, range, document);
    });
