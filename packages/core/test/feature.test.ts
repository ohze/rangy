import * as rangy from "@rangy/core";
import Bowser from "bowser";

const browser = Bowser.getParser(window.navigator.userAgent);
QUnit.module("Browser feature tests");

    // Detect browser version roughly. It doesn't matter too much: these are only rough tests designed to test whether
    // Rangy's feature detection is hopelessly wrong

    const isIe = browser.satisfies({ie: '>0'});
    const isMozilla = browser.isEngine('gecko');
    const isOpera = browser.isEngine('presto');

    QUnit.test("DOM Range support", function(t) {
        t.equal(rangy.features.implementsDomRange, !browser.satisfies({ie: '<9'}));
    });

    QUnit.test("TextRange support", function(t) {
        t.equal(false, !!undefined);
        t.equal(rangy.features.implementsTextRange, !!browser.satisfies({ie: '>=4'}));
    });

    QUnit.test("document.selection support", function(t) {
        t.equal(rangy.features.implementsTextRange, !!browser.satisfies({ie: '>=4'}));
    });

    QUnit.test("window.getSelection() support", function(t) {
        t.equal(rangy.features.implementsWinGetSelection, !browser.satisfies({ie: '<9'}));
    });

    QUnit.test("selection has rangeCount", function(t) {
        t.equal(rangy.features.selectionHasRangeCount, !browser.satisfies({ie: '<9'}));
    });

    QUnit.test("selection has anchor and focus support", function(t) {
        t.equal(rangy.features.selectionHasAnchorAndFocus, !browser.satisfies({ie: '<9'}));
    });

    QUnit.test("selection has extend() method", function(t) {
        t.equal(rangy.features.selectionHasExtend, !isIe);
    });

    QUnit.test("HTML parsing", function(t) {
        t.equal(rangy.features.htmlParsingConforms, !isIe);
    });

    QUnit.test("Multiple ranges per selection support", function(t) {
        t.equal(rangy.features.selectionSupportsMultipleRanges, isMozilla);
    });

    QUnit.test("Collapsed non-editable selections support", function(t) {
        t.equal(rangy.features.collapsedNonEditableSelectionsSupported, !isOpera);
    });
