import Gate from "src/circuit/Gate.js"
import Matrix from "src/math/Matrix.js"

let VariousYGates = {};
export default VariousYGates;

VariousYGates.Y3 = Gate.fromKnownMatrix(
    "Y^⅓",
    Matrix.fromPauliRotation(0, 1 / 6, 0),
    "Y^⅓ Gate",
    "Principle third root of Y.");
VariousYGates.Y3i = Gate.fromKnownMatrix(
    "Y^-⅓",
    Matrix.fromPauliRotation(0, -1 / 6, 0),
    "Y^-⅓ Gate",
    "Adjoint third root of Y.");
VariousYGates.Y4 = Gate.fromKnownMatrix(
    "Y^¼",
    Matrix.fromPauliRotation(0, 1 / 8, 0),
    "Y^¼ Gate",
    "Principle fourth root of Y.");
VariousYGates.Y4i = Gate.fromKnownMatrix(
    "Y^-¼",
    Matrix.fromPauliRotation(0, -1 / 8, 0),
    "Y^-¼ Gate",
    "Adjoint fourth root of Y.");
VariousYGates.Y8 = Gate.fromKnownMatrix(
    "Y^⅛",
    Matrix.fromPauliRotation(0, 1 / 16, 0),
    "Y^⅛ Gate",
    "Principle eighth root of Y.");
VariousYGates.Y8i = Gate.fromKnownMatrix(
    "Y^-⅛",
    Matrix.fromPauliRotation(0, -1 / 16, 0),
    "Y^-⅛ Gate",
    "Adjoint eighth root of Y.");
VariousYGates.Y16 = Gate.fromKnownMatrix(
    "Y^⅟₁₆",
    Matrix.fromPauliRotation(0, 1 / 32, 0),
    "Y^⅟₁₆ Gate",
    "Principle sixteenth root of Y.");
VariousYGates.Y16i = Gate.fromKnownMatrix(
    "Y^-⅟₁₆",
    Matrix.fromPauliRotation(0, -1 / 32, 0),
    "Y^-⅟₁₆ Gate",
    "Adjoint sixteenth root of Y.");

VariousYGates.all =[
    VariousYGates.Y3,
    VariousYGates.Y4,
    VariousYGates.Y8,
    VariousYGates.Y16,
    VariousYGates.Y3i,
    VariousYGates.Y4i,
    VariousYGates.Y8i,
    VariousYGates.Y16i
];
