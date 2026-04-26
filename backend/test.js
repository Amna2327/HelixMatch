const payload = {
    patientID: "PT_123",
    sequences: [
        { gene: "CFTR_F508", sequenceData: "ATTTCATTCTGTTCTCAGTTTTCCTGGATTATGCCTGGC" },//correct
        { gene: "HBB", sequenceData: "hasghgasyu" },//wrong sequence
        { gene: "Fake", sequenceData: "csds" }//fake gene
    ]
};

console.log("Sending off data")
fetch('http://localhost:3000/api/analyze_patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
    .then(response => response.json())
    .then(data => {
        console.log("Server sent this message");
        console.log(data)
    }).catch(error => console.error("Not delivered", error.message))