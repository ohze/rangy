QUnit.module("Range");

    function createTestNodes(parentNode, limit, copies) {
        if (limit > 0) {
            var n = parentNode.appendChild(document.createElement("div"));
            n.appendChild(document.createTextNode("Before "));
            var p = n.appendChild(document.createElement("div"));
            n.appendChild(document.createTextNode(" after"));
            for (var i = 0; i < copies; i++) {
                createTestNodes(p, limit - 1, copies);
            }
        }
    }

    var testNode = document.createElement("div");
    createTestNodes(testNode, 14, 2);

    var dom = rangy.dom;

    QUnit.test("Iterate nodes (iterator)", function(t) {
        var recursiveNodes, nonRecursiveNodes, iteratorNodes;
        iteratorNodes = [];
        var it = dom.createIterator(testNode), node;
        while ( (node = it.next()) ) {
            iteratorNodes.push(node);
        }
        // Check results
        t.deepEqual(recursiveNodes, nonRecursiveNodes);
        t.deepEqual(iteratorNodes, nonRecursiveNodes);
    });


    QUnit.test("Node types regex", function(t) {
        var validNodeTypes = [1, 3, 4, 5, 6, 8, 9, 10];

        var numNodeTypes = 100;
        var isValid1, isValid2;

        isValid1 = [];
        var i = numNodeTypes;
        var regex = new RegExp("^(" + validNodeTypes.join("|") + ")$");
        while (i--) {
            isValid1[i] = regex.test((i % 12).toString());
        }

        // Node types array contains
        isValid2 = [];
        var i = numNodeTypes;
        while (i--) {
            isValid2[i] = validNodeTypes.includes(i % 12);
        }

        // Check results
        t.deepEqual(isValid1, isValid2);
    });

    QUnit.test("comparePoints 1", function(t) {
        var div = document.createElement("div");
        var text1 = div.appendChild(document.createTextNode("One"));
        var b = div.appendChild(document.createElement("b"));
        var text2 = b.appendChild(document.createTextNode("Two"));
        document.body.appendChild(div);

        t.equal(dom.comparePoints(text1, 1, text1, 2), -1);
        t.equal(dom.comparePoints(text1, 2, text1, 2), 0);
        t.equal(dom.comparePoints(text1, 3, text1, 2), 1);
        t.equal(dom.comparePoints(div, 0, text1, 2), -1);
        t.equal(dom.comparePoints(div, 1, text1, 2), 1);

/*
        var range = rangy.createRange();
        range.setStart(text1, 2);
        range.setEnd(text2, 2);
*/
    });

QUnit.start();
