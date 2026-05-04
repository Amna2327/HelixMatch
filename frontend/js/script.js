// ASSIGN PATIENT ID TO each file upload (file 1 = patient 1, file 2 = patient 2, etc) since we havent thought of creating a patient database for thorough data
// as the .fasta files are uploaded, assign ids to threadName, they go in as the payload ot the api (and will be used as indices to track gene files. )
// as the analyze patients is called, the fasta files are uploadeed to backend, and resuts are returned. display them in next Content with a create PDF Button from pdfKit
const PORT = 3000;

// ===== STATE MANAGEMENT =====
const state = {
    files: [],
    analysisResults: null,
    patientID: null
};

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

// Set active nav link based on current page
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

// ===== FILE UPLOAD HANDLING (Only on index.html) =====
const fileInput = document.getElementById('fileInput');
const uploadedFilesDiv = document.getElementById('uploadedFiles');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
            if (file.name.match(/\.(fasta|fa|txt)$/i)) {
                state.files.push(file);
            } else {
                showError('Invalid file format. Please upload FASTA files only.');
            }
        });
        renderFileList();
        analyzeBtn.disabled = state.files.length === 0;
    });

    clearBtn.addEventListener('click', () => {
        state.files = [];
        fileInput.value = '';
        uploadedFilesDiv.innerHTML = '';
        analyzeBtn.disabled = true;
        document.getElementById('resultsSection').style.display = 'none';
        hideError();
        hideSuccess();
    });

    analyzeBtn.addEventListener('click', async () => {
        if (state.files.length === 0) {
            showError('Please upload at least one FASTA file.');
            return;
        }

        analyzeBtn.disabled = true;
        hideError();
        hideSuccess();

        try {
            const payload = await prepareAnalysisPayload();
            state.patientID = payload.patientID;
            

            const response = await fetch(`http://localhost:${PORT}/api/analyze_patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const data = await response.json();
            state.analysisResults = data;
            renderResults(data);
            showSuccess(`Analysis complete for ${state.files.length} file(s).`);
            document.getElementById('resultsSection').style.display = 'block';

        } catch (error) {
            showError(`Analysis failed: ${error.message}`);
            console.error('Analysis error:', error);
        } finally {
            analyzeBtn.disabled = false;
        }
    });

    document.getElementById('generatePdfBtn').addEventListener('click', async () => {
        if (!state.analysisResults) {
            showError('No analysis results to export.');
            return;
        }
        
        try {
            generateClientPDF(state.analysisResults);
            showSuccess('PDF report generated successfully!');
        } catch (error) {
            showError(`PDF generation failed: ${error.message}`);
            console.error('PDF error:', error);
        }
    });
}

// ===== FILE HANDLING FUNCTIONS =====
function renderFileList() {
    uploadedFilesDiv.innerHTML = state.files.map((file, index) => `
        <div class="file-item">
            <span class="file-item-name">📄 ${file.name}</span>
            <button class="file-item-remove" onclick="removeFile(${index})">Remove</button>
        </div>
    `).join('');
}

function removeFile(index) {
    state.files.splice(index, 1);
    renderFileList();
    analyzeBtn.disabled = state.files.length === 0;
}

async function prepareAnalysisPayload() {
    const sequences = [];
    
    for (let i = 0; i < state.files.length; i++) {
        const fileContent = await readFile(state.files[i]);
        const sequenceData = parseFasta(fileContent);
        
        if (!sequenceData) {
            throw new Error(`Failed to parse ${state.files[i].name}`);
        }

        sequences.push({
            gene: extractGeneName(state.files[i].name),
            sequenceData: sequenceData
        });
    }

    return {
        patientID: `PATIENT_${Date.now()}`, //current time stamp in ms is alloted to be the patient ID. Kinda random but it works as a good stub \(.g.)/ 
        sequences: sequences
    };
}

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

function extractGeneName(filename) {
    return filename.replace(/\.(fasta|fa|txt)$/i, '').replace(/_patient$/, '');
}

// ===== RESULTS RENDERING =====
function renderResults(data) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    if (!data.report || data.report.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        return;
    }

    document.getElementById('emptyState').style.display = 'none';

    data.report.forEach((geneReport, reportIndex) => {
        if (geneReport.status === 'rejected') {
            container.innerHTML += `
                <div class="result-card">
                    <div class="result-card-header">
                        <div>
                            <div class="result-card-title">${geneReport.gene}</div>
                        </div>
                        <div class="result-card-gene">REJECTED</div>
                    </div>
                    <div class="status-low" style="display: inline-block; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.85rem;">
                        ${geneReport.message}
                    </div>
                </div>
            `;
        } else {
            geneReport.resultReport.forEach((variant, variantIndex) => {
                const statusClass = getStatusClass(variant.diagnostic_Status);
                container.innerHTML += `
                    <div class="result-card" onclick="openDetailModal(${reportIndex}, ${variantIndex})">
                        <div class="result-card-header">
                            <div>
                                <div class="result-card-title">${variant.Variant_name}</div>
                                <div style="font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">${geneReport.gene}</div>
                            </div>
                            <div class="result-card-gene">${geneReport.gene}</div>
                        </div>
                        <div class="result-card-status ${statusClass}">${variant.diagnostic_Status}</div>
                        <div class="result-card-score">${variant.confidenceScore.toFixed(2)}%</div>
                        <div class="result-card-footer">Click for details</div>
                    </div>
                `;
            });
        }
    });
}

function getStatusClass(status) {
    if (status.includes('Confirmed')) return 'status-confirmed';
    if (status.includes('Suspicious')) return 'status-suspicious';
    return 'status-low';
}

// ===== DETAIL MODAL =====
function openDetailModal(reportIndex, variantIndex) {
    const report = state.analysisResults.report[reportIndex];
    const variant = report.resultReport[variantIndex];
    
    document.getElementById('modalTitle').textContent = variant.Variant_name;
    
    const detailsHTML = `
        <div class="modal-detail">
            <div class="modal-detail-label">Gene</div>
            <div class="modal-detail-value">${report.gene}</div>
        </div>
        <div class="modal-detail">
            <div class="modal-detail-label">Diagnostic Status</div>
            <div class="modal-detail-value">${variant.diagnostic_Status}</div>
        </div>
        <div class="modal-detail">
            <div class="modal-detail-label">Confidence Score</div>
            <div class="modal-detail-value" style="font-size: 1.5rem; font-weight: bold; color: var(--primary-blue);">
                ${variant.confidenceScore.toFixed(2)}%
            </div>
        </div>
        <div class="modal-detail">
            <div class="modal-detail-label">Variant Name</div>
            <div class="modal-detail-value">${variant.Variant_name}</div>
        </div>
    `;
    
    document.getElementById('modalBody').innerHTML = detailsHTML;
    document.getElementById('detailModal').classList.add('active');
}

const modalClose = document.getElementById('modalClose');
if (modalClose) {
    modalClose.addEventListener('click', () => {
        document.getElementById('detailModal').classList.remove('active');
    });
}

const detailModal = document.getElementById('detailModal');
if (detailModal) {
    detailModal.addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') {
            document.getElementById('detailModal').classList.remove('active');
        }
    });
}

// ===== PDF GENERATION =====
function generateClientPDF(analysisResults) {
    const printWindow = window.open('', '', 'width=1000,height=800');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Helix Match Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 2cm; color: #333; }
                .header { text-align: center; margin-bottom: 2cm; border-bottom: 2px solid #2563eb; padding-bottom: 1cm; }
                .header h1 { color: #2563eb; margin: 0; }
                .header p { margin: 0.5cm 0 0 0; color: #666; }
                .section { margin-bottom: 1.5cm; }
                .section-title { color: #2563eb; font-weight: bold; font-size: 1.2em; margin-bottom: 0.5cm; border-bottom: 1px solid #dbeafe; padding-bottom: 0.3cm; }
                .result-item { background-color: #f9fafb; padding: 1cm; margin-bottom: 0.5cm; border-left: 3px solid #2563eb; }
                .result-item-title { font-weight: bold; color: #2563eb; }
                .result-item-detail { margin-left: 0.5cm; margin-top: 0.3cm; font-size: 0.9em; }
                .status { display: inline-block; padding: 0.2cm 0.4cm; border-radius: 3px; font-size: 0.85em; font-weight: bold; margin-bottom: 0.3cm; }
                .status-confirmed { background-color: #d1fae5; color: #065f46; }
                .status-suspicious { background-color: #fef3c7; color: #92400e; }
                .status-low { background-color: #fee2e2; color: #7f1d1d; }
                .score { color: #2563eb; font-size: 1.3em; font-weight: bold; margin: 0.3cm 0; }
                .footer { margin-top: 2cm; padding-top: 1cm; border-top: 1px solid #e5e7eb; font-size: 0.85em; color: #666; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🧬 Helix Match Analysis Report</h1>
                <p>Patient ID: ${analysisResults.patientID}</p>
                <p>Generated: ${new Date().toLocaleString()}</p>
            </div>

            ${analysisResults.report.map(report => `
                <div class="section">
                    <div class="section-title">Gene: ${report.gene}</div>
                    <div style="margin-bottom: 0.5cm; color: #666;">Status: ${report.status}</div>
                    ${report.status === 'rejected' 
                        ? `<div style="color: #ef4444; font-weight: bold;">${report.message}</div>`
                        : `
                            <div style="margin-bottom: 1cm;">
                                <strong>Highest Disease Match(es):</strong>
                                ${report.HighestDiseaseMatches.join(', ') || 'None'}
                            </div>
                            ${report.resultReport.map(variant => `
                                <div class="result-item">
                                    <div class="result-item-title">${variant.Variant_name}</div>
                                    <div class="result-item-detail">
                                        <div class="status status-${getStatusClassSimple(variant.diagnostic_Status)}">${variant.diagnostic_Status}</div>
                                        <div class="score">Confidence: ${variant.confidenceScore.toFixed(2)}%</div>
                                    </div>
                                </div>
                            `).join('')}
                        `
                    }
                </div>
            `).join('')}

            <div class="footer">
                <p>This report was generated by Helix Match. Please review results with a qualified healthcare professional.</p>
                <p>Report generated on ${new Date().toLocaleDateString()}</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

function getStatusClassSimple(status) {
    if (status.includes('Confirmed')) return 'confirmed';
    if (status.includes('Suspicious')) return 'suspicious';
    return 'low';
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
        setTimeout(hideSuccess, 4000);
    }
}

function hideSuccess() {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.classList.remove('show');
    }
}