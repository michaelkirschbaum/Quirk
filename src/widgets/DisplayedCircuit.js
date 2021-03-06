import CircuitDefinition from "src/circuit/CircuitDefinition.js"
import CircuitStats from "src/circuit/CircuitStats.js"
import Config from "src/Config.js"
import DetailedError from "src/base/DetailedError.js"
import equate from "src/base/Equate.js"
import Format from "src/base/Format.js"
import GateColumn from "src/circuit/GateColumn.js"
import GateDrawParams from "src/ui/GateDrawParams.js"
import GatePainting from "src/ui/GatePainting.js"
import Gates from "src/gates/AllGates.js"
import MathPainter from "src/ui/MathPainter.js"
import Point from "src/math/Point.js"
import Matrix from "src/math/Matrix.js"
import Rect from "src/math/Rect.js"
import Util from "src/base/Util.js"
import {seq, Seq} from "src/base/Seq.js"
import {paintBlochSphereDisplay} from "src/gates/BlochSphereDisplay.js"

/** @type {!number} */
let CIRCUIT_OP_HORIZONTAL_SPACING = 10;
/** @type {!number} */
let CIRCUIT_OP_LEFT_SPACING = 35;
/** @type {!number} */
let CIRCUIT_OP_RIGHT_SPACING = 5;

const SUPERPOSITION_GRID_LABEL_SPAN = 50;

const EXTRA_COLS_FOR_SINGLE_QUBIT_DISPLAYS = 3;

class DisplayedCircuit {
    /**
     *
     * @param {!number} top
     * @param {!CircuitDefinition} circuitDefinition
     * @param {undefined|!int} compressedColumnIndex
     * @param {undefined|!{col: !int, row: !int, resizeStyle: !boolean}} highlightedSlot
     * @param {undefined|!int} extraWireStartIndex
     * @private
     */
    constructor(top, circuitDefinition, compressedColumnIndex, highlightedSlot, extraWireStartIndex) {
        if (!Number.isFinite(top)) {
            throw new DetailedError("Bad top", {top, circuitDefinition});
        }
        if (!(circuitDefinition instanceof CircuitDefinition)) {
            throw new DetailedError("Bad circuitDefinition", {top, circuitDefinition});
        }
        /**
         * @type {!number}
         */
        this.top = top;
        /**
         * @type {!CircuitDefinition}
         */
        this.circuitDefinition = circuitDefinition;
        /**
         * @type {undefined|!int}
         * @private
         */
        this._compressedColumnIndex = compressedColumnIndex;
        /**
         * @type {undefined|!{col: !int, row: !int, resizeStyle: !boolean}}
         * @private
         */
        this._highlightedSlot = highlightedSlot;
        /**
         * @type {undefined|!int}
         * @private
         */
        this._extraWireStartIndex = extraWireStartIndex;
    }

    /**
     * @param {!number} top
     * @returns {!DisplayedCircuit}
     */
    static empty(top) {
        return new DisplayedCircuit(
            top,
            new CircuitDefinition(Config.MIN_WIRE_COUNT, []),
            undefined,
            undefined,
            undefined);
    }

    /**
     * @returns {!number}
     */
    desiredHeight() {
        let n = Math.max(Config.MIN_WIRE_COUNT, this.circuitDefinition.numWires) -
            (this._extraWireStartIndex !== undefined ? 1 : 0);
        return Math.max(n, this.circuitDefinition.minimumRequiredWireCount()) * Config.WIRE_SPACING + 55;
    }

    /**
     * @returns {!number}
     */
    desiredWidth() {
        return this._rectForSuperpositionDisplay().right() + 101;
    }

    /**
     * @param {!int} wireIndex
     * @returns {!Rect}
     */
    wireRect(wireIndex) {
        if (wireIndex < 0) {
            throw new DetailedError("Bad wireIndex", {wireIndex});
        }
        return new Rect(0, this.top + Config.WIRE_SPACING * wireIndex, Infinity, Config.WIRE_SPACING);
    }

    /**
     * @param {!number} y
     * @returns {!int}
     */
    wireIndexAt(y) {
        return Math.floor((y - this.top) / Config.WIRE_SPACING);
    }

    //noinspection JSMethodCanBeStatic
    /**
     * @param {!number} x
     * @returns {!number} The continuous column-space coordinate corresponding to the given display-space coordinate.
     * @private
     */
    toColumnSpaceCoordinate(x) {
        let spacing = (CIRCUIT_OP_HORIZONTAL_SPACING + Config.GATE_RADIUS * 2);
        let left = CIRCUIT_OP_LEFT_SPACING - CIRCUIT_OP_HORIZONTAL_SPACING / 2;
        return (x - left) / spacing - 0.5;
    }

