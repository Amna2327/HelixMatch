const path = require('path');
const AbsoluteFilePath = path.join(__dirname, "/smithWaterman");
const { runSmithWaterman } = require(AbsoluteFilePath)

function reportEngine(patientDNA, targetgene, matchedAnchorsArray, Mutated_References) {
    let highestScore = 0;
    let diagnosticStatus = "Negative";
    let bestDiseaseMatches = [];
    let result = [];

    for (const anchorKey of matchedAnchorsArray) {
        const score = runSmithWaterman(patientDNA, Mutated_References[anchorKey]);
        const maxPossibleScore = Mutated_References[anchorKey].length * 3;
        const rawMatchPercentage = (score / maxPossibleScore) * 100;

        // 2. THE ZOOM LENS (Min-Max Scaling for the top 1%)
        let matchPercentage = 0;

        if (rawMatchPercentage >= 99.0) {
            // Stretch the 99-100 range into a 0-100 range
            matchPercentage = (rawMatchPercentage - 99.0) * 100;
        } else {
            // If it's below 99% raw homology, it is totally mathematically irrelevant for this variant
            matchPercentage = 0;
        }

        // --- NEW CLINICAL THRESHOLDS ---
        // Because we zoomed in, your thresholds need to change! 
        // A "90%" here means the raw score was actually 99.9%
        const STRONG_MATCH = 90.0;
        const WEAK_MATCH = 65.0;

        if (matchPercentage >= STRONG_MATCH) {
            diagnosticStatus = "Confirmed variant";
        }
        else if (matchPercentage >= WEAK_MATCH) {
            diagnosticStatus = "Suspicious. Needs review";
        }
        else {
            diagnosticStatus = "Chances are low";
        }

        if (highestScore < matchPercentage && matchPercentage >= WEAK_MATCH) {
            highestScore = matchPercentage;
        }

        result.push({
            Variant_name: anchorKey,
            confidenceScore: matchPercentage,
            diagnostic_Status: diagnosticStatus
        }
        )
    }

    for (const r of result) {
        if (highestScore == 0) {
            bestDiseaseMatches.push("None");
            continue;
        }
        if (r.confidenceScore >= highestScore) {
            bestDiseaseMatches.push(r.Variant_name);
        }
    }

    return { bestDiseaseMatches, result };

}

module.exports = { reportEngine }