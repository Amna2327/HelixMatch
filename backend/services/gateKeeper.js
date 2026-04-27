const path = require('path');
const AbsoluteFilePath = path.join(__dirname, "../../data/anchors.json");
const GENE_ANCHORS = require(AbsoluteFilePath);

function ValidateDNA(patientDNA, targetgene) {
    let matchedAnchors = [];
    for (const anchorKey in GENE_ANCHORS) {
        if (anchorKey.startsWith(targetgene)) {
            if (patientDNA.includes(GENE_ANCHORS[anchorKey])) {
                matchedAnchors.push(anchorKey)
            }
        }
    }

    if (matchedAnchors.length == 0) {
        return false;
    }
    return matchedAnchors;
}

module.exports = { ValidateDNA }