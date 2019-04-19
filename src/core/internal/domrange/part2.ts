import {Constructor} from "../../util";
import {Module} from "../../module";
import * as dom from '../../dom';
import {
    comparePoints,
    DomPosition,
    getClosestAncestorIn,
    getContentDocument,
    getNodeIndex,
    getNodeLength,
    getRootContainer,
    isCharacterDataNode,
    removeNode,
    splitDataNode
} from '../../dom';

import {
    // from ./util
    assertNodeNotReadOnly, assertNoDocTypeNotationEntityAncestor, assertRangeValid, assertValidNodeType, assertValidOffset,
    beforeAfterNodeTypes, BoundaryUpdater, DomRangeBase, getElementAncestor, getRangeDocument,
    RangeBase, rangeProperties, rootContainerNodeTypes, updateBoundaries,
    // from ./RangeIterator
    deleteSubtree, extractSubtree, iterateSubtree, RangeIterator,
    // from ./part1
    comparisonConstants, ComparisonConstants, copyComparisonConstants,
    createDomRangeP1, rangeInspect, RangeP2, RangeP2Ex, rangesEqual, rangeToHtml, RangyRangeEx
} from "./_";

import * as log4javascript from "log4javascript";
var log = log4javascript.getLogger("rangy.DomRange");

// Pure JavaScript implementation of DOM Range
const module = new Module("DomRange", ["DomUtil"]);

    /*----------------------------------------------------------------------------------------------------------------*/

    // Utility functions

    function getBoundaryBeforeNode(node) {
        return new DomPosition(node.parentNode, getNodeIndex(node));
    }

    function getBoundaryAfterNode(node) {
        return new DomPosition(node.parentNode, getNodeIndex(node) + 1);
    }

    function splitRangeBoundaries(range: RangyRangeEx, positionsToPreserve?: DomPosition[]): void {
        assertRangeValid(range);

        log.debug("splitBoundaries called " + range.inspect(), positionsToPreserve);
        var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
        var startEndSame = (sc === ec);

        if (isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
            splitDataNode(ec, eo, positionsToPreserve);
            log.debug("Split end", dom.inspectNode(ec), eo);
        }

        if (isCharacterDataNode(sc) && so > 0 && so < sc.length) {
            log.debug("Splitting start", dom.inspectNode(sc), so);
            sc = splitDataNode(sc, so, positionsToPreserve);
            if (startEndSame) {
                eo -= so;
                ec = sc;
            } else if (ec == sc.parentNode && eo >= getNodeIndex(sc)) {
                eo++;
            }
            so = 0;
            log.debug("Split start", dom.inspectNode(sc), so);
        }
        range.setStartAndEnd(sc, so, ec, eo);
        log.debug("splitBoundaries done");
    }
    /*----------------------------------------------------------------------------------------------------------------*/

    function createRangeContentRemover<T>(
        remover: (iterator: RangeIterator) => T,
        boundaryUpdater: BoundaryUpdater)
    {
        return function(): T {
            assertRangeValid(this);

            var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;

            var iterator = new RangeIterator(this, true);

            // Work out where to position the range after content removal
            var node, boundary;
            if (sc !== root) {
                node = getClosestAncestorIn(sc, root, true);
                boundary = getBoundaryAfterNode(node);
                sc = boundary.node;
                so = boundary.offset;
            }

            // Check none of the range is read-only
            iterateSubtree(iterator, assertNodeNotReadOnly);

            iterator.reset();

            // Remove the content
            var returnValue = remover(iterator);
            iterator.detach();

            // Move to the new position
            boundaryUpdater(this, sc, so, sc, so);

            return returnValue;
        };
    }

