import {RangyRangeEx, WrappedSelection} from "rangy2";

var hasNativeGetSelection = "getSelection" in window;
var hasNativeDomRange = "createRange" in document;

function createRangySelection(win): WrappedSelection {
    return rangy.getSelection(win);
}

function createNativeSelection(win): Selection {
    return win.getSelection();
}

function createRangyRange(doc) {
    return new rangy.DomRange(doc);
}

function createNativeDomRange(doc) {
    return doc.createRange();
}

function createWrappedNativeDomRange(doc) {
    return rangy.createRange(doc);
}

function testExceptionCode(t, func, code) {
    try {
        func();
        t.fail("No error thrown");
    } catch (ex) {
        t.equal(ex.code, code);
    }
}

function getOtherDocument() {
    var iframe = document.getElementById("selectors") as HTMLIFrameElement;
    return iframe.contentDocument || iframe.contentWindow.document;
}

type SelectionCreator = (win) => WrappedSelection | Selection;

function testSelectionAndRangeCreators(wins, winName,
                                       selectionCreator: SelectionCreator,
                                       selectionCreatorName, rangeCreator, rangeCreatorName) {
    var win, doc: Document;
    var DomRange = rangy.DomRange;
    var DOMException = rangy.DOMException;
    let nodes: {
        div: HTMLDivElement;
        plainText: Text;
        b: HTMLElement;
        boldText: Text;
        i: HTMLElement;
        boldAndItalicText: Text;
        boldText2: Text;
        div2: HTMLDivElement;
        div2Text: Text;
    };
    const hooks: Hooks = {
        beforeEach: function () {
            win = wins[0];
            doc = win.document;
            var div = doc.createElement("div");
            var plainText = div.appendChild(doc.createTextNode("plain"));
            var b = div.appendChild(doc.createElement("b"));
            var boldText = b.appendChild(doc.createTextNode("bold"));
            var i = b.appendChild(doc.createElement("i"));
            var boldAndItalicText = i.appendChild(doc.createTextNode("bold and italic"));
            var boldText2 = b.appendChild(doc.createTextNode("more bold"));
            doc.body.appendChild(div);
            var div2 = doc.createElement("div");
            var div2Text = div2.appendChild(doc.createTextNode("Second div"));
            doc.body.appendChild(div2);

            nodes = {div, plainText, b, boldText, i, boldAndItalicText, boldText2, div2, div2Text};
        },
        afterEach: function () {
            doc.body.removeChild(nodes.div);
            doc.body.removeChild(nodes.div2);
            nodes = null;
        }
    };

    QUnit.module(selectionCreatorName + " in " + winName + " window with range creator " + rangeCreatorName, hooks);

    // FIXME is tests atomic when modifying initialCheckSelectionRanges?
    // https://qunitjs.com/cookbook/#keeping-tests-atomic
    let initialCheckSelectionRanges: boolean;
        function setUp_noRangeCheck(t) {
            initialCheckSelectionRanges = rangy.config.checkSelectionRanges;
            rangy.config.checkSelectionRanges = false;
        }

        function tearDown_noRangeCheck(t) {
            rangy.config.checkSelectionRanges = initialCheckSelectionRanges;
        }

        QUnit.test("removeAllRanges test", function(t) {
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            t.equal(sel.rangeCount, 0);
            t.assertNull(sel.anchorNode);
            t.equal(sel.anchorOffset, 0);
            t.assertNull(sel.focusNode);
            t.equal(sel.focusOffset, 0);
            t.strictEqual(sel.isCollapsed, true);
        });

        QUnit.testEx("addRange test", function(t) {
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.plainText);
            sel.addRange(range);
            t.equal(sel.rangeCount, 1);
            t.strictEqual(sel.anchorNode, nodes.plainText);
            t.equal(sel.anchorOffset, 0);
            t.strictEqual(sel.focusNode, nodes.plainText);
            t.equal(sel.focusOffset, nodes.plainText.length);
            t.strictEqual(sel.isCollapsed, false);
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        QUnit.testEx("removeRange test", function(t) {
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.plainText);
            sel.addRange(range);
            t.equal(sel.rangeCount, 1);
            sel.removeRange(range);
            t.equal(sel.rangeCount, 0);
            t.assertNull(sel.anchorNode);
            t.equal(sel.anchorOffset, 0);
            t.assertNull(sel.focusNode);
            t.equal(sel.focusOffset, 0);
            t.strictEqual(sel.isCollapsed, true);
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        QUnit.testEx("removeRange instance test", function(t) {
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.plainText);
            sel.addRange(range);
            t.equal(sel.rangeCount, 1);
            range.selectNodeContents(nodes.b);
            sel.removeRange(range);
            t.equal(sel.rangeCount, 0);
            t.assertNull(sel.anchorNode);
            t.equal(sel.anchorOffset, 0);
            t.assertNull(sel.focusNode);
            t.equal(sel.focusOffset, 0);
            t.strictEqual(sel.isCollapsed, true);
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        if (rangy.features.selectionSupportsMultipleRanges) {
            // Next test no longer applies
/*
            QUnit.test("removeRange multiple instances of same range test", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.plainText);
                sel.addRange(range);
                sel.addRange(range);
                t.equal(sel.rangeCount, 2);
                sel.removeRange(range);
                t.equal(sel.rangeCount, 1);
                sel.removeRange(range);
                t.equal(sel.rangeCount, 0);
            }, setUp_noRangeCheck, tearDown_noRangeCheck);
*/

            QUnit.testEx("Multiple ranges test", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.plainText);
                sel.addRange(range);
                var r2 = rangeCreator(doc);
                r2.selectNodeContents(nodes.boldText);
                sel.addRange(r2);

                if (sel.rangeCount == 2) {
                    t.ok(DomRange.rangesEqual(range, sel.getRangeAt(0)));
                    t.ok(DomRange.rangesEqual(r2, sel.getRangeAt(1)));
                } else if (sel.rangeCount == 1) {
                    t.ok(DomRange.rangesEqual(range, sel.getRangeAt(0)));
                }
            }, setUp_noRangeCheck, tearDown_noRangeCheck);
        } else {
            QUnit.testEx("Adding mutiple ranges where only one is supported", function(t) {
                rangy.config.checkSelectionRanges = false;
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range1 = rangeCreator(doc);
                range1.selectNodeContents(nodes.plainText);
                var range2 = rangeCreator(doc);
                range2.selectNodeContents(nodes.b);
                sel.addRange(range1);
                t.equal(sel.rangeCount, 1);
                sel.addRange(range2);
                t.equal(sel.rangeCount, 1);

                // According to the spec, a reference to the added range should be stored by the selection so that the
                // same range object is returned by getRangeAt(). However, most browsers don't do this (WebKit, IE) and
                // Rangy doesn't do this either because it sometimes needs to change the range boundary points to make
                // them valid selection boundaries.
                //t.strictEqual(range2, sel.getRangeAt(0));

                // https://www.chromestatus.com/features/6680566019653632
                sel.removeRange(range2);
                t.equal(sel.rangeCount, 1);
                sel.removeRange(range1);
                t.equal(sel.rangeCount, 0);
                rangy.config.checkSelectionRanges = false;
            }, setUp_noRangeCheck, tearDown_noRangeCheck);
        }

        QUnit.testEx("getRangeAt test", function(t) {
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.plainText);
            sel.addRange(range);
            t.ok(DomRange.rangesEqual(range, sel.getRangeAt(0)));
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        if (rangy.features.collapsedNonEditableSelectionsSupported) {
            QUnit.testEx("Collapse same document test (non-editable)", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.plainText);
                sel.addRange(range);
                sel.collapse(nodes.plainText, 1);
                t.equal(sel.rangeCount, 1);
                t.strictEqual(sel.anchorNode, nodes.plainText);
                t.equal(sel.anchorOffset, 1);
                t.strictEqual(sel.focusNode, nodes.plainText);
                t.equal(sel.focusOffset, 1);
                t.strictEqual(sel.isCollapsed, true);
            }, setUp_noRangeCheck, tearDown_noRangeCheck);

            QUnit.skipEx("Collapse other document test (non-editable)", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.plainText);
                sel.addRange(range);
                sel.collapse(nodes.b, 1);
                var otherDoc = getOtherDocument();

                // The spec doesn't seem to suggest an exception should be thrown any more. Browser behaviour varies,
                // it's an edge case so allow either by not testing
/*
                testExceptionCode(t, function() {
                    sel.collapse(otherDoc.body, 0);
                }, DOMException.prototype.WRONG_DOCUMENT_ERR);
*/
/*
                t.assertNoError(function() {
                    sel.collapse(otherDoc.body, 0);
                });
*/
            }, setUp_noRangeCheck, tearDown_noRangeCheck);

            QUnit.testEx("collapseToStart test (non-editable)", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.setStart(nodes.boldText, 1);
                range.setEnd(nodes.boldText, 2);
                sel.addRange(range);
                sel.collapseToStart();
                t.equal(sel.rangeCount, 1);
                t.strictEqual(sel.anchorNode, nodes.boldText);
                t.equal(sel.anchorOffset, 1);
                t.strictEqual(sel.focusNode, nodes.boldText);
                t.equal(sel.focusOffset, 1);
                t.strictEqual(sel.isCollapsed, true);
            }, setUp_noRangeCheck, tearDown_noRangeCheck);

            QUnit.test("collapseToEnd test (non-editable)", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.setStart(nodes.boldText, 1);
                range.setEnd(nodes.boldText, 2);
                sel.addRange(range);
                sel.collapseToEnd();
                t.equal(sel.rangeCount, 1);
                t.strictEqual(sel.anchorNode, nodes.boldText);
                t.equal(sel.anchorOffset, 2);
                t.strictEqual(sel.focusNode, nodes.boldText);
                t.equal(sel.focusOffset, 2);
                t.strictEqual(sel.isCollapsed, true);
            });
        } else {
            QUnit.testEx("Test collapsed selections cannot exist in non-editable elements", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.selectNodeContents(nodes.plainText);
                sel.addRange(range);
                sel.collapse(nodes.plainText, 1);
                t.equal(sel.rangeCount, 0);
            }, setUp_noRangeCheck, tearDown_noRangeCheck);
        }

        QUnit.testEx("Collapse same document test (editable)", function(t) {
            nodes.div.contentEditable = 'true';
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.plainText);
            sel.addRange(range);
            sel.collapse(nodes.plainText, 1);
            t.equal(sel.rangeCount, 1);
            t.strictEqual(sel.anchorNode, nodes.plainText);
            t.equal(sel.anchorOffset, 1);
            t.strictEqual(sel.focusNode, nodes.plainText);
            t.equal(sel.focusOffset, 1);
            t.strictEqual(sel.isCollapsed, true);
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        QUnit.skipEx("Collapse other document test (editable)", function(t) {
            nodes.div.contentEditable = 'true';
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.selectNodeContents(nodes.plainText);
            sel.addRange(range);
            sel.collapse(nodes.b, 1);
            var otherDoc = getOtherDocument();

            // The spec doesn't seem to suggest an exception should be thrown any more. Browser behaviour varies, it's an edge
            // case so allow either by not testing
/*
            testExceptionCode(t, function() {
                sel.collapse(otherDoc.body, 0);
            }, DOMException.prototype.WRONG_DOCUMENT_ERR);
*/
/*
            t.assertNoError(function() {
                sel.collapse(otherDoc.body, 0);
            });
*/
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        QUnit.testEx("collapseToStart test (editable)", function(t) {
            nodes.div.contentEditable = 'true';
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.setStart(nodes.boldText, 1);
            range.setEnd(nodes.boldText, 2);
            sel.addRange(range);
            sel.collapseToStart();
            t.equal(sel.rangeCount, 1);
            t.strictEqual(sel.anchorNode, nodes.boldText);
            t.equal(sel.anchorOffset, 1);
            t.strictEqual(sel.focusNode, nodes.boldText);
            t.equal(sel.focusOffset, 1);
            t.strictEqual(sel.isCollapsed, true);
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        QUnit.test("collapseToEnd test (editable)", function(t) {
            nodes.div.contentEditable = 'true';
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.setStart(nodes.boldText, 1);
            range.setEnd(nodes.boldText, 2);
            sel.addRange(range);
            sel.collapseToEnd();
            t.equal(sel.rangeCount, 1);
            t.strictEqual(sel.anchorNode, nodes.boldText);
            t.equal(sel.anchorOffset, 2);
            t.strictEqual(sel.focusNode, nodes.boldText);
            t.equal(sel.focusOffset, 2);
            t.strictEqual(sel.isCollapsed, true);
        });

        QUnit.testEx("selectAllChildren same document test", function(t) {
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 1);
            range.setEnd(nodes.plainText, 2);
            sel.addRange(range);
            sel.selectAllChildren(nodes.div);
            t.equal(sel.rangeCount, 1);
            t.strictEqual(sel.anchorNode, nodes.div);
            t.equal(sel.anchorOffset, 0);
            t.strictEqual(sel.focusNode, nodes.div);
            t.equal(sel.focusOffset, nodes.div.childNodes.length);
            t.strictEqual(sel.isCollapsed, false);
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        QUnit.testEx("HTML5 toString script contents test", function(t) {
            var div = doc.createElement("div");
            div.innerHTML = 'one<script type="text/javascript">var x = 1;</script>two';
            doc.body.appendChild(div);
            var s = doc.getElementById("s1");
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.selectNodeContents(div);
            sel.addRange(range);
            var rangeText = range.toString();
            var selText = sel.toString();
            doc.body.removeChild(div);
            t.equal(rangeText, "onevar x = 1;two");
            t.equal(selText, "onevar x = 1;two");
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        QUnit.testEx("HTML5 toString display:none contents test", function(t) {
            var div = doc.createElement("div");
            div.innerHTML = 'one<div style="display: none">two</div>three';
            doc.body.appendChild(div);
            var sel = selectionCreator(win);
            sel.removeAllRanges();
            var range = rangeCreator(doc);
            range.selectNodeContents(div);
            sel.addRange(range);
            var rangeText = range.toString();
            var selText = sel.toString();
            doc.body.removeChild(div);
            t.equal(rangeText, "onetwothree");
            t.equal(selText, "onetwothree");
        }, setUp_noRangeCheck, tearDown_noRangeCheck);

        var testSelection = selectionCreator(window);
        var testRange = rangeCreator(document);

        if (testSelection.containsNode && testRange.containsNode) {
            QUnit.testEx("containsNode test", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 1);
                range.setEnd(nodes.plainText, 2);
                sel.addRange(range);
                t.assertFalse(sel.containsNode(nodes.plainText, false));
                t.assertTrue(sel.containsNode(nodes.plainText, true));
            }, setUp_noRangeCheck, tearDown_noRangeCheck);
        }

        function isNativeSel(selectionCreator, method: string): selectionCreator is (win) => Selection  {
            return testSelection[method];
        }
        function isWrappedSel(selectionCreator, ...methods: string[]): selectionCreator is (win) => WrappedSelection  {
            return methods.every(m => testSelection[m]);
        }
        if (isNativeSel(selectionCreator, 'extend')) {
            QUnit.testEx("extend test", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 1);
                range.setEnd(nodes.plainText, 2);
                sel.addRange(range);
                sel.extend(nodes.boldText, 1);
                t.equal(sel.rangeCount, 1);
                t.strictEqual(sel.anchorNode, nodes.plainText);
                t.equal(sel.anchorOffset, 1);
                t.strictEqual(sel.focusNode, nodes.boldText);
                t.equal(sel.focusOffset, 1);
                t.strictEqual(sel.isCollapsed, false);
            }, setUp_noRangeCheck, tearDown_noRangeCheck);

            QUnit.testEx("extend backwards test", function(t) {
                var sel = selectionCreator(win);
                sel.removeAllRanges();
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 2);
                range.setEnd(nodes.plainText, 3);
                sel.addRange(range);
                sel.extend(nodes.plainText, 1);
                t.equal(sel.rangeCount, 1);
                t.strictEqual(sel.anchorNode, nodes.plainText);
                t.equal(sel.anchorOffset, 2);
                t.strictEqual(sel.focusNode, nodes.plainText);
                t.equal(sel.focusOffset, 1);
                t.strictEqual(sel.isCollapsed, false);
                t.strictEqual(sel.toString(), "l");
            }, setUp_noRangeCheck, tearDown_noRangeCheck);
        }

        function testRefresh(name: string, testRangeCreator: (t: Assert) => RangyRangeEx) {
            if (isWrappedSel(selectionCreator, 'refresh')) {
                QUnit.test("Refresh test: " + name, function(t) {
                    const sel = selectionCreator(win);
                    var range = testRangeCreator(t);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    sel.refresh();
                    t.equal(sel.rangeCount, 1);
                    var selRange = sel.getRangeAt(0);
                    t.ok(DomRange.rangesEqual(range, selRange), "Ranges not equal. Original: " + DomRange.inspect(range) + ", refreshed selection range: " + DomRange.inspect(selRange));
                });
            }
        }

        testRefresh("uncollapsed selection mid text node", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 1);
            range.setEnd(nodes.plainText, 2);
            return range;
        });

        testRefresh("uncollapsed selection start of text node", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.boldAndItalicText, 0);
            range.setEnd(nodes.boldAndItalicText, 1);
            return range;
        });

        testRefresh("uncollapsed selection end of text node", function(t) {
            var range = rangeCreator(doc);
            range.setStart(nodes.boldAndItalicText, nodes.boldAndItalicText.length - 1);
            range.setEnd(nodes.boldAndItalicText, nodes.boldAndItalicText.length);
            return range;
        });

        testRefresh("collapsed selection mid text node", function(t) {
            var range = rangeCreator(doc);
            nodes.div.contentEditable = 'true';
            range.setStart(nodes.boldAndItalicText, 1);
            range.collapse(true);
            return range;
        });

        testRefresh("collapsed selection start of text node", function(t) {
            var range = rangeCreator(doc);
            nodes.div.contentEditable = 'true';
            range.setStart(nodes.boldAndItalicText, 0);
            range.collapse(true);
            return range;
        });

        testRefresh("collapsed selection end of text node", function(t) {
            var range = rangeCreator(doc);
            nodes.div.contentEditable = 'true';
            range.setStart(nodes.boldAndItalicText, nodes.boldAndItalicText.length);
            range.collapse(true);
            return range;
        });

        testRefresh("collapsed selection immediately prior to element", function(t) {
            var range = rangeCreator(doc);
            nodes.div.contentEditable = 'true';
            range.setStart(nodes.b, 1);
            range.collapse(true);
            return range;
        });

        testRefresh("collapsed selection immediately after element", function(t) {
            var range = rangeCreator(doc);
            nodes.div.contentEditable = 'true';
            range.setStart(nodes.b, 2);
            range.collapse(true);
            return range;
        });

        testRefresh("collapsed selection at offset 0 in element", function(t) {
            var range = rangeCreator(doc);
            nodes.div.contentEditable = 'true';
            range.setStart(nodes.b, 0);
            range.collapse(true);
            return range;
        });

        testRefresh("collapsed selection encompassing element", function(t) {
            var range = rangeCreator(doc);
            nodes.div.contentEditable = 'true';
            range.setStart(nodes.b, 1);
            range.setEnd(nodes.b, 2);
            return range;
        });

    if (isWrappedSel(selectionCreator, 'refresh')) {
        var sel = selectionCreator(win);
        if (sel.nativeSelection.selectAllChildren) {
            QUnit.test("Refresh check for changes test", function (t) {
                t.assertFalse(sel.refresh(true));

                sel.nativeSelection.selectAllChildren(nodes.div);
                t.assertTrue(sel.refresh(true));
                t.assertFalse(sel.refresh(true));

                sel.collapseToEnd();
                t.assertFalse(sel.refresh(true));
            });
        }
    }

        // The behaviour tested by the next two tests is the opposite of what is in the spec (see
        // https://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#dom-selection-addrange), but Rangy simply cannot
        // respect the spec in this instance because many browsers (WebKit) mangle ranges as they are added to the
        // selection.
    if (isWrappedSel(selectionCreator, 'setSingleRange')) {
        QUnit.test("Selection and range independence: addRange", function (t) {
            var sel = selectionCreator(win);
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 0);
            range.collapse(true);
            sel.setSingleRange(range);
            range.selectNodeContents(nodes.plainText);
            sel.refresh();
            t.ok(sel.isCollapsed);
        });

        QUnit.test("Selection and range independence: getRangeAt", function(t) {
            var sel = selectionCreator(win);
            var range = rangeCreator(doc);
            range.setStart(nodes.plainText, 0);
            range.collapse(true);
            sel.setSingleRange(range);
            sel.refresh();

            var selRange = sel.getRangeAt(0);
            selRange.selectNodeContents(nodes.div);
            sel.refresh();
            t.ok(sel.isCollapsed);
        });
    }

        if (isWrappedSel(selectionCreator, 'toHtml')) {
            QUnit.test("toHtml", function(t) {
                var sel = selectionCreator(win);
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 0);
                range.setEnd(nodes.plainText, nodes.plainText.length);
                sel.removeAllRanges();
                sel.addRange(range);
                t.equal(sel.toHtml(), nodes.plainText.data);
            });
        }

