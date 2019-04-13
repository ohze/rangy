/**
 * Highlighter module for Rangy, a cross-browser JavaScript range and selection library
 * https://github.com/timdown/rangy
 *
 * Depends on Rangy core, ClassApplier modules.
 *
 * Copyright %%build:year%%, Tim Down
 * Licensed under the MIT license.
 * Version: %%build:version%%
 * Build date: %%build:date%%
 */
import * as api from "../core/index";
import {WrappedRange, WrappedSelection, dom} from "../core/index";
const contains = dom.arrayContains,
    getBody = dom.getBody,
    forEach = api.util.forEach;

// const module = new Module("Highlighter", ["ClassApplier"]);

    // Puts highlights in order, last in document first.
    function compareHighlights(h1, h2) {
        return h1.characterRange.start - h2.characterRange.start;
    }

    function getContainerElement(doc, id) {
        return id ? doc.getElementById(id) : getBody(doc);
    }

    /*----------------------------------------------------------------------------------------------------------------*/
interface SerializedSelectionT {
    characterRange: CharacterRange;
    backward: boolean;
}

type ConverterCreator = () => Converter;

interface Converter {
    type?: string;

    rangeToCharacterRange(range: RangyRange, containerNode?: Node): CharacterRange;

    characterRangeToRange(doc: Document | Window | HTMLIFrameElement,
                          characterRange: CharacterRange,
                          containerNode: Node): WrappedRange;

    serializeSelection(selection: WrappedSelection, containerNode: Node): SerializedSelectionT[];

    restoreSelection(selection: WrappedSelection, savedSelection: SerializedSelectionT[], containerNode: Node): void;
}

    var highlighterTypes = {};

class HighlighterType {
    constructor(public type: string,
                public converterCreator: ConverterCreator) {
    }

    create(): Converter {
        var converter = this.converterCreator();
        converter.type = this.type;
        return converter;
    };
}

export function registerHighlighterType(type: string, converterCreator: ConverterCreator) {
        highlighterTypes[type] = new HighlighterType(type, converterCreator);
    }

    function getConverter(type: string): Converter {
        var highlighterType = highlighterTypes[type];
        if (highlighterType instanceof HighlighterType) {
            return highlighterType.create();
        } else {
            throw new Error("Highlighter type '" + type + "' is not valid");
        }
    }

    /*----------------------------------------------------------------------------------------------------------------*/

class CharacterRange {
        constructor(public start: number,
                    public end: number) {
        }

        intersects(charRange) {
            return this.start < charRange.end && this.end > charRange.start;
        }

        isContiguousWith(charRange) {
            return this.start == charRange.end || this.end == charRange.start;
        }

        union(charRange) {
            return new CharacterRange(Math.min(this.start, charRange.start), Math.max(this.end, charRange.end));
        }

        intersection(charRange) {
            return new CharacterRange(Math.max(this.start, charRange.start), Math.min(this.end, charRange.end));
        }

        getComplements(charRange) {
            var ranges = [];
            if (this.start >= charRange.start) {
                if (this.end <= charRange.end) {
                    return [];
                }
                ranges.push(new CharacterRange(charRange.end, this.end));
            } else {
                ranges.push(new CharacterRange(this.start, Math.min(this.end, charRange.start)));
                if (this.end > charRange.end) {
                    ranges.push(new CharacterRange(charRange.end, this.end));
                }
            }
            return ranges;
        }

        toString() {
            return "[CharacterRange(" + this.start + ", " + this.end + ")]";
        }

