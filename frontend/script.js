const PORT = 3000;

// ===== STATE MANAGEMENT =====
const state = {
    files: [],
    analysisResults: [],
    patientID: null,
    geneLabels: {}, // 🧬 Store loaded gene labels from JSON as object with descriptions & variants
    filesDiseases: {} // 🧬 Map files to their selected diseases {fileName: disease}
};

// ===== LOAD GENE LABELS FROM JSON =====
async function loadGeneLabels() {
    try {
        const response = await fetch('/data/gene_labels.json');
        if (!response.ok) throw new Error('Failed to load gene labels');
        const data = await response.json();
        state.geneLabels = data;
        console.log('✅ Loaded gene labels:', Object.keys(state.geneLabels));
    } catch (error) {
        console.error('❌ Error loading gene labels:', error);
        // 🔴 FALLBACK: Hardcoded labels if fetch fails
        state.geneLabels = {
            'CFTR': { description: 'Cystic Fibrosis', variants: ['CFTR_G542X', 'CFTR_W1282X', 'CFTR_F508'] },
            'HBB': { description: 'Sickle Cell', variants: ['HBB'] },
            'HTT': { description: 'Huntington', variants: ['HTT'] },
            'PKU': { description: 'Phenylketonuria', variants: ['PKU_PAH'] },
            'Taysachs': { description: 'Tay-Sachs', variants: ['Taysachs_HEXA'] }
        };
        console.log('✅ Using fallback gene labels');
    }
}

// Call on page load
loadGeneLabels();

// ===== PAGE NAVIGATION =====
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        if (href && href !== '#') {
            window.location.href = href;
        }
    });
});

function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

setActiveNavLink();

// ===== FILE UPLOAD HANDLING =====
const fileInput = document.getElementById('fileInput');
const uploadedFilesDiv = document.getElementById('uploadedFiles');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const fileCountDisplay = document.getElementById('fileCount');
const emptyFilesMessage = document.getElementById('emptyFilesList');
const filesSection = document.querySelector('.files-section');

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
            if (file.name.match(/\.(fasta|fa|txt)$/i)) {
                // 🧬 Initialize file with no disease selected
                state.files.push(file);
                state.filesDiseases[file.name] = null;
            } else {
                showError('Invalid file format. Please upload FASTA files only.');
            }
        });
        renderFileList();
        updateFileCount();
    });

    clearBtn.addEventListener('click', () => {
        state.files = [];
        state.filesDiseases = {};
        state.analysisResults = [];
        fileInput.value = '';
        uploadedFilesDiv.innerHTML = '';
        analyzeBtn.disabled = true;
        document.getElementById('resultsSection').style.display = 'none';
        updateFileCount();
        hideError();
        hideSuccess();
        filesSection.classList.remove('error-border');
    });

    analyzeBtn.addEventListener('click', async () => {
        if (state.files.length === 0) {
            showError('Please upload at least one FASTA file.');
            return;
        }

        // CHECK if all files have disease labels selected
        const missingLabels = state.files.filter(file => !state.filesDiseases[file.name]);
        if (missingLabels.length > 0) {
            filesSection.classList.add('error-border');
            showError(' Select a disease label for all files before analyzing.');
            return;
        }

        filesSection.classList.remove('error-border');
        analyzeBtn.disabled = true;
        hideError();
        hideSuccess();

        try {
            state.analysisResults = [];
            state.patientID = `PATIENT_${Date.now()}`;
            
            // 🚀 Make ONE API call PER FILE (not one call for all files)
            const analysisPromises = state.files.map((file, index) => 
                analyzeFile(file, index)
            );

            await Promise.all(analysisPromises);
            
            renderResults();
            showSuccess(` Analysis complete for ${state.files.length} file(s).`);
            document.getElementById('resultsSection').style.display = 'block';

        } catch (error) {
            showError(` Analysis failed: ${error.message}`);
            console.error('Analysis error:', error);
        } finally {
            analyzeBtn.disabled = false;
        }
    });

    document.getElementById('generatePdfBtn').addEventListener('click', async () => {
        if (state.analysisResults.length === 0) {
            showError('No analysis results to export.');
            return;
        }
        
        try {
            generateClientPDF();
            showSuccess('✅ PDF report generated successfully!');
        } catch (error) {
            showError(`PDF generation failed: ${error.message}`);
            console.error('PDF error:', error);
        }
    });
}