// https://mariusschulz.com/blog/typescript-2-2-mixin-classes
function createDomRangeP2<TBase extends Constructor<RangeBase>>(Base: TBase, boundaryUpdater: BoundaryUpdater) {
        function createBeforeAfterNodeSetter(isBefore, isStart): (node: Node) => void {
            return function(node) {
                assertValidNodeType(node, beforeAfterNodeTypes);
                assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);

                var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
                (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
            };
        }

        function setRangeStart(range, node, offset) {
            var ec = range.endContainer, eo = range.endOffset;
            if (node !== range.startContainer || offset !== range.startOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(ec) || comparePoints(node, offset, ec, eo) == 1) {
                    ec = node;
                    eo = offset;
                }
                boundaryUpdater(range, node, offset, ec, eo);
            }
        }

        function setRangeEnd(range, node, offset) {
            var sc = range.startContainer, so = range.startOffset;
            if (node !== range.endContainer || offset !== range.endOffset) {
                // Check the root containers of the range and the new boundary, and also check whether the new boundary
                // is after the current end. In either case, collapse the range to the new position
                if (getRootContainer(node) != getRootContainer(sc) || comparePoints(node, offset, sc, so) == -1) {
                    sc = node;
                    so = offset;
                }
                boundaryUpdater(range, sc, so, node, offset);
            }
        }
/*
        // Set up inheritance
        var F = function() {};
        F.prototype = api.rangePrototype;
        Base.prototype = new F();

        util.extend(Base.prototype, {
           ...
        });
*/
        return class extends Base implements RangeP2Ex {
            setStart(node: Node, offset: number): void {
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeStart(this, node, offset);
            }

            setEnd(node: Node, offset: number): void {
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);

                setRangeEnd(this, node, offset);
            }

            setStartAndEnd(...args): void {
                let sc: Node = args[0],
                    so: number = args[1],
                    ec: Node = sc,
                    eo: number = so;

                switch (args.length) {
                    case 3:
                        eo = args[2];
                        break;
                    case 4:
                        ec = args[2];
                        eo = args[3];
                        break;
                }

                assertNoDocTypeNotationEntityAncestor(sc, true);
                assertValidOffset(sc, so);

                assertNoDocTypeNotationEntityAncestor(ec, true);
                assertValidOffset(ec, eo);

                boundaryUpdater(this, sc, so, ec, eo);
            }

            setBoundary(node: Node, offset: number, isStart: boolean): void {
                this["set" + (isStart ? "Start" : "End")](node, offset);
            }

            setStartBefore = createBeforeAfterNodeSetter(true, true);
            setStartAfter = createBeforeAfterNodeSetter(false, true);
            setEndBefore = createBeforeAfterNodeSetter(true, false);
            setEndAfter = createBeforeAfterNodeSetter(false, false);

            collapse(toStart?: boolean): void {
                assertRangeValid(this);
                if (toStart) {
                    boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
                } else {
                    boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
                }
            }

            selectNodeContents(node: Node): void {
                assertNoDocTypeNotationEntityAncestor(node, true);

                boundaryUpdater(this, node, 0, node, getNodeLength(node));
            }

            selectNode(node: Node): void {
                assertNoDocTypeNotationEntityAncestor(node, false);
                assertValidNodeType(node, beforeAfterNodeTypes);

                var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
                boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
            }

            extractContents = createRangeContentRemover(extractSubtree, boundaryUpdater);

            deleteContents = createRangeContentRemover(deleteSubtree, boundaryUpdater);

            splitBoundaries(this: RangyRangeEx): void {
                splitRangeBoundaries(this);
            }

            splitBoundariesPreservingPositions(this: RangyRangeEx, positionsToPreserve?: DomPosition[]): void {
                splitRangeBoundaries(this, positionsToPreserve);
            }

            normalizeBoundaries(): void {
                assertRangeValid(this);

                var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;

                var mergeForward = function(node) {
                    var sibling = node.nextSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        ec = node;
                        eo = node.length;
                        node.appendData(sibling.data);
                        removeNode(sibling);
                    }
                };

                var mergeBackward = function(node) {
                    var sibling = node.previousSibling;
                    if (sibling && sibling.nodeType == node.nodeType) {
                        sc = node;
                        var nodeLength = node.length;
                        so = sibling.length;
                        node.insertData(0, sibling.data);
                        removeNode(sibling);
                        if (sc == ec) {
                            eo += so;
                            ec = sc;
                        } else if (ec == node.parentNode) {
                            var nodeIndex = getNodeIndex(node);
                            if (eo == nodeIndex) {
                                ec = node;
                                eo = nodeLength;
                            } else if (eo > nodeIndex) {
                                eo--;
                            }
                        }
                    }
                };

                var normalizeStart = true;
                var sibling;

                if (isCharacterDataNode(ec)) {
                    if (eo == ec.length) {
                        mergeForward(ec);
                    } else if (eo == 0) {
                        sibling = ec.previousSibling;
                        if (sibling && sibling.nodeType == ec.nodeType) {
                            eo = sibling.length;
                            if (sc == ec) {
                                normalizeStart = false;
                            }
                            sibling.appendData(ec.data);
                            removeNode(ec);
                            ec = sibling;
                        }
                    }
                } else {
                    if (eo > 0) {
                        var endNode = ec.childNodes[eo - 1];
                        if (endNode && isCharacterDataNode(endNode)) {
                            mergeForward(endNode);
                        }
                    }
                    normalizeStart = !this.collapsed;
                }

                if (normalizeStart) {
                    if (isCharacterDataNode(sc)) {
                        if (so == 0) {
                            mergeBackward(sc);
                        } else if (so == sc.length) {
                            sibling = sc.nextSibling;
                            if (sibling && sibling.nodeType == sc.nodeType) {
                                if (ec == sibling) {
                                    ec = sc;
                                    eo += sc.length;
                                }
                                sc.appendData(sibling.data);
                                removeNode(sibling);
                            }
                        }
                    } else {
                        if (so < sc.childNodes.length) {
                            var startNode = sc.childNodes[so];
                            if (startNode && isCharacterDataNode(startNode)) {
                                mergeBackward(startNode);
                            }
                        }
                    }
                } else {
                    sc = ec;
                    so = eo;
                }

                boundaryUpdater(this, sc, so, ec, eo);
            }

            collapseToPoint(node: Node, offset: number): void {
                assertNoDocTypeNotationEntityAncestor(node, true);
                assertValidOffset(node, offset);
                this.setStartAndEnd(node, offset);
            }

            parentElement(): Node|null {
                assertRangeValid(this);
                return getElementAncestor(this.commonAncestorContainer, true);
            }
        };
    }

    /*----------------------------------------------------------------------------------------------------------------*/

