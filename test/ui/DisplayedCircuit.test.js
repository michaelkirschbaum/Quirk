import { Suite, assertThat, assertThrows, fail } from "test/TestUtil.js"
import DisplayedCircuit from "src/widgets/DisplayedCircuit.js"

import CircuitDefinition from "src/circuit/CircuitDefinition.js"
import Config from "src/Config.js"
import Gates from "src/gates/AllGates.js"
import Point from "src/math/Point.js"
import {seq, Seq} from "src/base/Seq.js"

const TEST_GATES = new Map([
    ['X', Gates.HalfTurns.X],
    ['Y', Gates.HalfTurns.Y],
    ['Z', Gates.HalfTurns.Z],
    ['H', Gates.HalfTurns.H],
    ['•', Gates.Controls.Control],
    ['◦', Gates.Controls.AntiControl],
    ['.', Gates.SpacerGate],

    ['M', Gates.Special.Measurement],
    ['%', Gates.Displays.ChanceDisplay],
    ['d', Gates.Displays.DensityMatrixDisplay],
    ['D', Gates.Displays.DensityMatrixDisplay2],
    ['@', Gates.Displays.BlochSphereDisplay],
    ['s', Gates.Special.SwapHalf],
    ['!', Gates.PostSelectionGates.PostSelectOn],

    ['+', null],
    ['/', null],

    ['t', Gates.Exponentiating.XForward]
]);

/**
 * @param {!string} diagramText
 * @returns {!{circuit: !DisplayedCircuit, pts: !Array.<!Point>}}
 */
let diagram = diagramText => {
    let lines = diagramText.split('\n').map(e => {
        let p = e.split('|');
        if (p.length !== 2) {
            fail('Bad diagram: ' + diagramText);
        }
        return p[1];
    });
    let circuitDiagramSubset = seq(lines).
        skip(1).
        stride(2).
        map(line => seq(line).skip(1).stride(2).join("")).
        join('\n');
    let circuit = new DisplayedCircuit(
        10,
        CircuitDefinition.fromTextDiagram(TEST_GATES, circuitDiagramSubset),
        undefined,
        undefined,
        undefined);
    let pts = Seq.naturals().
        takeWhile(k => diagramText.indexOf(k) !== -1).
        map(k => {
            let pos = seq(lines).mapWithIndex((line, row) => ({row, col: line.indexOf(k)})).
                filter(e => e.col !== -1).
                single();
            if (lines[pos.row][pos.col + 1] === '^') {
                pos.row -= 1;
                pos.col += 1;
            }
            return new Point(
                pos.col * Config.WIRE_SPACING / 2 + 35.5,
                pos.row * Config.WIRE_SPACING / 2 + 10.5);
        }).toArray();
    return {circuit, pts};
};

let suite = new Suite("DisplayedCircuit");