    /**
     * @param {!number} y
     * @returns {undefined|!int}
     */
    indexOfDisplayedRowAt(y) {
        let i = Math.floor((y - this.top) / Config.WIRE_SPACING);
        if (i < 0 || i >= this.circuitDefinition.numWires) {
            return undefined;
        }
        return i;
    }

    /**
     * @param {!number} x
     * @returns {undefined|!int}
     */
    indexOfDisplayedColumnAt(x) {
        let col = this.toColumnSpaceCoordinate(x);
        let i;
        if (this._compressedColumnIndex === undefined || col < this._compressedColumnIndex - 0.75) {
            i = Math.round(col);
        } else if (col < this._compressedColumnIndex - 0.25) {
            i = this._compressedColumnIndex;
        } else {
            i = Math.round(col) - 1;
        }

        if (i < 0 || i >= this.circuitDefinition.columns.length) {
            return undefined;
        }

        return i;
    }

    /**
     * @param {!Point} p
     * @returns {undefined|!number}
     */
    findOpHalfColumnAt(p) {
        if (p.x < 0 || p.y < top || p.y > top + this.desiredHeight()) {
            return undefined;
        }

        return Math.max(-0.5, Math.round(this.toColumnSpaceCoordinate(p.x) * 2) / 2);
    }

    /**
     * @param {!Hand} hand
     * @returns {?{ col : !number, row : !number, isInsert : !boolean }}
     */
    findModificationIndex(hand) {
        if (hand.pos === undefined || hand.heldGate === undefined) {
            return undefined;
        }
        let pos = hand.pos.minus(hand.holdOffset).plus(new Point(Config.GATE_RADIUS, Config.GATE_RADIUS));
        let halfColIndex = this.findOpHalfColumnAt(pos);
        let row = this.indexOfDisplayedRowAt(pos.y);
        if (halfColIndex === undefined || row === undefined) {
            return undefined;
        }
        let col = Math.ceil(halfColIndex);
        let isInsert = Math.abs(halfColIndex % 1) === 0.5;
        if (col >= this.circuitDefinition.columns.length) {
            return {col: col, row: row, isInsert: isInsert};
        }

        if (!isInsert) {
            let mustInsert = this.circuitDefinition.isSlotRectCoveredByGateInSameColumn(
                col, row, hand.heldGate.height);
            if (mustInsert) {
                let isAfter = hand.pos.x > this.opRect(col).center().x;
                isInsert = true;
                if (isAfter) {
                    col += 1;
                }
            }
        }

        return {col: col, row: row, isInsert: isInsert};
    }

    /**
     * @param {!int} operationIndex
     * @returns {Rect!}
     */
    opRect(operationIndex) {
        let opWidth = Config.GATE_RADIUS * 2;
        let opSeparation = opWidth + CIRCUIT_OP_HORIZONTAL_SPACING;
        let tweak = 0;
        if (this._compressedColumnIndex !== undefined && operationIndex === this._compressedColumnIndex) {
            tweak = opSeparation / 2;
        }
        if (this._compressedColumnIndex !== undefined && operationIndex > this._compressedColumnIndex) {
            tweak = opSeparation;
        }

        let dx = opSeparation * operationIndex - tweak + CIRCUIT_OP_LEFT_SPACING;
        return new Rect(dx, this.top, opWidth, this.desiredHeight());
    }

    /**
     * @param {!int} wireIndex
     * @param {!int} operationIndex
     * @param {!int=} width
     * @param {!int=} height
     */
    gateRect(wireIndex, operationIndex, width=1, height=1) {
        let op = this.opRect(operationIndex);
        let wire = this.wireRect(wireIndex);
        let r = new Rect(
            op.center().x - Config.GATE_RADIUS,
            wire.center().y - Config.GATE_RADIUS,
            2*Config.GATE_RADIUS + (width-1)*Config.WIRE_SPACING,
            2*Config.GATE_RADIUS + (height-1)*Config.WIRE_SPACING);

        return new Rect(Math.round(r.x - 0.5) + 0.5, Math.round(r.y - 0.5) + 0.5, Math.round(r.w), Math.round(r.h));
    }

    /**
     * @returns {!DisplayedCircuit}
     */
    afterTidyingUp() {
        return this.
            withCircuit(this.circuitDefinition.
                withUncoveredColumnsRemoved().
                withHeightOverlapsFixed().
                withWidthOverlapsFixed().
                withUncoveredColumnsRemoved().
                withTrailingSpacersIncluded()).
            _withCompressedColumnIndex(undefined).
            _withExtraWireStartIndex(undefined).
            _withHighlightedSlot(undefined);
    }

