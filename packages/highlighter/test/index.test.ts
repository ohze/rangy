import * as rangy from "@rangy/core";
import "@rangy/classapplier";
import "@rangy/highlighter";
import {createRangeInHtml} from "@rangy/test-util/testutils";
import "@rangy/test-util/qunit-ex";

QUnit.module("Highlighter module tests");

    QUnit.test("highlightSelection test", function(t) {
        var applier = rangy.createClassApplier("c1");
        var highlighter = rangy.createHighlighter();
        highlighter.addClassApplier(applier);

        var testEl = document.getElementById("test");
        var range = createRangeInHtml(testEl, 'one [two] three four');
        range.select();

        var highlights = highlighter.highlightSelection("c1");
        
        t.equal(highlights.length, 1);
        
        
        //t.assertEquals(highlights.length, 1);


    });

    QUnit.test("Options test (issue 249)", function(t) {
        var applier = rangy.createClassApplier("c1");
        var highlighter = rangy.createHighlighter();
        highlighter.addClassApplier(applier);

        highlighter.highlightSelection("c1", { selection: rangy.getSelection() });
    });
