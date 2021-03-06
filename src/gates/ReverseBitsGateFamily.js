import CircuitShaders from "src/circuit/CircuitShaders.js"
import Gate from "src/circuit/Gate.js"
import Seq from "src/base/Seq.js"

let ReverseBitsGateFamily = Gate.generateFamily(2, 16, span => Gate.withoutKnownMatrix(
    "Reverse",
    "Reverse Bits Gate",
    "Swaps some bits into the opposite order.").
    markedAsStable().
    markedAsOnlyPermutingAndPhasing().
    withSerializedId("rev" + span).
    withHeight(span).
    withCustomShaders(Seq.range(Math.floor(span/2)).
        map(i => (val, con, bit) => CircuitShaders.swap(val, bit + i, bit + span - i - 1, con)).
        toArray()));

export default ReverseBitsGateFamily;