    /**
     * @param {!DisplayedCircuit|*} other
     * @returns {!boolean}
     */
    isEqualTo(other) {
        if (this === other) {
            return true;
        }
        return other instanceof DisplayedCircuit &&
            this.top === other.top &&
            this.circuitDefinition.isEqualTo(other.circuitDefinition) &&
            this._compressedColumnIndex === other._compressedColumnIndex &&
            this._extraWireStartIndex === other._extraWireStartIndex &&
            equate(this._highlightedSlot, other._highlightedSlot);
    }

    /**
     * @param {!Painter} painter
     * @param {!Hand} hand
     * @param {!CircuitStats} stats
     */
    paint(painter, hand, stats) {
        painter.fillRect(
            new Rect(0, this.top, painter.canvas.clientWidth, this.desiredHeight()),
            Config.BACKGROUND_COLOR_CIRCUIT);

        this._drawWires(painter);

        for (let col = 0; col < this.circuitDefinition.columns.length; col++) {
            this._drawColumn(painter, this.circuitDefinition.columns[col], col, hand, stats);
        }

        this._drawOutputDisplays(painter, stats, hand);
        this._drawHintLabels(painter, stats);
    }

    /**
     * @param {!Painter} painter
     * @private
     */
    _drawWires(painter) {
        let drawnWireCount = Math.min(this.circuitDefinition.numWires, (this._extraWireStartIndex || Infinity) + 1);

        // Initial value labels
        for (let row = 0; row < drawnWireCount; row++) {
            let wireRect = this.wireRect(row);
            let y = wireRect.center().y;
            painter.print('|0⟩', 20, y, 'right', 'middle', 'black', '14px sans-serif', 20, Config.WIRE_SPACING);
        }

        // Wires (doubled-up for measured sections).
        painter.ctx.save();
        for (let row = 0; row < drawnWireCount; row++) {
            if (row === this._extraWireStartIndex) {
                painter.ctx.globalAlpha = 0.5;
            }
            painter.trace(trace => {
                let wireRect = this.wireRect(row);
                let y = Math.round(wireRect.center().y - 0.5) + 0.5;
                let lastX = 25;
                //noinspection ForLoopThatDoesntUseLoopVariableJS
                for (let col = 0; lastX < painter.canvas.width; col++) {
                    let x = this.opRect(col).center().x;
                    if (this.circuitDefinition.locIsMeasured(new Point(col, row))) {
                        // Measured wire.
                        trace.line(lastX, y-1, x, y-1);
                        trace.line(lastX, y+1, x, y+1);
                    } else {
                        // Unmeasured wire.
                        trace.line(lastX, y, x, y);
                    }
                    lastX = x;
                }
            }).thenStroke('black');
        }
        painter.ctx.restore();
        if (this._extraWireStartIndex !== undefined && this.circuitDefinition.numWires === Config.MAX_WIRE_COUNT) {
            painter.print(
                `(Max wires. Qubit limit is ${Config.MAX_WIRE_COUNT}.)`,
                5,
                this.wireRect(Config.MAX_WIRE_COUNT).y,
                'left',
                'top',
                'red',
                '16px bold monospace',
                400,
                Config.WIRE_SPACING);
        }
    }

    /**
     * @param {!int} col
     * @param {!int} row
     * @param {!Array.<!Point>} focusPosPts
     * @returns {!{isHighlighted: !boolean, isResizeShowing: !boolean, isResizeHighlighted: !boolean}}
     * @private
     */
    _highlightStatusAt(col, row, focusPosPts) {
        if (this._highlightedSlot !== undefined) {
            if (this._highlightedSlot.col === col && this._highlightedSlot.row === row) {
                return {
                    isResizeShowing: true,
                    isResizeHighlighted: this._highlightedSlot.resizeStyle,
                    isHighlighted: !this._highlightedSlot.resizeStyle
                };
            }
        }

        let gate = this.circuitDefinition.gateInSlot(col, row);
        if (gate === undefined || this._highlightedSlot !== undefined) {
            return {
                isResizeShowing: false,
                isResizeHighlighted: false,
                isHighlighted: false
            };
        }

        let gateRect = this.gateRect(row, col, gate.width, gate.height);
        let resizeTabRect = GatePainting.rectForResizeTab(gateRect);

        let isOverGate = pos => {
            let overGate = this.findGateOverlappingPos(pos);
            return overGate !== undefined && overGate.col === col && overGate.row === row;
        };
        let isNotCoveredAt = pos => {
            let g = this.findGateOverlappingPos(pos);
            return g === undefined || (g.col === col && g.row === row);
        };
        let isOverGateResizeTab = pos => isNotCoveredAt(pos) && resizeTabRect.containsPoint(pos);

        let isResizeHighlighted = gate.canChangeInSize() && seq(focusPosPts).any(isOverGateResizeTab);
        let isHighlighted = !isResizeHighlighted && seq(focusPosPts).any(isOverGate);
        let isResizeShowing = gate.canChangeInSize() && (isResizeHighlighted || isHighlighted);

        return {isHighlighted, isResizeShowing, isResizeHighlighted};
    }