/*
        if (testSelection.getNativeTextRange) {
            QUnit.test("getNativeTextRange", function(t) {
                var sel = selectionCreator(win);
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 1);
                range.setEnd(nodes.plainText, 3);
                sel.setSingleRange(range);
                var textRange = sel.getNativeTextRange();
                t.equal(textRange.text, "la");
                t.equal(textRange.parentElement(), nodes.div);
            });
        }
*/
        if (isWrappedSel(selectionCreator, 'saveRanges', 'restoreRanges')) {
            QUnit.test("saveRanges and restoreRanges simple", function(t) {
                var sel = selectionCreator(win);
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 1);
                range.setEnd(nodes.plainText, 3);
                sel.setSingleRange(range);
                var savedRanges = sel.saveRanges();
                sel.selectAllChildren(nodes.div);
                sel.restoreRanges(savedRanges);
                t.equal(sel.anchorNode, nodes.plainText);
                t.equal(sel.anchorOffset, 1);
                t.equal(sel.focusNode, nodes.plainText);
                t.equal(sel.focusOffset, 3);
            });

            QUnit.test("saveRanges and restoreRanges backwards", function(t) {
                var sel = selectionCreator(win);
                var range = rangeCreator(doc);
                range.setStart(nodes.plainText, 1);
                range.setEnd(nodes.plainText, 3);
                sel.setSingleRange(range, "backward");
                var savedRanges = sel.saveRanges();
                sel.selectAllChildren(nodes.div);
                sel.restoreRanges(savedRanges);
                t.equal(sel.anchorNode, nodes.plainText);
                t.equal(sel.anchorOffset, 3);
                t.equal(sel.focusNode, nodes.plainText);
                t.equal(sel.focusOffset, 1);
            });

            if (rangy.features.selectionSupportsMultipleRanges) {
                QUnit.test("saveRanges and restoreRanges multiple ranges", function(t) {
                    var sel = selectionCreator(win);

                    var range = rangeCreator(doc);
                    range.setStart(nodes.plainText, 1);
                    range.setEnd(nodes.plainText, 3);

                    var range2 = rangeCreator(doc);
                    range2.setStart(nodes.boldText, 1);
                    range2.setEnd(nodes.boldText, 2);

                    sel.setRanges([range, range2]);
                    var savedRanges = sel.saveRanges();
                    sel.selectAllChildren(nodes.div);
                    sel.restoreRanges(savedRanges);

                    t.equal(sel.rangeCount, 2);

                    var selRange1 = sel.getRangeAt(0);
                    t.equal(selRange1.startContainer, nodes.plainText);
                    t.equal(selRange1.startOffset, 1);
                    t.equal(selRange1.endContainer, nodes.plainText);
                    t.equal(selRange1.endOffset, 3);

                    var selRange2 = sel.getRangeAt(1);
                    t.equal(selRange2.startContainer, nodes.boldText);
                    t.equal(selRange2.startOffset, 1);
                    t.equal(selRange2.endContainer, nodes.boldText);
                    t.equal(selRange2.endOffset, 2);
                });
            }
        }
}