    static fromCharacterRange(charRange) {
        return new CharacterRange(charRange.start, charRange.end);
    }
}

    /*----------------------------------------------------------------------------------------------------------------*/

    var textContentConverter: Converter = {
        rangeToCharacterRange: function(range, containerNode) {
            var bookmark = range.getBookmark(containerNode);
            return new CharacterRange(bookmark.start, bookmark.end);
        },

        characterRangeToRange: function(doc, characterRange, containerNode) {
            var range = api.createRange(doc);
            range.moveToBookmark({
                start: characterRange.start,
                end: characterRange.end,
                containerNode: containerNode
            });

            return range;
        },

        serializeSelection: function(selection, containerNode) {
            var ranges = selection.getAllRanges(), rangeCount = ranges.length;
            var rangeInfos = [];

            var backward = rangeCount == 1 && selection.isBackward();

            for (var i = 0, len = ranges.length; i < len; ++i) {
                rangeInfos[i] = {
                    characterRange: this.rangeToCharacterRange(ranges[i], containerNode),
                    backward: backward
                };
            }

            return rangeInfos;
        },

        restoreSelection: function(selection, savedSelection, containerNode) {
            selection.removeAllRanges();
            var doc = selection.win.document;
            for (var i = 0, len = savedSelection.length, range, rangeInfo, characterRange; i < len; ++i) {
                rangeInfo = savedSelection[i];
                characterRange = rangeInfo.characterRange;
                range = this.characterRangeToRange(doc, rangeInfo.characterRange, containerNode);
                selection.addRange(range, rangeInfo.backward);
            }
        }
    };

    registerHighlighterType("textContent", function() {
        return textContentConverter;
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    class Highlight {
        private static nextId = 1;
        applied = false;
        id: number;

        constructor(public doc,
                    public characterRange,
                    public classApplier,
                    public converter,
                    id?: number,
                    public containerElementId: string|null = null) {
            if (id) {
                this.id = id;
                Highlight.nextId = Math.max(Highlight.nextId, id + 1);
            } else {
                this.id = Highlight.nextId++;
            }
        }

        getContainerElement() {
            return getContainerElement(this.doc, this.containerElementId);
        }

        getRange() {
            return this.converter.characterRangeToRange(this.doc, this.characterRange, this.getContainerElement());
        }

        fromRange(range) {
            this.characterRange = this.converter.rangeToCharacterRange(range, this.getContainerElement());
        }

        getText() {
            return this.getRange().toString();
        }

        containsElement(el) {
            return this.getRange().containsNodeContents(el.firstChild);
        }

        unapply() {
            this.classApplier.undoToRange(this.getRange());
            this.applied = false;
        }

        apply() {
            this.classApplier.applyToRange(this.getRange());
            this.applied = true;
        }

        getHighlightElements() {
            return this.classApplier.getElementsWithClassIntersectingRange(this.getRange());
        }

        toString() {
            return "[Highlight(ID: " + this.id + ", class: " + this.classApplier.className + ", character range: " +
                this.characterRange.start + " - " + this.characterRange.end + ")]";
        }
    };

    /*----------------------------------------------------------------------------------------------------------------*/

export class Highlighter {
        classAppliers = {};
        highlights = [];
        doc: Document;
        converter: Converter;

        constructor(doc?: Document, type: string = "textContent") {
            this.doc = doc || document;
            this.converter = getConverter(type);
        }
        addClassApplier(classApplier) {
            this.classAppliers[classApplier.className] = classApplier;
        }

        getHighlightForElement(el) {
            var highlights = this.highlights;
            for (var i = 0, len = highlights.length; i < len; ++i) {
                if (highlights[i].containsElement(el)) {
                    return highlights[i];
                }
            }
            return null;
        }

        removeHighlights(highlights) {
            for (var i = 0, len = this.highlights.length, highlight; i < len; ++i) {
                highlight = this.highlights[i];
                if (contains(highlights, highlight)) {
                    highlight.unapply();
                    this.highlights.splice(i--, 1);
                }
            }
        }

        removeAllHighlights() {
            this.removeHighlights(this.highlights);
        }

        getIntersectingHighlights(ranges) {
            // Test each range against each of the highlighted ranges to see whether they overlap
            var intersectingHighlights = [], highlights = this.highlights;
            forEach(ranges, function(range) {
                //var selCharRange = converter.rangeToCharacterRange(range);
                forEach(highlights, function(highlight) {
                    if (range.intersectsRange( highlight.getRange() ) && !contains(intersectingHighlights, highlight)) {
                        intersectingHighlights.push(highlight);
                    }
                });
            });

            return intersectingHighlights;
        }

        highlightCharacterRanges(className, charRanges, options) {
            var i, len, j;
            var highlights = this.highlights;
            var converter = this.converter;
            var doc = this.doc;
            var highlightsToRemove = [];
            var classApplier = className ? this.classAppliers[className] : null;

            options = {
                containerElementId: null,
                exclusive: true,
                ...options
            };

            var containerElementId = options.containerElementId;
            var exclusive = options.exclusive;

            var containerElement, containerElementRange, containerElementCharRange;
            if (containerElementId) {
                containerElement = this.doc.getElementById(containerElementId);
                if (containerElement) {
                    containerElementRange = api.createRange(this.doc);
                    containerElementRange.selectNodeContents(containerElement);
                    containerElementCharRange = new CharacterRange(0, containerElementRange.toString().length);
                }
            }

            var charRange, highlightCharRange, removeHighlight, isSameClassApplier, highlightsToKeep, splitHighlight;

            for (i = 0, len = charRanges.length; i < len; ++i) {
                charRange = charRanges[i];
                highlightsToKeep = [];

                // Restrict character range to container element, if it exists
                if (containerElementCharRange) {
                    charRange = charRange.intersection(containerElementCharRange);
                }

                // Ignore empty ranges
                if (charRange.start == charRange.end) {
                    continue;
                }

                // Check for intersection with existing highlights. For each intersection, create a new highlight
                // which is the union of the highlight range and the selected range
                for (j = 0; j < highlights.length; ++j) {
                    removeHighlight = false;

                    if (containerElementId == highlights[j].containerElementId) {
                        highlightCharRange = highlights[j].characterRange;
                        isSameClassApplier = (classApplier == highlights[j].classApplier);
                        splitHighlight = !isSameClassApplier && exclusive;

                        // Replace the existing highlight if it needs to be:
                        //  1. merged (isSameClassApplier)
                        //  2. partially or entirely erased (className === null)
                        //  3. partially or entirely replaced (isSameClassApplier == false && exclusive == true)
                        if (    (highlightCharRange.intersects(charRange) || highlightCharRange.isContiguousWith(charRange)) &&
                                (isSameClassApplier || splitHighlight) ) {

                            // Remove existing highlights, keeping the unselected parts
                            if (splitHighlight) {
                                forEach(highlightCharRange.getComplements(charRange), function(rangeToAdd) {
                                    highlightsToKeep.push( new Highlight(doc, rangeToAdd, highlights[j].classApplier, converter, null, containerElementId) );
                                });
                            }

                            removeHighlight = true;
                            if (isSameClassApplier) {
                                charRange = highlightCharRange.union(charRange);
                            }
                        }
                    }

                    if (removeHighlight) {
                        highlightsToRemove.push(highlights[j]);
                        highlights[j] = new Highlight(doc, highlightCharRange.union(charRange), classApplier, converter, null, containerElementId);
                    } else {
                        highlightsToKeep.push(highlights[j]);
                    }
                }

                // Add new range
                if (classApplier) {
                    highlightsToKeep.push(new Highlight(doc, charRange, classApplier, converter, null, containerElementId));
                }
                this.highlights = highlights = highlightsToKeep;
            }

            // Remove the old highlights
            forEach(highlightsToRemove, function(highlightToRemove) {
                highlightToRemove.unapply();
            });

            // Apply new highlights
            var newHighlights = [];
            forEach(highlights, function(highlight) {
                if (!highlight.applied) {
                    highlight.apply();
                    newHighlights.push(highlight);
                }
            });

            return newHighlights;
        }

        highlightRanges(className, ranges, options) {
            var selCharRanges = [];
            var converter = this.converter;

            options = {
                containerElement: null,
                exclusive: true,
                ...options
            };

            var containerElement = options.containerElement;
            var containerElementId = containerElement ? containerElement.id : null;
            var containerElementRange;
            if (containerElement) {
                containerElementRange = api.createRange(containerElement);
                containerElementRange.selectNodeContents(containerElement);
            }

            forEach(ranges, function(range) {
                var scopedRange = containerElement ? containerElementRange.intersection(range) : range;
                selCharRanges.push( converter.rangeToCharacterRange(scopedRange, containerElement || getBody(range.getDocument())) );
            });

            return this.highlightCharacterRanges(className, selCharRanges, {
                containerElementId: containerElementId,
                exclusive: options.exclusive
            });
        }

        highlightSelection(className, options) {
            var converter = this.converter;
            var classApplier = className ? this.classAppliers[className] : false;

            options = {
                containerElementId: null,
                exclusive: true,
                ...options
            };

            var containerElementId = options.containerElementId;
            var exclusive = options.exclusive;
            var selection = options.selection || api.getSelection(this.doc);
            var doc = selection.win.document;
            var containerElement = getContainerElement(doc, containerElementId);

            if (!classApplier && className !== false) {
                throw new Error("No class applier found for class '" + className + "'");
            }

            // Store the existing selection as character ranges
            var serializedSelection = converter.serializeSelection(selection, containerElement);

            // Create an array of selected character ranges
            var selCharRanges = [];
            forEach(serializedSelection, function(rangeInfo) {
                selCharRanges.push( CharacterRange.fromCharacterRange(rangeInfo.characterRange) );
            });

            var newHighlights = this.highlightCharacterRanges(className, selCharRanges, {
                containerElementId: containerElementId,
                exclusive: exclusive
            });

            // Restore selection
            converter.restoreSelection(selection, serializedSelection, containerElement);

            return newHighlights;
        }

        unhighlightSelection(selection) {
            selection = selection || api.getSelection(this.doc);
            var intersectingHighlights = this.getIntersectingHighlights( selection.getAllRanges() );
            this.removeHighlights(intersectingHighlights);
            selection.removeAllRanges();
            return intersectingHighlights;
        }

        getHighlightsInSelection(selection) {
            selection = selection || api.getSelection(this.doc);
            return this.getIntersectingHighlights(selection.getAllRanges());
        }

        selectionOverlapsHighlight(selection) {
            return this.getHighlightsInSelection(selection).length > 0;
        }

        serialize(options) {
            var highlighter = this;
            var highlights = highlighter.highlights;
            var serializedType, serializedHighlights, convertType, serializationConverter;

            highlights.sort(compareHighlights);
            options = {
                serializeHighlightText: false,
                type: highlighter.converter.type,
                ...options
            };

            serializedType = options.type;
            convertType = (serializedType != highlighter.converter.type);

            if (convertType) {
                serializationConverter = getConverter(serializedType);
            }

            serializedHighlights = ["type:" + serializedType];

            forEach(highlights, function(highlight) {
                var characterRange = highlight.characterRange;
                var containerElement;

                // Convert to the current Highlighter's type, if different from the serialization type
                if (convertType) {
                    containerElement = highlight.getContainerElement();
                    characterRange = serializationConverter.rangeToCharacterRange(
                        highlighter.converter.characterRangeToRange(highlighter.doc, characterRange, containerElement),
                        containerElement
                    );
                }

                var parts = [
                    characterRange.start,
                    characterRange.end,
                    highlight.id,
                    highlight.classApplier.className,
                    highlight.containerElementId
                ];

                if (options.serializeHighlightText) {
                    parts.push(highlight.getText());
                }
                serializedHighlights.push( parts.join("$") );
            });

            return serializedHighlights.join("|");
        }

        deserialize(serialized) {
            var serializedHighlights = serialized.split("|");
            var highlights = [];

            var firstHighlight = serializedHighlights[0];
            var regexResult;
            var serializationType, serializationConverter, convertType = false;
            if ( firstHighlight && (regexResult = /^type:(\w+)$/.exec(firstHighlight)) ) {
                serializationType = regexResult[1];
                if (serializationType != this.converter.type) {
                    serializationConverter = getConverter(serializationType);
                    convertType = true;
                }
                serializedHighlights.shift();
            } else {
                throw new Error("Serialized highlights are invalid.");
            }

            var classApplier, highlight, characterRange, containerElementId, containerElement;

            for (var i = serializedHighlights.length, parts; i-- > 0; ) {
                parts = serializedHighlights[i].split("$");
                characterRange = new CharacterRange(+parts[0], +parts[1]);
                containerElementId = parts[4] || null;

                // Convert to the current Highlighter's type, if different from the serialization type
                if (convertType) {
                    containerElement = getContainerElement(this.doc, containerElementId);
                    characterRange = this.converter.rangeToCharacterRange(
                        serializationConverter.characterRangeToRange(this.doc, characterRange, containerElement),
                        containerElement
                    );
                }

                classApplier = this.classAppliers[ parts[3] ];

                if (!classApplier) {
                    throw new Error("No class applier found for class '" + parts[3] + "'");
                }

                highlight = new Highlight(this.doc, characterRange, classApplier, this.converter, parseInt(parts[2]), containerElementId);
                highlight.apply();
                highlights.push(highlight);
            }
            this.highlights = highlights;
        }
}

export function createHighlighter(doc?: Document,
                                  rangeCharacterOffsetConverterType: string = "textContent") {
    return new Highlighter(doc, rangeCharacterOffsetConverterType);
}