    /**
     * @param {!Painter} painter
     * @param {!GateColumn} gateColumn
     * @param {!int} col
     * @param {!Hand} hand
     * @param {!CircuitStats} stats
     * @private
     */
    _drawColumn(painter, gateColumn, col, hand, stats) {
        this._drawColumnControlWires(painter, gateColumn, col, stats);

        let focusSlot = this._highlightedSlot;
        for (let row = 0; row < this.circuitDefinition.numWires; row++) {
            if (gateColumn.gates[row] === null) {
                continue;
            }
            let gate = gateColumn.gates[row];
            let gateRect = this.gateRect(row, col, gate.width, gate.height);

            let {isHighlighted, isResizeShowing, isResizeHighlighted} =
                this._highlightStatusAt(col, row, hand.hoverPoints());

            let drawer = gate.customDrawer || GatePainting.DEFAULT_DRAWER;
            painter.noteTouchBlocker({rect: gateRect, cursor: 'pointer'});
            if (gate.canChangeInSize()) {
                painter.noteTouchBlocker({rect: GatePainting.rectForResizeTab(gateRect), cursor: 'ns-resize'});
            }
            drawer(new GateDrawParams(
                painter,
                false,
                isHighlighted && !isResizeHighlighted,
                isResizeShowing,
                isResizeHighlighted,
                gateRect,
                gate,
                stats,
                {row, col},
                focusSlot === undefined ? hand.hoverPoints() : [],
                stats.customStatsForSlot(col, row)));
            let isDisabledReason = this.circuitDefinition.gateAtLocIsDisabledReason(new Point(col, row));
            if (isDisabledReason !== undefined) {
                painter.ctx.save();
                if (isHighlighted) {
                    painter.ctx.globalAlpha *= 0.3;
                }
                painter.ctx.globalAlpha *= 0.5;
                painter.fillRect(gateRect.paddedBy(5), 'yellow');
                painter.ctx.globalAlpha *= 2;
                painter.strokeLine(gateRect.topLeft(), gateRect.bottomRight(), 'orange', 3);
                let r = painter.printParagraph(isDisabledReason, gateRect.paddedBy(5), new Point(0.5, 0.5), 'red');
                painter.ctx.globalAlpha *= 0.5;
                painter.fillRect(r.paddedBy(2), 'yellow');
                painter.ctx.globalAlpha *= 2;
                painter.printParagraph(isDisabledReason, gateRect.paddedBy(5), new Point(0.5, 0.5), 'red');
                painter.ctx.restore()
            }
        }
    }

    /**
     * @param {!Painter} painter
     * @param {!GateColumn} gateColumn
     * @param {!int} columnIndex
     * @param {!CircuitStats} stats
     * @private
     */
    _drawColumnControlWires(painter, gateColumn, columnIndex, stats) {
        let n = gateColumn.gates.length;
        let gs = gateColumn.gates;
        let x = Math.round(this.opRect(columnIndex).center().x - 0.5) + 0.5;

        if (stats.circuitDefinition.colHasNonLocalGates(columnIndex)) {
            painter.ctx.save();
            painter.ctx.setLineDash([1, 4]);
            painter.strokeLine(
                new Point(x, this.gateRect(0, 0).y),
                new Point(x, this.gateRect(this.circuitDefinition.numWires-1, 0).bottom()));
            painter.ctx.restore();
        }

        let hasTwoSwaps = stats.circuitDefinition.colHasEnabledSwapGate(columnIndex);

        let firstLast = p => [Seq.range(n).filter(p).first(null), Seq.range(n).filter(p).last(null)];
        let [t1, t2] = firstLast(i => stats.circuitDefinition.locHasControllableGate(new Point(columnIndex, i)));
        let [c1, c2] = firstLast(i => this.circuitDefinition.locStartsSingleControlWire(new Point(columnIndex, i)));
        let [cc1, cc2] = firstLast(i => this.circuitDefinition.locStartsDoubleControlWire(new Point(columnIndex, i)));
        let [s1, s2] = firstLast(i => hasTwoSwaps && gs[i] === Gates.Special.SwapHalf);

        if (c1 !== null && t1 !== null) {
            let y1 =  this.wireRect(Math.min(t1, c1)).center().y;
            let y2 = this.wireRect(Math.max(t2, c2)).center().y;
            painter.strokeLine(new Point(x,y1), new Point(x, y2));
        }
        if (s1 !== null) {
            let y1 =  this.wireRect(s1).center().y;
            let y2 = this.wireRect(s2).center().y;
            painter.strokeLine(new Point(x,y1), new Point(x, y2));
        }
        if (cc1 !== null && t1 !== null) {
            let y1 =  this.wireRect(Math.min(t1, cc1)).center().y;
            let y2 = this.wireRect(Math.max(t2, cc2)).center().y;
            painter.strokeLine(new Point(x+1, y1), new Point(x+1, y2));
            painter.strokeLine(new Point(x-1, y1), new Point(x-1, y2));
        }
    }

