const { parseFasta } = require("./utils/fastaParser")
const fs = require('fs')
const path = require('path')

function getPatientDNA() {

    const AbsoluteDirectoryPath = path.join(__dirname, '../data/test_contigs/patient_1');
    const files = fs.readdirSync(AbsoluteDirectoryPath);
    let GeneSequences = [];
    for (const FileName of files) {

        const geneName = FileName.split('_')[0];
        const FilePath = '../../data/test_contigs/patient_1/' + FileName;
        const DNA = parseFasta(FilePath);
        GeneSequences.push({
            gene: geneName,
            sequenceData: DNA
        })
    }

    /*const files = fs.readdirSync(AbsoluteDirectoryPath);
    let GeneSequences = [];

    // FOR TESTING: Just grab the very first file in the folder!
    const FileName = files[0];

    const geneName = FileName.split('_')[0];
    const FilePath = '../../data/test_contigs/patient_1/' + FileName;
    const DNA = parseFasta(FilePath);

    GeneSequences.push({
        gene: geneName,
        sequenceData: DNA
    });*/


    const payload = {
        patientID: "patient_1",
        sequences: GeneSequences
    }

    return payload;

}
console.log("Sending off data")
fetch('http://localhost:3000/api/analyze_patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getPatientDNA())
})
    .then(response => response.json())
    .then(data => {
        console.log("Server sent this message");
        console.log(JSON.stringify(data, null, 2))
    }).catch(error => console.error("Not delivered", error.message))