// ===== ANALYZE SINGLE FILE =====
// Each file gets its own API call with its own geneLabel
async function analyzeFile(file, index) {
    const fileContent = await readFile(file);
    const sequenceData = parseFasta(fileContent);
    const geneLabel = state.filesDiseases[file.name];

    if (!sequenceData) {
        throw new Error(`Failed to parse ${file.name}`);
    }

    if (!geneLabel) {
        throw new Error(`No disease label selected for ${file.name}`);
    }

    // 📝 Build payload for THIS SINGLE FILE
    // geneLabel goes at TOP LEVEL, not inside sequences
    const payload = {
        patientID: state.patientID,
        geneLabel: geneLabel,           // ← TOP LEVEL (required by backend)
        sequences: [
            {
                fileName: file.name,
                sequenceData: sequenceData
            }
        ]
    };

    console.log(`🔍 Analyzing ${file.name} for ${geneLabel}...`);

    const response = await fetch(`http://localhost:${PORT}/api/analyze_patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 📊 Collect results from each file
    state.analysisResults.push({
        fileName: file.name,
        geneLabel: geneLabel,
        report: data.report[0] // 🔑 First (only) report from this API call
    });

    console.log(`✅ ${file.name} analyzed successfully`);
}

// ===== FILE LIST RENDERING =====
// Generate disease options ONCE before rendering files
function renderFileList() {
    if (state.files.length === 0) {
        uploadedFilesDiv.innerHTML = '';
        emptyFilesMessage.style.display = 'block';
        return;
    }

    emptyFilesMessage.style.display = 'none';
    
    // Generate disease options from geneLabels object BEFORE the map
    const diseaseOptions = Object.keys(state.geneLabels)
        .map(label => `<option value="${label}">${label} - ${state.geneLabels[label].description}</option>`)
        .join('');
    
    uploadedFilesDiv.innerHTML = state.files.map((file, index) => {
        const selectedDisease = state.filesDiseases[file.name];

        return `
            <div class="file-item">
                <!-- 📍 File name on left -->
                <span class="file-item-name">📄 ${file.name}</span>
                
                <!-- 📍 Disease dropdown in middle (next to remove button) -->
                <select class="file-item-disease-select" onchange="updateFileDiseaseLabel('${file.name}', this.value)">
                    <option value="">-- Select disease --</option>
                    ${diseaseOptions}
                </select>
                
                <!-- 📍 Remove button on right -->
                <button class="file-item-remove" onclick="removeFile(${index})">✕ Remove</button>
            </div>
        `;
    }).join('');
}

// Update disease label and clear error state
function updateFileDiseaseLabel(fileName, diseaseLabel) {
    state.filesDiseases[fileName] = diseaseLabel || null;
    filesSection.classList.remove('error-border');
    hideError();
}

function updateFileCount() {
    fileCountDisplay.textContent = `${state.files.length} file${state.files.length !== 1 ? 's' : ''}`;
}

function removeFile(index) {
    const fileName = state.files[index].name;
    delete state.filesDiseases[fileName];
    state.files.splice(index, 1);
    renderFileList();
    updateFileCount();
}

// ===== FILE READING =====
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsText(file);
    });
}

function parseFasta(content) {
    const lines = content.split('\n').filter(line => line.trim());
    let sequence = '';
    
    for (const line of lines) {
        if (!line.startsWith('>')) {
            sequence += line.trim();
        }
    }
    
    return sequence.toUpperCase() || null;
}

// ===== RESULTS RENDERING (COMBINED TABLE) =====
function renderResults() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    if (state.analysisResults.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        return;
    }

    document.getElementById('emptyState').style.display = 'none';

    let tableHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>File Name</th>
                    <th>Disease Label</th>
                    <th>Status</th>
                    <th>Variant Detected</th>
                    <th>Match Value</th>
                    <th>Recommendations</th>
                </tr>
            </thead>
            <tbody>
    `;

    state.analysisResults.forEach((result) => {
        const report = result.report;
        
        if (report.status === 'rejected') {
            tableHTML += `
                <tr>
                    <td>${result.fileName}</td>
                    <td>${result.geneLabel}</td>
                    <td><span class="status-badge status-rejected">Rejected</span></td>
                    <td>N/A</td>
                    <td>N/A</td>
                    <td>${report.message}</td>
                </tr>
            `;
        } else if (report.status === 'Accepted') {
            // Extract highest variant from resultReport array
            const highestVariant = report.resultReport && report.resultReport.length > 0 
                ? report.resultReport.reduce((prev, current) => 
                    (prev.confidenceScore > current.confidenceScore) ? prev : current
                  )
                : null;

            // Pick Variant_name from backend response
            const variantDetected = highestVariant ? highestVariant.Variant_name : 'N/A';
            
            // Pick confidenceScore from backend response
            const matchValue = highestVariant ? highestVariant.confidenceScore.toFixed(2) : '0.00';
            const matchClass = matchValue > 70 ? 'high' : matchValue > 40 ? 'medium' : 'low';

            tableHTML += `
                <tr>
                    <td>${result.fileName}</td>
                    <td>${result.geneLabel}</td>
                    <td><span class="status-badge status-confirmed">Accepted</span></td>
                    <td><strong>${variantDetected}</strong></td>
                    <td><span class="match-value ${matchClass}">${matchValue}%</span></td>
                    <td>${report.message}</td>
                </tr>
            `;
        }
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// ===== PDF GENERATION =====
function generateClientPDF() {
    const printWindow = window.open('', '', 'width=1000,height=800');
    
    let reportRows = '';
    
    state.analysisResults.forEach((result) => {
        const report = result.report;
        const statusBadge = report.status === 'rejected' 
            ? '<span style="color: #7f1d1d;">Rejected</span>' 
            : '<span style="color: #065f46;">Accepted</span>';
        
        // Extract variant from resultReport
        const highestVariant = report.status === 'Accepted' && report.resultReport?.length > 0
            ? report.resultReport.reduce((prev, current) => 
                (prev.confidenceScore > current.confidenceScore) ? prev : current
              )
            : null;
        
        const variantDetected = highestVariant ? highestVariant.Variant_name : 'N/A';
        const matchValue = report.status === 'Accepted' && highestVariant
            ? highestVariant.confidenceScore.toFixed(2)
            : 'N/A';

        reportRows += `
            <tr>
                <td style="padding: 0.5cm; border-bottom: 1px solid #e5e7eb;">${result.fileName}</td>
                <td style="padding: 0.5cm; border-bottom: 1px solid #e5e7eb;">${result.geneLabel}</td>
                <td style="padding: 0.5cm; border-bottom: 1px solid #e5e7eb;">${statusBadge}</td>
                <td style="padding: 0.5cm; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${variantDetected}</td>
                <td style="padding: 0.5cm; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #2563eb;">${matchValue}%</td>
                <td style="padding: 0.5cm; border-bottom: 1px solid #e5e7eb;">${report.message}</td>
            </tr>
        `;
    });

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Helix Match Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 2cm; color: #333; }
                .header { text-align: center; margin-bottom: 2cm; border-bottom: 2px solid #2563eb; padding-bottom: 1cm; }
                .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
                .header p { margin: 0.5cm 0 0 0; color: #666; }
                .section { margin-bottom: 1.5cm; }
                .section-title { color: #2563eb; font-weight: bold; font-size: 1.1em; margin-bottom: 0.5cm; border-bottom: 1px solid #dbeafe; padding-bottom: 0.3cm; }
                table { width: 100%; border-collapse: collapse; margin-top: 0.5cm; }
                thead { background-color: #f9fafb; border-bottom: 2px solid #2563eb; }
                th { padding: 0.5cm; text-align: left; font-weight: bold; color: #2563eb; }
                td { padding: 0.5cm; }
                .footer { margin-top: 2cm; padding-top: 1cm; border-top: 1px solid #e5e7eb; font-size: 0.85em; color: #666; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🧬 Helix Match Analysis Report</h1>
                <p>Patient ID: ${state.patientID}</p>
                <p>Generated: ${new Date().toLocaleString()}</p>
            </div>

            <div class="section">
                <div class="section-title">Analysis Results Summary</div>
                <table>
                    <thead>
                        <tr>
                            <th>File Name</th>
                            <th>Disease Label</th>
                            <th>Status</th>
                            <th>Variant Detected</th>
                            <th>Match Value</th>
                            <th>Recommendations</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportRows}
                    </tbody>
                </table>
            </div>

            <div class="footer">
                <p>This report was generated by Helix Match. Please review results with a qualified healthcare professional.</p>
                <p>© 2026 Helix Match. All rights reserved.</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// ===== MESSAGE HANDLERS =====
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    }
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.classList.remove('show');
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.add('show');
        // success message shown for 4 s
        setTimeout(hideSuccess, 4000);
    }
}

function hideSuccess() {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.classList.remove('show');
    }
}