    /**
     * @param {!Hand} hand
     * @returns {!DisplayedCircuit}
     */
    previewDrop(hand) {
        return hand.heldGate !== undefined ? this._previewDropMovedGate(hand) : this._previewResizedGate(hand);
    }

    /**
     * @param {!Hand} hand
     * @returns {!DisplayedCircuit}
     * @private
     */
    _previewDropMovedGate(hand) {
        let modificationPoint = this.findModificationIndex(hand);
        if (modificationPoint === undefined) {
            return this;
        }
        let handRowOffset = Math.floor(hand.holdOffset.y/Config.WIRE_SPACING);
        if (modificationPoint.row + handRowOffset >= this.circuitDefinition.numWires) {
            return this;
        }
        let addedGate = hand.heldGate;

        let emptyCol = GateColumn.empty(this.circuitDefinition.numWires);
        let i = modificationPoint.col;
        let isInserting = modificationPoint.isInsert;
        let row = Math.min(modificationPoint.row, Math.max(0, Config.MAX_WIRE_COUNT - addedGate.height));
        let newCols = seq(this.circuitDefinition.columns).
            padded(i, emptyCol).
            ifThen(isInserting, s => s.withInsertedItem(i, emptyCol)).
            padded(i + addedGate.width, emptyCol).
            withTransformedItem(i, c => c.withGatesAdded(row, new GateColumn([addedGate]))).
            toArray();
        let newWireCount = Math.max(
            this._extraWireStartIndex || 0,
            Math.max(
                this.circuitDefinition.numWires,
                addedGate.height + row));
        if (newWireCount > Config.MAX_WIRE_COUNT) {
            return this;
        }

        return this.withCircuit(this.circuitDefinition.withColumns(newCols).withWireCount(newWireCount)).
            _withHighlightedSlot({row, col: modificationPoint.col, resizeStyle: false}).
            _withCompressedColumnIndex(isInserting ? i : undefined).
            _withFallbackExtraWireStartIndex(this.circuitDefinition.numWires);
    }

    /**
     * @param {!Hand} hand
     * @returns {!DisplayedCircuit}
     * @private
     */
    _previewResizedGate(hand) {
        if (hand.resizingGateSlot === undefined || hand.pos === undefined) {
            return this;
        }
        let gate = this.circuitDefinition.gateInSlot(hand.resizingGateSlot.x, hand.resizingGateSlot.y);
        if (gate === undefined) {
            return this;
        }
        let row = Math.min(
            this.wireIndexAt(hand.pos.y - hand.holdOffset.y),
            Config.MAX_WIRE_COUNT - 1);
        let newGate = seq(gate.gateFamily).minBy(g => Math.abs(g.height - (row - hand.resizingGateSlot.y + 1)));
        let newWireCount = Math.min(Config.MAX_WIRE_COUNT,
            Math.max(this.circuitDefinition.numWires, newGate.height + hand.resizingGateSlot.y));
        let newCols = seq(this.circuitDefinition.columns).
            withTransformedItem(hand.resizingGateSlot.x,
                colObj => new GateColumn(seq(colObj.gates).
                    withOverlayedItem(hand.resizingGateSlot.y, newGate).
                    toArray())).
            toArray();

        let newCircuitWithoutHeightFix = this.circuitDefinition.withColumns(newCols).
            withWireCount(newWireCount);
        let newCircuit = newCircuitWithoutHeightFix.withHeightOverlapsFixed();
        return this.withCircuit(newCircuit).
            _withHighlightedSlot(this._highlightedSlot).
            _withCompressedColumnIndex(newCircuitWithoutHeightFix.isEqualTo(newCircuit) ?
                undefined :
                hand.resizingGateSlot.x + 1).
            _withFallbackExtraWireStartIndex(this.circuitDefinition.numWires);
    }

    /**
     * @param {!Hand} hand
     * @returns {!DisplayedCircuit}
     */
    afterDropping(hand) {
        return this.previewDrop(hand)._withCompressedColumnIndex(undefined);
    }

    /**
     * @param {!CircuitDefinition} circuitDefinition
     * @returns {!DisplayedCircuit}
     */
    withCircuit(circuitDefinition) {
        return new DisplayedCircuit(
            this.top,
            circuitDefinition,
            this._compressedColumnIndex,
            this._highlightedSlot,
            this._extraWireStartIndex);
    }

