
// ==================== GLOBAL STATE ====================
let state = {
    sequence: '',
    startPos: 0,
    endPos: 100,
    // scene: null,
    // camera: null,
    // renderer: null,
    // controls: null,
    // dnaHelix: null,
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

// // Initialize on load
// window.addEventListener('load', () => {
//     initScene();
// });

// function initScene() {
//     const canvas = document.getElementById('canvas3d');
    
//     if (state.renderer) {
//         state.renderer.dispose();
//     }

//     state.scene = new THREE.Scene();
    
//     // Add background gradient
//     const canvas_bg = document.createElement('canvas');
//     canvas_bg.width = 256;
//     canvas_bg.height = 256;
//     const ctx = canvas_bg.getContext('2d');
    
//     if (document.body.classList.contains('dark-mode')) {
//         const gradient = ctx.createLinearGradient(0, 0, 256, 256);
//         gradient.addColorStop(0, '#0a1428');
//         gradient.addColorStop(1, '#1a2a4a');
//         ctx.fillStyle = gradient;
//     } else {
//         const gradient = ctx.createLinearGradient(0, 0, 256, 256);
//         gradient.addColorStop(0, '#ffffff');
//         gradient.addColorStop(1, '#f8f9fa');
//         ctx.fillStyle = gradient;
//     }
//     ctx.fillRect(0, 0, 256, 256);
    
//     const bgTexture = new THREE.CanvasTexture(canvas_bg);
//     state.scene.background = bgTexture;

//     state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//     state.camera.position.set(0, 0, 27);

//     state.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
//     state.renderer.setSize(window.innerWidth, window.innerHeight);
//     state.renderer.setPixelRatio(window.devicePixelRatio);


//     // Lighting
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
//     state.scene.add(ambientLight);

//     const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
//     directionalLight.position.set(10, 10, 10);
//     state.scene.add(directionalLight);

//     // Simple orbit controls
//     setupControls();

//     // Animation loop
//     function animate() {
//         requestAnimationFrame(animate);
        
//         if (state.dnaHelix) {
//             // state.dnaHelix.rotation.x += 0.001;
//             state.dnaHelix.rotation.y += 0.009;
//         }
        
//         state.renderer.render(state.scene, state.camera);
//     }
//     animate();

//     window.addEventListener('resize', () => {
//         state.camera.aspect = window.innerWidth / window.innerHeight;
//         state.camera.updateProjectionMatrix();
//         state.renderer.setSize(window.innerWidth, window.innerHeight);
//     });
// }

// function setupControls() {
//     document.addEventListener('mousemove', (e) => {
//         if (e.buttons === 1) {

//             //rotate helix on its axis 

//             const deltaX = e.movementX * 0.01;
//             const deltaY = e.movementY * 0.01;
            
//             if (state.dnaHelix) {
//                 state.dnaHelix.rotation.y += deltaX;
//                 state.dnaHelix.rotation.z += deltaY;
//             }
//         }
//     });

//     document.addEventListener('wheel', (e) => {
//         e.preventDefault();
//         state.camera.position.z += e.deltaY * 0.05;
//         state.camera.position.z = Math.max(10, Math.min(100, state.camera.position.z));
//     }, { passive: false });
// }

// function createDNAHelix(sequence, mutations = []) {
//     // Remove old helix
//     if (state.dnaHelix) {
//         state.scene.remove(state.dnaHelix);
//     }

//     state.dnaHelix = new THREE.Group();

//     const helixRadius = 2;
//     const helixHeight = 0.3;
//     const numSteps = sequence.length;

//     // Color mapping based on theme
//     const isDark = document.body.classList.contains('dark-mode');
//     const normalColor = isDark ? 0x00d4ff : 0xff8c42;
//     const mutationColor = 0xff3366;

//     // Create strand 1
//     const strand1 = new THREE.Group();
//     for (let i = 0; i < numSteps; i++) {
//         const angle = (i / numSteps) * Math.PI * 4;
//         const x = Math.cos(angle) * helixRadius;
//         const y = i * helixHeight;
//         const z = Math.sin(angle) * helixRadius;

//         const isMutation = mutations.some(m => m.index === i || state.problemIndices.has(i));
//         const color = isMutation ? mutationColor : normalColor;

//         const geometry = new THREE.SphereGeometry(0.3, 8, 8);
//         const material = new THREE.MeshStandardMaterial({
//             color: color,
//             emissive: isMutation ? mutationColor : 0x000000,
//             emissiveIntensity: isMutation ? 0.5 : 0,
//             transparent: true,
//             opacity: 0.8
//         });

//         const nucleotide = new THREE.Mesh(geometry, material);
//         nucleotide.position.set(x, y, z);
//         nucleotide.userData = { index: i, isMutation };
//         strand1.add(nucleotide);
//     }
//     state.dnaHelix.add(strand1);

//     // Create strand 2 (offset)
//     const strand2 = new THREE.Group();
//     for (let i = 0; i < numSteps; i++) {
//         const angle = (i / numSteps) * Math.PI * 4 + Math.PI;
//         const x = Math.cos(angle) * helixRadius;
//         const y = i * helixHeight;
//         const z = Math.sin(angle) * helixRadius;

//         const isMutation = mutations.some(m => m.index === i || state.problemIndices.has(i));
//         const color = isMutation ? mutationColor : normalColor;

//         const geometry = new THREE.SphereGeometry(0.3, 8, 8);
//         const material = new THREE.MeshStandardMaterial({
//             color: color,
//             emissive: isMutation ? mutationColor : 0x000000,
//             emissiveIntensity: isMutation ? 0.5 : 0,
//             transparent: true,
//             opacity: 0.8
//         });

//         const nucleotide = new THREE.Mesh(geometry, material);
//         nucleotide.position.set(x, y, z);
//         nucleotide.userData = { index: i, isMutation };
//         strand2.add(nucleotide);
//     }
//     state.dnaHelix.add(strand2);

//     // Add connecting bonds
//     const bondGeometry = new THREE.BufferGeometry();
//     const bondPositions = [];
//     const bondColors = [];

//     for (let i = 0; i < numSteps; i++) {
//         const angle1 = (i / numSteps) * Math.PI * 4;
//         const angle2 = angle1 + Math.PI;
//         const y = i * helixHeight;

//         const x1 = Math.cos(angle1) * helixRadius;
//         const z1 = Math.sin(angle1) * helixRadius;
//         const x2 = Math.cos(angle2) * helixRadius;
//         const z2 = Math.sin(angle2) * helixRadius;

//         bondPositions.push(x1, y, z1);
//         bondPositions.push(x2, y, z2);

//         const isMutation = state.problemIndices.has(i);
//         const color = isMutation ? new THREE.Color(mutationColor) : new THREE.Color(normalColor);
//         bondColors.push(color.r, color.g, color.b);
//         bondColors.push(color.r, color.g, color.b);
//     }

//     bondGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bondPositions), 3));
//     bondGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bondColors), 3));

//     const bondMaterial = new THREE.LineBasicMaterial({
//         vertexColors: true,
//         transparent: true,
//         opacity: 0.4,
//         linewidth: 2
//     });

//     const bonds = new THREE.LineSegments(bondGeometry, bondMaterial);
//     state.dnaHelix.add(bonds);

//     state.scene.add(state.dnaHelix);

//     // Center the helix
//     state.dnaHelix.position.set(-(numSteps * helixHeight) / 4, -(numSteps * helixHeight) / 2, 0);
    
//     // ADD THIS LINE:
//     console.log('Canvas size:', window.innerWidth, window.innerHeight);
// }

// function highlightIn3D(index) {
//     if (!state.dnaHelix) return;

//     state.dnaHelix.children[0].children.forEach((mesh, i) => {
//         if (i === index) {
//             mesh.material.emissiveIntensity = 1;
//             mesh.scale.set(1.3, 1.3, 1.3);
//         } else {
//             mesh.material.emissiveIntensity = mesh.userData.isMutation ? 0.5 : 0;
//             mesh.scale.set(1, 1, 1);
//         }
//     });

//     state.dnaHelix.children[1].children.forEach((mesh, i) => {
//         if (i === index) {
//             mesh.material.emissiveIntensity = 1;
//             mesh.scale.set(1.3, 1.3, 1.3);
//         } else {
//             mesh.material.emissiveIntensity = mesh.userData.isMutation ? 0.5 : 0;
//             mesh.scale.set(1, 1, 1);
//         }
//     });
// }

// function loadAndVisualize() {
//     if (!state.sequence) {
//         alert('Please load a DNA sequence first');
//         return;
//     }

//     const start = parseInt(document.getElementById('startPos').value) || 0;
//     const end = parseInt(document.getElementById('endPos').value) || 100;

//     if (start >= end || start < 0 || end > state.sequence.length) {
//         alert('Invalid range');
//         return;
//     }

//     state.startPos = start;
//     state.endPos = end;

//     document.getElementById('info-range').textContent = `${start}-${end}`;

//     const subsequence = state.sequence.substring(start, end);
//     const relevantMutations = state.mutations
//         .filter(m => m.position >= start && m.position < end)
//         .map(m => ({ ...m, index: m.position - start }));

//     document.getElementById('loadingIndicator').classList.add('active');

//     setTimeout(() => {
//         createDNAHelix(subsequence, relevantMutations);
//         updateSequenceDisplay();
//         document.getElementById('loadingIndicator').classList.remove('active');
//     }, 300);
// }

// function resetView() {
//     state.sequence = '';
//     state.mutations = [];
//     state.problemIndices.clear();
//     document.getElementById('fileInput').value = '';
//     document.getElementById('startPos').value = '0';
//     document.getElementById('endPos').value = '100';
//     document.getElementById('sequenceDisplay').innerHTML = '';
//     document.getElementById('mutationInfo').innerHTML = 'Load a sequence to detect mutations.';
//     document.getElementById('info-length').textContent = '0 bp';
//     document.getElementById('info-mutations').textContent = '0';
//     document.getElementById('info-range').textContent = '-';
    
//     if (state.dnaHelix) {
//         state.scene.remove(state.dnaHelix);
//         state.dnaHelix = null;
//     }
// }
