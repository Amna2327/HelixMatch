const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { parseFasta } = require("./utils/fastaParser")
// 🔴 FIX: Import updated gateKeeper functions
const { loadGeneData, isValidGeneLabel, ValidateDNA, getVariantsForGene } = require("./services/gateKeeper")
const { reportEngine } = require("./services/reportEngine")

const PORT = process.env.PORT || 3000;
const allowedOrigins = [process.env.FRONTEND_URL || `http://localhost:${PORT}`];

const app = express();
const corsOptions = {
    origins: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 200
}       

app.use(cors(corsOptions));
app.use(express.json());

const Mutated_References = {}

function GetMutatedReferences() {
    console.log("⚙️ Booting up: Loading mutated references into RAM...");

    try {
        const AbsoluteDirectoryPath = path.join(__dirname, '../data/reference_mutations/')
        const files = fs.readdirSync(AbsoluteDirectoryPath);

        for (const FileName of files) {
            const geneName = FileName.replace("_patient.fasta", "");
            const FilePath = "../../data/reference_mutations/" + FileName;
            const pureDNA = parseFasta(FilePath);
            Mutated_References[geneName] = pureDNA;
        }

        console.log("✅ Loaded diseases:", Object.keys(Mutated_References));

    } catch (error) {
        console.error("❌ CRITICAL: Failed to load mutations.", error.message);
        process.exit(1);
    }
}

// 🔴 FIX: API endpoint to analyze patient data
// Expected Payload:
// {
//   patientID: "PATIENT_1234567890",
//   geneLabel: "CFTR",              ← Disease to detect
//   sequences: [{
//     fileName: "sample.fasta",
//     sequenceData: "ATCGATCG..."
//   }]
// }
app.post('/api/analyze_patients', (req, res) => {
    const payload = req.body;
    let analysisReport = [];

    // 🔴 FIX: Check if geneLabel exists in payload
    if (!payload.geneLabel) {
        return res.status(400).json({
            error: 'Missing geneLabel',
            message: 'geneLabel is required in payload'
        });
    }

    // 🔴 FIX: Validate geneLabel is in allowed list
    if (!isValidGeneLabel(payload.geneLabel)) {
        return res.status(400).json({
            error: 'Invalid geneLabel',
            message: `geneLabel must be one of: ${Object.keys(Mutated_References).join(', ')}`,
            received: payload.geneLabel
        });
    }

    console.log(`📊 Analyzing ${payload.patientID} for disease: ${payload.geneLabel}`);

    // 🔴 FIX: Process each sequence (usually just 1 per API call)
    for (let seqData of payload.sequences) {
        const targetGene = payload.geneLabel; 
        const patientDNA = seqData.sequenceData.toUpperCase();
        const fileName = seqData.fileName;

        console.log(`🔍 Checking ${fileName} against ${targetGene}`);
        
        // ✅ Validate DNA sequences against anchors
        const matchedAnchorsArray = ValidateDNA(patientDNA, targetGene);

        if (!matchedAnchorsArray) {
            analysisReport.push({
                gene: targetGene,
                fileName: fileName,
                status: "rejected",
                message: "Gene homology too low. No valid match"
            });
            console.log(`❌ ${fileName}: Rejected - no valid match`);
            continue;
        }

        console.log(`✅ ${fileName}: Matched anchors [${matchedAnchorsArray.join(',')}]`);

        // 📊 Run report engine to find matching variants
        // 🧬 VARIANTS FLOW:
        // 1. getVariantsForGene(targetGene) returns: ['CFTR_G542X', 'CFTR_W1282X', 'CFTR_F508']
        // 2. reportEngine compares patient DNA against these variants
        // 3. reportEngine returns result array with Variant_name and confidenceScore for each match
        // 4. Frontend displays highest confidence variant in table
        const variants = getVariantsForGene(targetGene);
        console.log(`🧬 Possible variants for ${targetGene}:`, variants);

        let { bestDiseaseMatches, result } = reportEngine(
            patientDNA, 
            targetGene, 
            matchedAnchorsArray, 
            Mutated_References
        );

        // 📝 RESPONSE STRUCTURE:
        // result = [{
        //   Variant_name: "CFTR_G542X",     ← 🧬 Variant detected (from reportEngine)
        //   confidenceScore: 85.5,          ← 📊 Match confidence percentage
        //   diagnostic_Status: "Confirmed"
        // }, ...]
        //
        // bestDiseaseMatches = ["CFTR_G542X"]  ← 🎯 Highest matching variant(s)

        analysisReport.push({
            gene: targetGene,
            fileName: fileName,
            status: "Accepted",
            message: "Ran the test. Check results",
            // 📋 resultReport contains array of variants with their confidence scores
            // Frontend extracts: Variant_name and confidenceScore from here
            resultReport: result,              
            // 🎯 Best matching variants (already selected by reportEngine)
            HighestDiseaseMatches: bestDiseaseMatches
        });

        console.log(`✅ ${fileName}: Accepted - Variants: ${bestDiseaseMatches.join(', ')}`);
    }

    res.status(200).json({
        patientID: payload.patientID,
        geneLabel: payload.geneLabel,
        report: analysisReport
    })
})

// 🔴 FIX: Health check endpoint
app.get('/api/status', (req, res) => {
    console.log("✅ Status check");
    res.status(200).json({ 
        message: "Helix match is up and running",
        timestamp: new Date().toISOString()
    })
})

// 🔴 CRITICAL: Load all data before starting server
async function startServer() {
    try {
        console.log("🚀 Initializing server...");
        
        // 📍 Load gene data first (from backend/filesystem)
        await loadGeneData();
        
        // 📍 Load reference mutations
        GetMutatedReferences();
        
        // 📍 Start listening only after all data is loaded
        app.listen(PORT, () => {
            console.log(`✅ Server ready on port ${PORT}`);
            console.log(`🎯 API endpoint: POST http://localhost:${PORT}/api/analyze_patients`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

// Start the server
startServer();