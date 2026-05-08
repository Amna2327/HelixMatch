const fs = require('fs');
const path = require('path');

let GENE_LABELS = {}; 
let GENE_ANCHORS = {};
let ALLOWED_GENE_LABELS = []; 

async function loadGeneData() {
    try {
        console.log("⚙️ Loading gene data into RAM...");
        
        // Load gene_labels.json from backend
        const labelsResponse = await fetch("http://localhost:3000/data/gene_labels.json");
        if (!labelsResponse.ok) {
            throw new Error(`Failed to fetch gene labels: ${labelsResponse.statusText}`);
        }
        GENE_LABELS = await labelsResponse.json();
        console.log('✅ Loaded gene labels:', Object.keys(GENE_LABELS));

        //  Extract allowed gene names from GENE_LABELS keys
        // GENE_LABELS = { CFTR: {...}, HBB: {...} }
        // ALLOWED_GENE_LABELS = ['CFTR', 'HBB', 'HTT', 'PKU', 'Taysachs']
        ALLOWED_GENE_LABELS = Object.keys(GENE_LABELS);
        if (ALLOWED_GENE_LABELS.length === 0) {
            throw new Error('❌ No gene labels found in gene_labels.json');
        }
        console.log('✅ Allowed gene labels:', ALLOWED_GENE_LABELS);

    } catch (error) {
        console.error('❌ Error loading gene labels from backend:', error.message);
        console.log('⚠️ Using fallback gene labels');
        
        // Use hardcoded labels with variant structure
        GENE_LABELS = {
            'CFTR': { description: 'Cystic Fibrosis', variants: ['CFTR_G542X', 'CFTR_W1282X', 'CFTR_F508'] },
            'HBB': { description: 'Sickle Cell', variants: ['HBB'] },
            'HTT': { description: 'Huntington', variants: ['HTT'] },
            'PKU': { description: 'Phenylketonuria', variants: ['PKU_PAH'] },
            'Taysachs': { description: 'Tay-Sachs', variants: ['Taysachs_HEXA']}
        };
        ALLOWED_GENE_LABELS = Object.keys(GENE_LABELS);
        console.log('✅ Using fallback - Allowed gene labels:', ALLOWED_GENE_LABELS);
    }

    try {
        console.log("⚙️ Loading gene anchors into RAM...");
        
        // Load anchors.json from filesystem
        const anchorsPath = path.join(__dirname, '../../data/anchors.json');
        const anchorsData = fs.readFileSync(anchorsPath, 'utf8');
        GENE_ANCHORS = JSON.parse(anchorsData);
        console.log('✅ Loaded gene anchors:', Object.keys(GENE_ANCHORS).length, 'anchors');

    } catch (error) {
        console.error('❌ Error loading anchors:', error.message);
        GENE_ANCHORS = {};
        console.log('⚠️ No anchors loaded - ValidateDNA will return false for all files');
    }
}

// Returns true if label exists in ALLOWED_GENE_LABELS, false otherwise
function isValidGeneLabel(label) {
    const isValid = ALLOWED_GENE_LABELS.includes(label);
    console.log(`ValidateGeneLabel("${label}"): ${isValid}`);
    return isValid;
}

// Searches for matching anchors in the patient DNA sequence
// Returns array of matched anchor keys, or false if no matches
function ValidateDNA(patientDNA, targetGene) {
    let matchedAnchors = [];
    
    // Check if GENE_ANCHORS is loaded and is an object
    if (!GENE_ANCHORS || typeof GENE_ANCHORS !== 'object' || Object.keys(GENE_ANCHORS).length === 0) {
        console.warn(`⚠️ GENE_ANCHORS not loaded or empty for ${targetGene}`);
        return false;
    }

    // Look for anchors that start with the target gene name
    for (const anchorKey in GENE_ANCHORS) {
        // Check if this anchor belongs to the target gene
        if (anchorKey.startsWith(targetGene)) {
            const anchorSequence = GENE_ANCHORS[anchorKey];
            
            // Check if patient DNA contains this anchor sequence
            if (patientDNA.includes(anchorSequence)) {
                matchedAnchors.push(anchorKey);
                console.log(`✅ Found anchor: ${anchorKey}`);
            }
        }
    }

    console.log(`Matched anchors for ${targetGene}:`, matchedAnchors);

    if (matchedAnchors.length === 0) {
        console.log(`❌ No anchors matched for ${targetGene}`);
        return false;
    }
    return matchedAnchors;
}

// returns the list of possible variants for a gene
function getVariantsForGene(geneLabel) {
    if (GENE_LABELS[geneLabel] && GENE_LABELS[geneLabel].variants) {
        return GENE_LABELS[geneLabel].variants;
    }
    return [];
}

// Gets description for a given gene
function getGeneDescription(geneLabel) {
    if (GENE_LABELS[geneLabel]) {
        return GENE_LABELS[geneLabel].description;
    }
    return 'Unknown gene';
}

module.exports = { 
    loadGeneData,           // Call this in server.js at startup
    isValidGeneLabel,       // Validate geneLabel before analysis
    ValidateDNA,            // Check DNA against anchors
    getVariantsForGene,     // Get variants for a gene (used by reportEngine)
    getGeneDescription   // Get gene description
}