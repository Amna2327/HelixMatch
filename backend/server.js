const express = require('express');
const app = express();
app.use(express.json());

const GENE_ANCHORS = {
    "CFTR": "ATTGTC",
    "HBB": "GTTAC",
    "HTT": "ATCTC"
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
            analysisReport.push({ gene: targetgene, status: "Rejected", message: "Gene homology low, inalid PCR read" });
            continue;
        }
        analysisReport.push({ gene: targetgene, status: "Accepted", message: "Gene is valid,ready for Smith-Waterman" });
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