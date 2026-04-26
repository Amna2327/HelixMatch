const express = require('express');
const GENE_ANCHORS = require("../data/anchors.json")
const fs = require('fs')
const { parseFasta } = require("./utils/fastaParser")

const app = express();
app.use(express.json());

const Mutated_References = {}


function GetMutatedReferences() {
    console.log("⚙️ Booting up: Loading mutated references into RAM...");

    try {
        // 1. Read the folder (Moved INSIDE the try block!)
        const files = fs.readdirSync('../../data/reference_mutations/');

        for (const FileName of files) {
            // 2. Extract the gene name (Make sure this matches your actual file names!)
            const geneName = FileName.replace("_mutated.fasta", "");

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

app.post('/api/analyze_patients', (req, res) => {
    payload = req.body;
    let analysisReport = [];

    console.log(`Reading :${payload.patientID} data`);

    for (let seqData of payload.sequences) {
        const targetgene = seqData.gene;
        const patientDNA = seqData.sequenceData.toUpperCase();
        console.log(`Checking ${targetgene}`)

        const anchor = GENE_ANCHORS[targetgene];
        if (!anchor) {
            analysisReport.push({ gene: targetgene, status: "error", message: "This gene is not in the database" });
            continue;
        }
        if (!patientDNA.includes(anchor)) {
            analysisReport.push({ gene: targetgene, status: "Rejected", message: "Gene homology low, invalid PCR read" });
            continue;
        }
        analysisReport.push({ gene: targetgene, status: "Accepted", messagwe: "Gene is valid,ready for Smith-Waterman" });
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

app.listen(3000, () => {
    console.log('Server listening')
})