    /**
     * @param {undefined|!int} compressedColumnIndex
     * @returns {!DisplayedCircuit}
     * @private
     */
    _withCompressedColumnIndex(compressedColumnIndex) {
        return new DisplayedCircuit(
            this.top,
            this.circuitDefinition,
            compressedColumnIndex,
            this._highlightedSlot,
            this._extraWireStartIndex);
    }

    /**
     * @param {undefined|!{col: !int, row: !int, resizeStyle: !boolean}} slot
     * @returns {!DisplayedCircuit}
     * @private
     */
    _withHighlightedSlot(slot) {
        return new DisplayedCircuit(
            this.top,
            this.circuitDefinition,
            this._compressedColumnIndex,
            slot,
            this._extraWireStartIndex);
    }

    /**
     * @param {undefined|!int} extraWireStartIndex
     * @returns {!DisplayedCircuit}
     * @private
     */
    _withExtraWireStartIndex(extraWireStartIndex) {
        return new DisplayedCircuit(
            this.top,
            this.circuitDefinition,
            this._compressedColumnIndex,
            this._highlightedSlot,
            extraWireStartIndex);
    }

    /**
     * @param {undefined|!int} fallbackExtraWireStartIndex
     * @returns {!DisplayedCircuit}
     * @private
     */
    _withFallbackExtraWireStartIndex(fallbackExtraWireStartIndex) {
        return this._withExtraWireStartIndex(this._extraWireStartIndex || fallbackExtraWireStartIndex);
    }

    /**
     * @param {!Hand} hand
     * @param {!int} extraWireCount
     * @returns {!DisplayedCircuit}
     */
    withJustEnoughWires(hand, extraWireCount) {
        let neededWireCountForPlacement = hand.heldGate !== undefined ? hand.heldGate.height : 0;
        let desiredWireCount = this.circuitDefinition.minimumRequiredWireCount();
        let clampedWireCount = Math.min(
            Config.MAX_WIRE_COUNT,
            Math.max(
                Math.min(1, neededWireCountForPlacement),
                Math.max(Config.MIN_WIRE_COUNT, desiredWireCount) + extraWireCount));
        return this.withCircuit(this.circuitDefinition.withWireCount(clampedWireCount)).
            _withExtraWireStartIndex(extraWireCount === 0 ? undefined : this.circuitDefinition.numWires);
    }

    /**
     * @param {!Point} pos
     * @returns {undefined|!{col: !int, row: !int, offset: !Point}}
     */
    findGateOverlappingPos(pos) {
        let col = this.indexOfDisplayedColumnAt(pos.x);
        let row = this.indexOfDisplayedRowAt(pos.y);
        if (col === undefined || row === undefined) {
            return undefined;
        }

        let target = this.circuitDefinition.findGateCoveringSlot(col, row);
        if (target === undefined) {
            return undefined;
        }

        let gateRect = this.gateRect(target.row, target.col, target.gate.width, target.gate.height);
        if (!gateRect.containsPoint(pos)) {
            return undefined;
        }

        return {col: target.col, row: target.row, offset: pos.minus(gateRect.topLeft())};
    }

    /**
     * @param {!Hand} hand
     * @param {!boolean=} duplicate
     * @returns {!{newCircuit: !DisplayedCircuit, newHand: !Hand}}
     */
    tryGrab(hand, duplicate=false) {
        let {newCircuit, newHand} = this._tryGrabResizeTab(hand) || {newCircuit: this, newHand: hand};
        return newCircuit._tryGrabGate(newHand, duplicate) || {newCircuit, newHand};
    }

    /**
     * @param {!Hand} hand
     * @param {!boolean=} duplicate
     * @returns {undefined|!{newCircuit: !DisplayedCircuit, newHand: !Hand}}
     */
    _tryGrabGate(hand, duplicate=false) {
        if (hand.isBusy() || hand.pos === undefined) {
            return undefined;
        }

        let foundPt = this.findGateOverlappingPos(hand.pos);
        if (foundPt === undefined) {
            return undefined;
        }

        let {col, row, offset} = foundPt;
        let gate = this.circuitDefinition.columns[col].gates[row];

        let remainingGates = seq(this.circuitDefinition.columns[col].gates).toArray();
        if (!duplicate) {
            remainingGates[row] = null;
        }

        let newCols = seq(this.circuitDefinition.columns).
            withOverlayedItem(col, new GateColumn(remainingGates)).
            toArray();
        return {
            newCircuit: new DisplayedCircuit(
                this.top,
                this.circuitDefinition.withColumns(newCols),
                undefined,
                undefined,
                this._extraWireStartIndex),
            newHand: hand.withHeldGate(gate, offset)
        };
    }

