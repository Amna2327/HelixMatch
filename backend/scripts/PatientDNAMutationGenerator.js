const fs = require('fs');
const path = require('path');

/**
 * 1. Read and clean the FASTA file
 */
function parseFasta(filePath) {
    const content = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    const header = content[0];
    // Strip out all newlines to make the DNA one continuous string
    const sequence = content.slice(1).join('').replace(/\s/g, '');
    return { header, sequence };
}

/**
 * 2. Write the new mutated sequence back into FASTA format
 */
function writeFasta(fileName, header, sequence) {
    // Break the sequence back down into 80-character lines (standard FASTA format)
    const formattedSeq = sequence.match(/.{1,80}/g).join('\n');

    // Updated output path to put them in the reference_mutations folder
    const outputPath = path.join(__dirname, '../../data/reference_mutations', fileName);

    // Append a tag to the header so you know it's synthetic
    fs.writeFileSync(outputPath, `${header}_SYNTHETIC_DISEASED\n${formattedSeq}\n`);
    console.log(`✅ Generated: ${fileName}`);
}

/**
 * 3. The Digital CRISPR (Mutation Engine)
 */
function mutateSequence(sequence, diseaseType) {
    // Because you downloaded +/- 250bp, the target is always at the 251st letter (Index 250)
    const M_IDX = 250;

    switch (diseaseType) {
        case 'CFTR_delF508':
            // Deletion: Skip the 3 letters 'CTT' at the mutation index
            return sequence.slice(0, M_IDX) + sequence.slice(M_IDX + 3);

        case 'CFTR_G542X':
        case 'CFTR_W1282X':
        case 'PAH_PKU':
            // Point Mutation: Replace 1 letter with 'T' (or 'A' for W1282X)
            const subNucleotide = diseaseType === 'CFTR_W1282X' ? 'A' : 'T';
            return sequence.slice(0, M_IDX) + subNucleotide + sequence.slice(M_IDX + 1);

        case 'HBB_SickleCell':
            // Point Mutation: Replace A with T
            return sequence.slice(0, M_IDX) + 'T' + sequence.slice(M_IDX + 1);

        case 'HEXA_TaySachs':
            // Insertion: Duplicate the 'TATC' block
            return sequence.slice(0, M_IDX) + 'TATCTATC' + sequence.slice(M_IDX + 4);

        case 'HTT_Huntingtons':
            // Expansion: Force 45 'CAG' repeats into the tract
            return sequence.slice(0, M_IDX) + 'CAG'.repeat(45) + sequence.slice(M_IDX);

        default:
            console.log(`Warning: Unknown disease type ${diseaseType}`);
            return sequence;
    }
}

// --- RUN THE GENERATOR ---

const filesToProcess = [
    {
        input: '../../data/healthyDNAsequences/CFTR_F508_healthy.fasta',
        output: 'CFTR_F508_patient.fasta',
        type: 'CFTR_delF508'
    },
    {
        input: '../../data/healthyDNAsequences/CFTR_G542X_healthy.fasta',
        output: 'CFTR_G542X_patient.fasta',
        type: 'CFTR_G542X'
    },
    {
        input: '../../data/healthyDNAsequences/CFTR_W1282X_healthy.fasta',
        output: 'CFTR_W1282X_patient.fasta',
        type: 'CFTR_W1282X'
    },
    {
        input: '../../data/healthyDNAsequences/HBB_healthy.fasta',
        output: 'HBB_SickleCell_patient.fasta',
        type: 'HBB_SickleCell'
    },
    {
        input: '../../data/healthyDNAsequences/HTT_healthy.fasta',
        output: 'HTT_patient.fasta',
        type: 'HTT_Huntingtons'
    },
    {
        input: '../../data/healthyDNAsequences/PKU_PAH_healthy.fasta',
        output: 'PKU_PAH_patient.fasta',
        type: 'PAH_PKU'
    },
    {
        input: '../../data/healthyDNAsequences/Taysachs_HEXA_healthy.fasta',
        output: 'Taysachs_HEXA_patient.fasta',
        type: 'HEXA_TaySachs'
    }
];
filesToProcess.forEach(job => {
    try {
        const inputPath = path.join(__dirname, job.input);
        const { header, sequence } = parseFasta(inputPath);

        const mutatedDna = mutateSequence(sequence, job.type);
        writeFasta(job.output, header, mutatedDna);
    } catch (err) {
        console.error(`❌ Failed to process ${job.type}: Check if ${job.input} exists.`);
        console.error(`Error details: ${err.message}`); // Added this to help you debug missing files
    }
});