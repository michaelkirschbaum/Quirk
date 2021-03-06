import { Suite, assertThat, assertThrows, assertTrue, assertFalse } from "test/TestUtil.js"
import Serializer from "src/circuit/Serializer.js"

import CircuitDefinition from "src/circuit/CircuitDefinition.js"
import Complex from "src/math/Complex.js"
import Format from "src/base/Format.js"
import Gate from "src/circuit/Gate.js"
import GateColumn from "src/circuit/GateColumn.js"
import GatePainting from "src/ui/GatePainting.js"
import Gates from "src/gates/AllGates.js"
import Matrix from "src/math/Matrix.js"
import {MysteryGateMaker} from "src/gates/Joke_MysteryGate.js"
import {Seq, seq} from "src/base/Seq.js"

let suite = new Suite("Serializer");

let assertRoundTrip = (t, v, s) => {
    assertThat(Serializer.fromJson(t, s)).isEqualTo(v);
    assertThat(Serializer.toJson(v)).isEqualTo(s);
};

suite.test("roundTrip_Complex", () => {
    assertRoundTrip(Complex, Complex.ONE, "1");
    assertRoundTrip(Complex, new Complex(2, -3), "2-3i");
    assertRoundTrip(Complex, Complex.I, "i");
    assertRoundTrip(Complex, new Complex(0, -1), "-i");
    assertRoundTrip(Complex, new Complex(1/3, 0), "\u2153");
    assertRoundTrip(Complex, new Complex(1/3+0.00001, 0), "0.3333433333333333");
});

suite.test("roundTrip_Matrix", () => {
    assertRoundTrip(Matrix, Matrix.row(1, Complex.I), "{{1,i}}");
    assertRoundTrip(Matrix, Matrix.col(1, Complex.I), "{{1},{i}}");
    assertRoundTrip(Matrix, Matrix.square(1/3+0.00001, Complex.I.plus(1), -1/3, 0),
        "{{0.3333433333333333,1+i},{-\u2153,0}}");
});

suite.test("roundTrip_Gate", () => {
    assertRoundTrip(Gate, Gates.HalfTurns.X, "X");
    for (let g of Gates.KnownToSerializer) {
        assertRoundTrip(Gate, g, g.serializedId);
    }

    let f = MysteryGateMaker();
    assertThat(Serializer.fromJson(Gate, Serializer.toJson(f))).isEqualTo(f);

    let g = Gate.fromKnownMatrix(
        "custom_id",
        Matrix.square(Complex.I, -1, 2, 3),
        "custom_name",
        "custom_blurb");
    let v = Serializer.toJson(g);
    let g2 = Serializer.fromJson(Gate, v);
    assertThat(v).isEqualTo({id: "custom_id", matrix: "{{i,-1},{2,3}}"});
    assertThat(g.knownMatrixAt(0)).isEqualTo(g2.knownMatrixAt(0));
    assertThat(g.symbol).isEqualTo(g2.symbol);
});

suite.test("roundTrip_GateColumn", () => {
    assertRoundTrip(
        GateColumn,
        new GateColumn([
            null,
            Gates.HalfTurns.X,
            Gates.Powering.XForward,
            Gates.Special.SwapHalf,
            Gates.Controls.Control,
            null]),
        [1, "X", "X^t", "Swap", "\u2022", 1]);
});

suite.test("roundTrip_circuitDefinition", () => {
    assertRoundTrip(
        CircuitDefinition,
        new CircuitDefinition(
            3,
            [new GateColumn([null, null, Gates.HalfTurns.X])]),
        {cols: [[1, 1, "X"]]});
});