suite.test("constructor_vs_isEqualTo", () => {
    let d1 = CircuitDefinition.fromTextDiagram(TEST_GATES, '+H+\nX+Y');
    let d2 = CircuitDefinition.fromTextDiagram(TEST_GATES, '++++\ntHHH');
    assertThrows(() => new DisplayedCircuit(23, "not a circuit", undefined, undefined, undefined));
    assertThrows(() => new DisplayedCircuit("not a number", d1, undefined, undefined, undefined));

    let c1 = new DisplayedCircuit(45, d1, undefined, undefined, undefined);
    let c2 = new DisplayedCircuit(67, d2, 1, {col: 1, row: 1, resizeStyle: true}, 1);
    assertThat(c1.top).isEqualTo(45);
    assertThat(c1.circuitDefinition).isEqualTo(d1);

    assertThat(c1).isEqualTo(c1);
    assertThat(c1).isNotEqualTo(c2);
    assertThat(c2).isEqualTo(c2);
    assertThat(c2).isNotEqualTo(c1);

    assertThat(c1).isEqualTo(new DisplayedCircuit(45, d1, undefined, undefined, undefined));
    assertThat(c1).isNotEqualTo(new DisplayedCircuit(46, d1, undefined, undefined, undefined));
    assertThat(c1).isNotEqualTo(new DisplayedCircuit(45, d2, undefined, undefined, undefined));
    assertThat(c1).isNotEqualTo(new DisplayedCircuit(45, d1, 1, undefined, undefined));
    assertThat(c1).isNotEqualTo(new DisplayedCircuit(45, d1, undefined, {col:1, row:1, resizeStyle:false}, undefined));
    assertThat(c1).isNotEqualTo(new DisplayedCircuit(45, d1, undefined, undefined, 0));

    assertThat(c2).isEqualTo(new DisplayedCircuit(67, d2, 1, {col: 1, row: 1, resizeStyle: true}, 1));
    assertThat(c2).isNotEqualTo(new DisplayedCircuit(68, d2, 1, {col: 1, row: 1, resizeStyle: true}, 1));
    assertThat(c2).isNotEqualTo(new DisplayedCircuit(67, d1, 1, {col: 1, row: 1, resizeStyle: true}, 1));
    assertThat(c2).isNotEqualTo(new DisplayedCircuit(67, d2, 2, {col: 1, row: 1, resizeStyle: true}, 1));
    assertThat(c2).isNotEqualTo(new DisplayedCircuit(67, d2, 1, {col: 2, row: 1, resizeStyle: true}, 1));
    assertThat(c2).isNotEqualTo(new DisplayedCircuit(67, d2, 1, {col: 2, row: 1, resizeStyle: true}, 2));
});

suite.test("bootstrap_diagram", () => {
    assertThat(diagram(`|
                        |-X-D//-
                        |   ///
                        |-+-///-
                        |`)).isEqualTo({
        circuit: new DisplayedCircuit(
            10,
            CircuitDefinition.fromTextDiagram(TEST_GATES, `XD+
                                                           +++`),
            undefined,
            undefined,
            undefined),
        pts: []
    });

    assertThat(diagram(`|
                        |-+-H-+-
                        |
                        |-+-Y-+-
                        |`)).isEqualTo({
        circuit: new DisplayedCircuit(
            10,
            CircuitDefinition.fromTextDiagram(TEST_GATES, `+H+
                                                           +Y+`),
            undefined,
            undefined,
            undefined),
        pts: []
    });

    assertThat(diagram(`|01
                        |2+-H-+-
                        |  3
                        |-+-Y4+-
                        |  5^   `)).isEqualTo({
        circuit: new DisplayedCircuit(
            10,
            CircuitDefinition.fromTextDiagram(TEST_GATES, `+H+
                                                           +Y+`),
            undefined,
            undefined,
            undefined),
        pts: [
            new Point(35.5, 10.5),
            new Point(60.5, 10.5),
            new Point(35.5, 35.5),
            new Point(85.5, 60.5),
            new Point(135.5, 85.5),
            new Point(110.5, 85.5)
        ]
    });
});

suite.test("indexOfDisplayedRowAt", () => {
    let {circuit, pts} = diagram(`|0
                                  |1+-+-
                                  |   2
                                  |-+3+-
                                  |  4`);

    assertThat(circuit.indexOfDisplayedRowAt(-9999)).isEqualTo(undefined);
    assertThat(circuit.indexOfDisplayedRowAt(+9999)).isEqualTo(undefined);

    assertThat(circuit.indexOfDisplayedRowAt(pts[0].y)).isEqualTo(0);
    assertThat(circuit.indexOfDisplayedRowAt(pts[1].y)).isEqualTo(0);
    assertThat(circuit.indexOfDisplayedRowAt(pts[2].y)).isEqualTo(1);
    assertThat(circuit.indexOfDisplayedRowAt(pts[3].y)).isEqualTo(1);
    assertThat(circuit.indexOfDisplayedRowAt(pts[4].y)).isEqualTo(undefined);
});