/** TODO remove comment
 * @requires call `Object.assign(R, comparisonConstants)` after call this function:
 *      `class R extends createPrototypeRange(..`
 * or
 *      `const R = createPrototypeRange(..`
 */
export function createPrototypeRange<T extends RangeBase, TBase extends Constructor<T>>(
    Base: TBase, boundaryUpdater: BoundaryUpdater
): Constructor<RangyRangeEx & T> & TBase & ComparisonConstants {
    // R1 is a not completed class because createDomRangeP1 only implement RangeP1
    // the missing members in RangeP2 will be provided at createDomRangeP2
    // and the missing members in ComparisonConstants will be provided here in `createPrototypeRange`
    // so result `R12` will be a completed class that implement `Range`
    const MixinBase = Base as any as TBase & Constructor<T & RangeP2 & ComparisonConstants>;
    const R1 = createDomRangeP1(MixinBase);
    //after this, instances of R1 will have consts like: START_TO_START,..
    Object.assign(R1.prototype, comparisonConstants);
    const R12 = createDomRangeP2(R1, boundaryUpdater);
    // this is similar to add `static START_TO_START = ..` into R12
    // note that, we can ass static members in subclasses: class A{static s = ..} class B extends A{} B.s
    return Object.assign(R12, comparisonConstants);
}

// TODO remove comment
// we need this const to bypass TS2506: 'DomRange' is referenced directly or indirectly in it own base expression
// export const _DomRange = createPrototypeRange(RangeBase, updateBoundaries);
// export type DomRange = InstanceType<typeof DomRange>;
export class DomRange extends createPrototypeRange(DomRangeBase, updateBoundaries) {
    static inspect = rangeInspect;
    static toHtml = rangeToHtml;
    static getRangeDocument = getRangeDocument;
    static rangesEqual = rangesEqual;
}

// @deprecated pls directly import & use the exported member of this module
Object.assign(DomRange, {
    rangeProperties,
    RangeIterator,
    copyComparisonConstants,
    createPrototypeRange,
});

export function createRangyRange(doc?) {
    doc = getContentDocument(doc, module, "createRangyRange");
    return new DomRange(doc);
}