var iframeWin = [];

/*
function testRangeCreator(rangeCreator, rangeCratorName) {
    testSelectionAndRangeCreators([window], "main", createRangySelection, "Rangy Selection", rangeCreator, rangeCratorName);

    if (hasNativeGetSelection) {
        testSelectionAndRangeCreators([window], "main", createNativeSelection, "native selection", rangeCreator, rangeCratorName);
    }

    testSelectionAndRangeCreators(iframeWin, "iframe", createRangySelection, "Rangy Selection", rangeCreator, rangeCratorName);

    if (hasNativeGetSelection) {
        testSelectionAndRangeCreators(iframeWin, "iframe", createNativeSelection, "native selection", rangeCreator, rangeCratorName);
    }
}
*/

testSelectionAndRangeCreators([window], "main", createRangySelection, "Rangy Selection", createRangyRange, "Rangy Range");
testSelectionAndRangeCreators(iframeWin, "iframe", createRangySelection, "Rangy Selection", createRangyRange, "Rangy Range");

testSelectionAndRangeCreators([window], "main", createRangySelection, "Rangy Selection", createWrappedNativeDomRange, "Wrapped native Range");
testSelectionAndRangeCreators(iframeWin, "iframe", createRangySelection, "Rangy Selection", createWrappedNativeDomRange, "Wrapped native Range");

