
// ==================== GLOBAL STATE ====================
let state = {
    sequence: '',
    startPos: 0,
    endPos: 100,
    viewer3D: null,
    canvasWidth: 0,
    selectedNucleotide: null,
    mutations: [],
    problemIndices: new Set(),
    theme: 'dark-mode'
};
// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeViewer();
    setupEventListeners();
});

function initializeViewer() {
    const canvas = document.getElementById('canvas3d');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    state.viewer3D = new DNA3DViewer(canvas);
}
function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const themeToggle = document.querySelector('.theme-toggle');

    if (fileInput){
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    if (themeToggle){
        themeToggle.addEventListener('click', toggleTheme);
    }
    window.addEventListener('resize', handleWindowResize);
}

function handleWindowResize() {
    if (state.viewer3D) {
        state.viewer3D.onWindowResize();
    }
}
// ==================== THEME MANAGEMENT ====================
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-mode');
    
    body.classList.remove('dark-mode', 'light-mode');
    body.classList.add(isDark ? 'light-mode' : 'dark-mode');
    
    const icon = document.getElementById('theme-icon');
    icon.textContent = isDark ? '☀️' : '🌙';
    
    state.theme = isDark ? 'light-mode' : 'dark-mode';
    
    if (state.viewer3D){
        state.viewer3D.setTheme(isDark === false);
    }
}

function handleFileUpload(e){
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        let content = event.target.result;

        if (content.includes('>'))
            content = content.split('\n').filter(line => !line.startsWith('>')).join('');

        state.sequence = content.toUpperCase().replace(/[^ATGC]/g, '').trim();

        if (state.sequence.length === 0){
            alert('Invalid DNA sequence in file');
            return;
        }

        document.getElementById('info-length').textContent = `${state.sequence.length} bp`;
        document.getElementById('endPos').value = Math.min(100, state.sequence.length);
        document.getElementById('startPos').value = '0';

        updateSequenceDisplay();
    }
    reader.readAsText(file);
}

// ==================== SEQUENCE OPERATIONS ====================
function updateSequenceDisplay() {
    const start = parseInt(document.getElementById('startPos').value) || 0;
    const end = parseInt(document.getElementById('endPos').value) || 100;
    const subsequence = state.sequence.substring(start, end);
    
    const display = document.getElementById('sequenceDisplay');
    display.innerHTML = '';
    
    for (let i = 0; i < subsequence.length; i++) {
        const nucleotide = subsequence[i];
        const globalIndex = start + i;
        const span = document.createElement('span');
        span.className = 'nucleotide';
        
        if (state.problemIndices.has(globalIndex)) {
            span.classList.add('problem');
            span.addEventListener('click', (e) => selectNucleotide(globalIndex, nucleotide, e));
        }
        
        span.textContent = nucleotide;
        // span.onclick = () => selectNucleotide(globalIndex, nucleotide);
        display.appendChild(span);
    }
}

function selectNucleotide(index, nucleotide, e) {
    // Only for problem nucleotides
    if (!state.problemIndices.has(index)) return;
    // Remove previous selection
    document.querySelectorAll('.nucleotide.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked nucleotide
    e.target.classList.add('selected');
    state.selectedNucleotide = { index, nucleotide };
    
    // Show info and highlight in 3D
    showNucleotideInfo(index, e);
    state.viewer3D.highlightNucleotide(index);
    
}


// deselects problem nucleotides when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('nucleotide')) {
        document.querySelectorAll('.nucleotide.selected').forEach(el => {
            el.classList.remove('selected');
        });
        state.selectedNucleotide = null;
    }
});

function showNucleotideInfo(index, nucleotide, e) {
    const tooltip = document.getElementById('tooltip');
    const info = state.mutations.find(m => m.positions && m.positions.includes(index));
    
    if (!info) return
    tooltip.innerHTML = `
        <strong>${info.disease || 'Unknown Disease'}</strong><br>
        Position ${index + 1}<br>
        Risk: ${info.risk || 'NA'}<br>
        Type: ${info.type || 'NA'}<br>
        Nucleotide: ${nucleotide}<br>
        Severity: ${info.severity || 'NA'}<br>
        ${info.disease ? `<span class="disease-badge">${info.disease}</span>` : 'Normal'}
    `;
    
    tooltip.classList.add('visible');
    tooltip.style.left = event.clientX + 10 + 'px';
    tooltip.style.top = event.clientY + 10 + 'px';
}

// Hide tooltip when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.nucleotide.problem')) {
        document.getElementById('tooltip').classList.remove('visible');
    }
});

