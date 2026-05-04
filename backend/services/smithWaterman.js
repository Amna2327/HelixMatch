// --- SCORING SYSTEM ---
const MATCH = 3;
const MISMATCH = -3;
const GAP = -2;
const { parseFasta } = require("../utils/fastaParser"); // Make sure this path is right!

/*// 1. Actually open and read the files
const testDNA1 = parseFasta("../../data/reference_mutations/CFTR_F508_patient.fasta");
const testDNA2 = parseFasta("../../data/healthyDNAsequences/CFTR_F508_healthy.fasta");
runSmithWaterman(testDNA1, testDNA2);*/

// --- THE ENGINE ---
function runSmithWaterman(patientDNA, mutatedReferenceDNA) {
    console.log(`🧬 Running alignment... Patient Length: ${patientDNA.length}, Ref Length: ${mutatedReferenceDNA.length}`);

    //1. Get the lengths of both strings
    const rows = patientDNA.length + 1;
    const cols = mutatedReferenceDNA.length + 1;
    let highestScore = 0;

    const matrix = Array.from({ length: rows }, () => {
        return Array(cols).fill(0)
    })

    for (let r = 1; r < rows; r++) {
        for (let c = 1; c < cols; c++) {
            const pLetter = patientDNA[r - 1];
            const mLetter = mutatedReferenceDNA[c - 1];

            let pathDiagonal = 0;

            //Diagonal comparison
            if (pLetter == mLetter) {
                pathDiagonal = matrix[r - 1][c - 1] + MATCH;
            }
            else {
                pathDiagonal = matrix[r - 1][c - 1] + MISMATCH;
            }

            //LeftPath
            const pathLeft = matrix[r][c - 1] + GAP;
            //pathUP
            const pathUp = matrix[r - 1][c] + GAP;

            const cellScore = Math.max(0, pathDiagonal, pathLeft, pathUp);
            matrix[r][c] = cellScore;

            if (highestScore < cellScore) {
                highestScore = cellScore;
            }
        }
    }

    return highestScore;

    //console.log(highestScore / (mutatedReferenceDNA.length * 3) * 100);
}


module.exports = { runSmithWaterman };