    /**
     * @param {!Hand} hand
     * @returns {!{newCircuit: !DisplayedCircuit, newHand: !Hand}}
     */
    _tryGrabResizeTab(hand) {
        if (hand.isBusy() || hand.pos === undefined) {
            return undefined;
        }

        for (let col = 0; col < this.circuitDefinition.columns.length; col++) {
            for (let row = 0; row < this.circuitDefinition.numWires; row++) {
                let gate = this.circuitDefinition.columns[col].gates[row];
                if (gate === null) {
                    continue;
                }
                let {isResizeHighlighted} =
                    this._highlightStatusAt(col, row, hand.hoverPoints());
                if (isResizeHighlighted) {
                    let offset = hand.pos.minus(this.gateRect(row + gate.height - 1, col, 1, 1).center());
                    return {
                        newCircuit: this._withHighlightedSlot({col, row, resizeStyle: true}),
                        newHand: hand.withResizeSlot(new Point(col, row), offset)
                    };
                }
            }
        }
        return undefined;
    }

    /**
     * @returns {Infinity|!number}
     */
    stableDuration() {
        return this.circuitDefinition.stableDuration();
    }

    /**
     * @returns {!int}
     */
    importantWireCount() {
        return Math.max(
            this.circuitDefinition.numWires - 1,
            Math.max(
                Config.MIN_WIRE_COUNT,
                this.circuitDefinition.minimumRequiredWireCount()));
    }

    /**
     * Draws a peek gate on each wire at the right-hand side of the circuit.
     *
     * @param {!Painter} painter
     * @param {!CircuitStats} stats
     * @param {!Hand} hand
     * @private
     */
    _drawOutputDisplays(painter, stats, hand) {
        let chanceCol = this._clampedCircuitColCount() + 1;
        let blochCol = chanceCol + 1;
        let densityCol = blochCol + 1;
        let numWire = this.importantWireCount();

        for (let i = 0; i < numWire; i++) {
            let p = stats.controlledWireProbabilityJustAfter(i, Infinity);
            MathPainter.paintProbabilityBox(painter, p, this.gateRect(i, chanceCol), hand.hoverPoints());
            let m = stats.qubitDensityMatrix(i, Infinity);
            if (m !== undefined) {
                paintBlochSphereDisplay(painter, m, this.gateRect(i, blochCol), hand.hoverPoints());
            }
        }

        for (let i = 0; i + 1 <= numWire; i++) {
            let m = stats.qubitDensityMatrix(i, Infinity);
            let topLeft = this.gateRect(i, densityCol).topLeft();
            let wh = this.gateRect(i, densityCol).bottom() - topLeft.y;
            let r = new Rect(topLeft.x, topLeft.y, wh, wh);
            MathPainter.paintDensityMatrix(painter, m, r, hand.hoverPoints());
        }

        let bottom = this.wireRect(numWire-1).bottom();
        let x = this.opRect(chanceCol - 1).x;
        painter.printParagraph(
            "Local wire states\n(Chance/Bloch/Density)",
            new Rect(x+25, bottom+4, 190, 40),
            new Point(0.5, 0),
            'gray');

        this._drawOutputSuperpositionDisplay(painter, stats, hand);
    }

    /**
     * @returns {!number} The number of columns used for drawing the circuit, before the output display.
     * @private
     */
    _clampedCircuitColCount() {
        return Math.max(
            this.circuitDefinition.columns.length,
            Config.MIN_COL_COUNT + (this._compressedColumnIndex !== undefined ? 1 : 0));
    }

    /**
     * Draws a peek gate on each wire at the right-hand side of the circuit.
     *
     * @param {!Painter} painter
     * @param {!CircuitStats} stats
     * @param {!Hand} hand
     * @private
     */
    _drawOutputSuperpositionDisplay(painter, stats, hand) {
        let amplitudeGrid = this._outputStateAsMatrix(stats);
        let gridRect = this._rectForSuperpositionDisplay();

        let numWire = this.importantWireCount();
        MathPainter.paintMatrix(
            painter,
            amplitudeGrid,
            gridRect,
            numWire < Config.SIMPLE_SUPERPOSITION_DRAWING_WIRE_THRESHOLD ? Config.SUPERPOSITION_MID_COLOR : undefined,
            'black',
            numWire < Config.SIMPLE_SUPERPOSITION_DRAWING_WIRE_THRESHOLD ? Config.SUPERPOSITION_FORE_COLOR : undefined,
            Config.SUPERPOSITION_BACK_COLOR);
        let forceSign = v => (v >= 0 ? '+' : '') + v.toFixed(2);
        MathPainter.paintMatrixTooltip(painter, amplitudeGrid, gridRect, hand.hoverPoints(),
            (c, r) => `Amplitude of |${Util.bin(r*amplitudeGrid.width() + c, numWire)}⟩`,
            (c, r, v) => 'val:' + v.toString(new Format(false, 0, 5, ", ")),
            (c, r, v) => `mag²:${(v.norm2()*100).toFixed(4)}%, phase:${forceSign(v.phase() * 180 / Math.PI)}°`);

        this._drawOutputSuperpositionDisplay_labels(painter);
    }