const IDS_THAT_SHOULD_BE_KNOWN = [
    "•", "◦", "⊕", "⊖", "⊗",
    "|0⟩⟨0|", "|1⟩⟨1|", "|+⟩⟨+|", "|-⟩⟨-|", "|X⟩⟨X|",
    "Measure",
    "Swap",
    "…",
    "__error__",
    "0",
    "H",
    "X", "Y", "Z",
    "X^½", "X^⅓", "X^¼", "X^⅛", "X^⅟₁₆",
    "X^-½", "X^-⅓", "X^-¼", "X^-⅛", "X^-⅟₁₆",
    "Y^½", "Y^⅓", "Y^¼", "Y^⅛", "Y^⅟₁₆",
    "Y^-½", "Y^-⅓", "Y^-¼", "Y^-⅛", "Y^-⅟₁₆",
    "Z^½", "Z^⅓", "Z^¼", "Z^⅛", "Z^⅟₁₆", "Z^⅟₃₂", "Z^⅟₆₄", "Z^⅟₁₂₈",
    "Z^-½", "Z^-⅓", "Z^-¼", "Z^-⅛", "Z^-⅟₁₆",
    "X^t", "Y^t", "Z^t", "X^-t", "Y^-t", "Z^-t",
    "e^iXt", "e^iYt", "e^iZt", "e^-iXt", "e^-iYt", "e^-iZt",
    "Amps1", "Amps2", "Amps3", "Amps4", "Amps5", "Amps6", "Amps7", "Amps8", "Amps9", "Amps10", "Amps11", "Amps12", "Amps13", "Amps14", "Amps15", "Amps16",
    "Chance", "Chance2", "Chance3", "Chance4", "Chance5", "Chance6", "Chance7", "Chance8", "Chance9", "Chance10", "Chance11", "Chance12", "Chance13", "Chance14", "Chance15", "Chance16",
    "Sample1", "Sample2", "Sample3", "Sample4", "Sample5", "Sample6", "Sample7", "Sample8", "Sample9", "Sample10", "Sample11", "Sample12", "Sample13", "Sample14", "Sample15", "Sample16",
    "Density", "Density2", "Density3", "Density4", "Density5", "Density6", "Density7", "Density8",
    "Bloch",
    "inc1", "inc2", "inc3", "inc4", "inc5", "inc6", "inc7", "inc8", "inc9", "inc10", "inc11", "inc12", "inc13", "inc14", "inc15", "inc16",
    "dec1", "dec2", "dec3", "dec4", "dec5", "dec6", "dec7", "dec8", "dec9", "dec10", "dec11", "dec12", "dec13", "dec14", "dec15", "dec16",
    "add2", "add3", "add4", "add5", "add6", "add7", "add8", "add9", "add10", "add11", "add12", "add13", "add14", "add15", "add16",
    "sub2", "sub3", "sub4", "sub5", "sub6", "sub7", "sub8", "sub9", "sub10", "sub11", "sub12", "sub13", "sub14", "sub15", "sub16",
    "X^⌈t⌉", "X^⌈t-¼⌉",
    "Counting1", "Counting2", "Counting3", "Counting4", "Counting5", "Counting6", "Counting7", "Counting8",
    "Uncounting1", "Uncounting2", "Uncounting3", "Uncounting4", "Uncounting5", "Uncounting6", "Uncounting7", "Uncounting8",
    ">>t2", ">>t3", ">>t4", ">>t5", ">>t6", ">>t7", ">>t8", ">>t9", ">>t10", ">>t11", ">>t12", ">>t13", ">>t14", ">>t15", ">>t16",
    "<<t2", "<<t3", "<<t4", "<<t5", "<<t6", "<<t7", "<<t8", "<<t9", "<<t10", "<<t11", "<<t12", "<<t13", "<<t14", "<<t15", "<<t16",
    "<<2", "<<3", "<<4", "<<5", "<<6", "<<7", "<<8", "<<9", "<<10", "<<11", "<<12", "<<13", "<<14", "<<15", "<<16",
    ">>2", ">>3", ">>4", ">>5", ">>6", ">>7", ">>8", ">>9", ">>10", ">>11", ">>12", ">>13", ">>14", ">>15", ">>16",
    "QFT1", "QFT2", "QFT3", "QFT4", "QFT5", "QFT6", "QFT7", "QFT8", "QFT9", "QFT10", "QFT11", "QFT12", "QFT13", "QFT14", "QFT15", "QFT16",
    "QFT†1", "QFT†2", "QFT†3", "QFT†4", "QFT†5", "QFT†6", "QFT†7", "QFT†8", "QFT†9", "QFT†10", "QFT†11", "QFT†12", "QFT†13", "QFT†14", "QFT†15", "QFT†16",
    "c+=ab3", "c+=ab4", "c+=ab5", "c+=ab6", "c+=ab7", "c+=ab8", "c+=ab9", "c+=ab10", "c+=ab11", "c+=ab12", "c+=ab13", "c+=ab14", "c+=ab15", "c+=ab16",
    "c-=ab3", "c-=ab4", "c-=ab5", "c-=ab6", "c-=ab7", "c-=ab8", "c-=ab9", "c-=ab10", "c-=ab11", "c-=ab12", "c-=ab13", "c-=ab14", "c-=ab15", "c-=ab16",
    "PhaseGradient1", "PhaseGradient2", "PhaseGradient3", "PhaseGradient4", "PhaseGradient5", "PhaseGradient6", "PhaseGradient7", "PhaseGradient8", "PhaseGradient9", "PhaseGradient10", "PhaseGradient11", "PhaseGradient12", "PhaseGradient13", "PhaseGradient14", "PhaseGradient15", "PhaseGradient16",
    "PhaseUngradient1", "PhaseUngradient2", "PhaseUngradient3", "PhaseUngradient4", "PhaseUngradient5", "PhaseUngradient6", "PhaseUngradient7", "PhaseUngradient8", "PhaseUngradient9", "PhaseUngradient10", "PhaseUngradient11", "PhaseUngradient12", "PhaseUngradient13", "PhaseUngradient14", "PhaseUngradient15", "PhaseUngradient16",
    "rev2", "rev3", "rev4", "rev5", "rev6", "rev7", "rev8", "rev9", "rev10", "rev11", "rev12", "rev13", "rev14", "rev15", "rev16"
];

