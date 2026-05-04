const express = require('express');
const fs = require('fs')
const path = require('path')
const cors = require('cors');
require('dotenv').config();

const { parseFasta } = require("./utils/fastaParser")
const { ValidateDNA } = require("./services/gateKeeper")
const { reportEngine } = require("./services/reportEngine")

const PORT = process.env.PORT || 3000;
const allowedOrigins = [process.env.FRONTEND_URL || `http://localhost:${PORT}`];

const app = express();
const corsOptions = {
    origins: allowedOrigins,
    credentials: true, //auth headers 
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
        // 1. Read the folder (Moved INSIDE the try block!)
        const AbsoluteDirectoryPath = path.join(__dirname, '../data/reference_mutations/')
        const files = fs.readdirSync(AbsoluteDirectoryPath);

        for (const FileName of files) {
            // 2. Extract the gene name (Make sure this matches your actual file names!)
            const geneName = FileName.replace("_patient.fasta", "");

            // 3. Build the path
            const FilePath = "../../data/reference_mutations/" + FileName;

            // 4. USE YOUR TOOL! (This replaces all the split/shift/join nonsense)
            const pureDNA = parseFasta(FilePath);

            // 5. Save to RAM
            Mutated_References[geneName] = pureDNA;
        }

        console.log("✅ Loaded diseases:", Object.keys(Mutated_References));

    } catch (error) {
        console.error("❌ CRITICAL: Failed to load mutations.", error.message);
        process.exit(1);
    }
}

// API endpoint to analyze patient data, expects a JSON payload with patientID and an array of sequences (each with gene and sequenceData)
// returns a report with the analysis results, including status (accepted/rejected), messages, and detailed results if accepted
app.post('/api/analyze_patients', (req, res) => {
    const payload = req.body;
    let analysisReport = [];

    console.log(`Reading :${payload.patientID} data`);

    for (let seqData of payload.sequences) {
        const targetgene = seqData.gene;
        const patientDNA = seqData.sequenceData.toUpperCase();
        console.log(`Checking ${targetgene}`);

        const matchedAnchorsArray = ValidateDNA(patientDNA, targetgene);

        //rejected
        if (!matchedAnchorsArray) {
            analysisReport.push({
                gene: targetgene,
                status: "rejected",
                message: "Gene homology too low. No valid match"
            }
            );
            continue;
        }

        console.log(`${targetgene} matched to the following anchors [${matchedAnchorsArray.join(',')}]`)

        let { bestDiseaseMatches, result } = reportEngine(patientDNA, targetgene, matchedAnchorsArray, Mutated_References);
        //accepted
        analysisReport.push({
            gene: targetgene,
            status: "Accepted",
            message: "Ran the test. Check results",
            resultReport: result,
            HighestDiseaseMatches: bestDiseaseMatches
        }
        );

    }
    res.status(200).json(
        {
            patientID: payload.patientID,
            report: analysisReport
        }
    )
})

app.get('/api/status', (req, res) => {
    console.log("App is running");
    res.status(200).json({ message: "Helix match is up and running" })
})

GetMutatedReferences();

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})