if (hasNativeDomRange) {
    testSelectionAndRangeCreators([window], "main", createRangySelection, "Rangy Selection", createNativeDomRange, "native Range");
    testSelectionAndRangeCreators(iframeWin, "iframe", createRangySelection, "Rangy Selection", createNativeDomRange, "native Range");

    if (hasNativeGetSelection) {
        testSelectionAndRangeCreators([window], "main", createNativeSelection, "native selection", createNativeDomRange, "native Range");
        testSelectionAndRangeCreators(iframeWin, "iframe", createNativeSelection, "native selection", createNativeDomRange, "native Range");
    }
}



/*
testRangeCreator(createRangyRange, "Rangy Range");
testRangeCreator(createWrappedNativeDomRange, "Wrapped native Range");

if (hasNativeDomRange) {
    testRangeCreator(createNativeDomRange, "native Range");
}
*/

var iframe;

QUnit.module("getIframeSelection test");
        QUnit.test("getIframeSelection test", function(t) {
            // getIframeSelection is removed in rangy2
            const sel = rangy.getSelection(iframe);
            // createIframeRange is removed in rangy2
            const range = rangy.createRange(iframe);
            range.selectNodeContents((range.commonAncestorContainer as Document).body);
            sel.setSingleRange(range);
            t.equal(sel.toString(), "content");
        });