async function fetchMutationData(){
    //fetches response from backend by sending input sequence
    //for now we work with a stub
    try{
        const response = await fetch('/mock/mock_response.json');
        if(!response.ok){
            console.error('Response status:', response.status);
            console.error('Response text:', await response.text());
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        processMutationData(data);
    } catch(error){
        console.error('Error fetching mutation data:', error);
        alert('Failed to fetch mutation data. Please try again later.');
        
        console.warn('Using fallback mutation data');
        processMutationData({
            mutations: [
                {
                    positions: [10, 11, 12],
                    disease: "Sample Disease",
                    type: "SMPL",
                    risk: "High",
                    severity: "High"
                }
            ]
        });
    }
}

function processMutationData(data){
    state.mutations = data.mutations || [];
    state.problemIndices.clear();

    data.mutations.forEach(mutation => {
        if (mutation.positions && Array.isArray(mutation.positions)){
            mutation.positions.forEach(pos => {
                state.problemIndices.add(pos);
            })
        }
    });
    document.getElementById('info-mutations').textContent = state.problemIndices.size;
    updateMutationPanel();
}

function updateMutationPanel() {
    const panel = document.getElementById('mutationInfo');
    
    if (state.mutations.length === 0) {
        panel.innerHTML = 'No mutations detected.';
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
    state.mutations.forEach(mut => {
        const positionStr = mut.positions.join(', ');
        html += `
            <div style="padding: 8px; background: var(--bg-secondary); border-left: 3px solid var(--problem); border-radius: 4px;">
                <strong>${mut.disease}</strong><br>
                <small style="opacity: 0.7;">Positions: ${positionStr}</small><br>
                <small style="opacity: 0.7;">Type: ${mut.type} | Risk: ${mut.risk}</small>
            </div>
        `;
    });
    html += '</div>';
    panel.innerHTML = html;
}

// ==================== 3D VISUALIZATION ====================

async function loadAndVisualize() {
    if (!state.sequence) {
        alert('Please load a DNA sequence first');
        return;
    }

    const start = parseInt(document.getElementById('startPos').value) || 0;
    const end = parseInt(document.getElementById('endPos').value) || 100;

    if (start >= end || start < 0 || end > state.sequence.length) {
        alert('Invalid range');
        return;
    }

    state.startPos = start;
    state.endPos = end;
    document.getElementById('info-range').textContent = `${start}-${end}`;

    // Show loading
    document.getElementById('loadingIndicator').classList.add('active');

    try {
        // Fetch mutation data
        await fetchMutationData();
        
        const subsequence = state.sequence.substring(start, end);
        
        // Get relevant problem positions for this range
        const relevantProblems = Array.from(state.problemIndices)
            .filter(pos => pos >= start && pos < end)
            .map(pos => pos - start);
        
        // Create helix
        state.viewer3D.createDNAHelix(subsequence, {
            problemPositions: relevantProblems
        });

        // Update sequence display
        updateSequenceDisplay();
        
    } catch (error) {
        console.error('Error in visualization:', error);
    } finally {
        document.getElementById('loadingIndicator').classList.remove('active');
    }
}

function resetView() {
    state.sequence = '';
    state.mutations = [];
    state.problemIndices.clear();
    state.selectedNucleotide = null;
    
    // Reset form
    document.getElementById('fileInput').value = '';
    document.getElementById('startPos').value = '0';
    document.getElementById('endPos').value = '100';
    
    // Reset display
    document.getElementById('sequenceDisplay').innerHTML = '';
    document.getElementById('mutationInfo').innerHTML = 'Load a sequence to detect mutations.';
    document.getElementById('info-length').textContent = '0 bp';
    document.getElementById('info-mutations').textContent = '0';
    document.getElementById('info-range').textContent = '-';
    
    // Clear 3D view
    if (state.viewer3D) {
        state.viewer3D.clearHelix();
    }
}


// ==================== VIEWER CONTROLS ====================

let isAnimating = true;

function zoomIn() {
    if (state.viewer3D && state.viewer3D.camera) {
        state.viewer3D.camera.position.z -= 2;
        state.viewer3D.camera.position.z = Math.max(10, state.viewer3D.camera.position.z);
    }
}

function zoomOut() {
    if (state.viewer3D && state.viewer3D.camera) {
        state.viewer3D.camera.position.z += 2;
        state.viewer3D.camera.position.z = Math.min(100, state.viewer3D.camera.position.z);
    }
}

function toggleAnimation() {
    isAnimating = !isAnimating;
    const icon = document.getElementById('play-pause-icon');
    icon.textContent = isAnimating ? '⏸' : '▶';
    
    if (state.viewer3D) {
        state.viewer3D.setAutoRotation(isAnimating);
    }
}

function resetViewer() {
    if (state.viewer3D) {
        state.viewer3D.resetView();
        isAnimating = true;
        document.getElementById('play-pause-icon').textContent = '⏸';
        state.viewer3D.setAutoRotation(true);
    }
}