suite.test("known_gates_backwards_compatible", () => {
    let knownIds = new Set(Gates.KnownToSerializer.map(e => e.serializedId));
    knownIds.add(MysteryGateMaker().serializedId);
    for (let id of IDS_THAT_SHOULD_BE_KNOWN) {
        assertThat(knownIds.has(id)).withInfo(id).isEqualTo(true);
    }
});

suite.test("known_gates_forward_compatible", meta => {
    let shouldBeKnownIds = new Set(IDS_THAT_SHOULD_BE_KNOWN);
    for (let id of Gates.KnownToSerializer.map(e => e.serializedId)) {
        if (id.startsWith("__unstable__")) {
            continue;
        }
        meta.warn_only = "New id: " + id;
        assertThat(shouldBeKnownIds.has(id)).withInfo(id).isEqualTo(true);
    }
    meta.warn_only = false;
});

suite.test("known_gates_toolbox", () => {
    let allToolboxGates = seq(Gates.TopToolboxGroups).
        concat(Gates.BottomToolboxGroups).
        flatMap(e => e.gates).
        filter(e => e !== undefined).
        flatMap(e => e.gateFamily).
        toArray();

    let knownIds = new Set(Gates.KnownToSerializer.map(e => e.serializedId));
    knownIds.add(MysteryGateMaker().serializedId);
    for (let gate of allToolboxGates) {
        assertThat(knownIds.has(gate.serializedId)).withInfo(gate).isEqualTo(true);
    }

    // Print 'hidden ids' of gates not accessible from toolbox
    //let toolboxIds = new Set(allToolboxGates.map(e => e.serializedId));
    //for (let id of knownIds) {
    //    if (!toolboxIds.has(id)) {
    //        console.log("hidden id: " + id);
    //    }
    //}
});