var iframeEl;
window.addEventListener("load", function() {
    // Do it in an iframe
    iframeEl = document.body.appendChild(document.createElement("iframe"));
    var win = iframeEl.contentWindow;
    var doc = iframeEl.contentDocument || iframeEl.contentWindow.document;
    doc.open();
    doc.write("<html><head><title>Rangy Selection Test</title></head><body>Content</body></html>");
    doc.close();

    iframeWin[0] = win;
});

var hasRangySelectionPrototype = "rangePrototype" in rangy;
/*
rangy.selectionPrototype.preInitTest = function() {
    return true;
};
*/
QUnit.module("Miscellaneous selection tests");
    QUnit.skip("rangy.selectionPrototype existence test", function(t) {
        t.ok(hasRangySelectionPrototype);
    });
/*
    QUnit.test("Selection prototype pre-init extension", function(t) {
        t.ok(rangy.getSelection().preInitTest(), "test");
    });

    QUnit.test("Selection prototype extension", function(t) {
        rangy.selectionPrototype.fooBar = "test";

        t.equal(rangy.getSelection().fooBar, "test");
    });
*/
    QUnit.test("getSelection() parameter tests", function(t) {
        var sel = rangy.getSelection();
        t.equal(sel.win, window);

        sel = rangy.getSelection(window);
        t.equal(sel.win, window);

        sel = rangy.getSelection(document);
        t.equal(sel.win, window);

        sel = rangy.getSelection(document.body);
        t.equal(sel.win, window);

        sel = rangy.getSelection(document.firstChild);
        t.equal(sel.win, window);

        sel = rangy.getSelection(sel);
        t.equal(sel.win, window);

        t.throws(function() {
            sel = rangy.getSelection({} as any);
        });

        if (rangy.features.implementsWinGetSelection) {
            t.throws(function() {
                sel = rangy.getSelection(window.getSelection() as any);
            });
        }
    });

    QUnit.test("iframe createRange() parameter tests", function(t) {
        var win = rangy.dom.getIframeWindow(iframeEl);

        var sel = rangy.getSelection(iframeEl);
        t.equal(sel.win, win);

        sel = rangy.getSelection(win);
        t.equal(sel.win, win);

        sel = rangy.getSelection(win.document);
        t.equal(sel.win, win);

        sel = rangy.getSelection(win.document.body);
        t.equal(sel.win, win);

        sel = rangy.getSelection(win.document.firstChild);
        t.equal(sel.win, win);

        sel = rangy.getSelection(sel);
        t.equal(sel.win, win);
    });