    /**
     * @param {!Painter} painter
     * @private
     */
    _drawOutputSuperpositionDisplay_labels(painter) {
        let gridRect = this._rectForSuperpositionDisplay();
        let numWire = this.importantWireCount();
        let [colWires, rowWires] = [Math.floor(numWire/2), Math.ceil(numWire/2)];
        let [colCount, rowCount] = [1 << colWires, 1 << rowWires];
        let [dw, dh] = [gridRect.w / colCount, gridRect.h / rowCount];

        // Row labels.
        for (let i = 0; i < rowCount; i++) {
            let label = "_".repeat(colWires) + Util.bin(i, rowWires);
            let x = gridRect.right();
            let y = gridRect.y + dh*(i+0.5);
            painter.print(
                label,
                x + 2,
                y,
                'left',
                'middle',
                'black',
                '12px monospace',
                SUPERPOSITION_GRID_LABEL_SPAN,
                dh,
                (w, h) => painter.fillRect(new Rect(x, y-h/2, w + 4, h), 'lightgray'));
        }

        // Column labels.
        painter.ctx.save();
        painter.ctx.rotate(Math.PI/2);
        for (let i = 0; i < colCount; i++) {
            let label = Util.bin(i, colWires) + "_".repeat(rowWires);
            let x = gridRect.x + dw*(i+0.5);
            let y = gridRect.bottom();
            painter.print(
                label,
                y + 2,
                -x,
                'left',
                'middle',
                'black',
                '12px monospace',
                SUPERPOSITION_GRID_LABEL_SPAN,
                dw,
                (w, h) => painter.fillRect(new Rect(y, -x-h/2, w + 4, h), 'lightgray'));
        }
        painter.ctx.restore();
    }

    /**
     * @param {!CircuitStats} stats
     * @returns {!Matrix}
     * @private
     */
    _outputStateAsMatrix(stats) {
        let numWire = this.importantWireCount();
        let buf = stats.finalState.rawBuffer();
        if (stats.circuitDefinition.numWires !== numWire) {
            buf = buf.slice(0, 2 << numWire);
        }

        let [colWires, rowWires] = [Math.floor(numWire/2), Math.ceil(numWire/2)];
        let [colCount, rowCount] = [1 << colWires, 1 << rowWires];
        return new Matrix(colCount, rowCount, buf);
    }

    /**
     * @returns {!Rect}
     * @private
     */
    _rectForSuperpositionDisplay() {
        let col = this._clampedCircuitColCount() + EXTRA_COLS_FOR_SINGLE_QUBIT_DISPLAYS + 1;
        let numWire = this.importantWireCount();
        let [colWires, rowWires] = [Math.floor(numWire/2), Math.ceil(numWire/2)];
        let [colCount, rowCount] = [1 << colWires, 1 << rowWires];
        let topRect = this.gateRect(0, col);
        let bottomRect = this.gateRect(numWire-1, col);
        let gridRect = new Rect(topRect.x, topRect.y, 0, bottomRect.bottom() - topRect.y);
        return gridRect.withW(gridRect.h * (colCount/rowCount));
    }

    /**
     * Draws a peek gate on each wire at the right-hand side of the circuit.
     *
     * @param {!Painter} painter
     * @param {!CircuitStats} stats
     * @private
     */
    _drawHintLabels(painter, stats) {
        let gridRect = this._rectForSuperpositionDisplay();

        // Amplitude hint.
        painter.print(
            'Final amplitudes',
            gridRect.right() + 3,
            gridRect.bottom() + 3,
            'left',
            'top',
            'gray',
            '12px sans-serif',
            100,
            20);

        // Deferred measurement warning.
        if (this.circuitDefinition.colIsMeasuredMask(Infinity) !== 0) {
            painter.printParagraph(
                "(assuming measurement deferred)",
                new Rect(
                    gridRect.right() + 3,
                    gridRect.bottom() + 20,
                    100,
                    75),
                new Point(0.5, 0),
                'red');
        }

        // Discard rate warning.
        if (stats.postSelectionSurvivalRate < 0.99) {
            let rate = Math.round(100 - stats.postSelectionSurvivalRate * 100);
            let rateDesc = stats.postSelectionSurvivalRate === 0 ? "100" : rate < 100 ? rate : ">99";
            painter.print(
                `(Discard rate: ${rateDesc}%)`,
                this.opRect(this._clampedCircuitColCount()+2).center().x,
                gridRect.bottom() + SUPERPOSITION_GRID_LABEL_SPAN,
                'center',
                'bottom',
                'red',
                '14px sans-serif',
                800,
                50);
        }
    }
}

export default DisplayedCircuit;
