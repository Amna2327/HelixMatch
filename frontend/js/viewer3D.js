// viewer3d.js
class DNA3DViewer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.dnaHelix = null;
        this.animationId = null;
        this.isAutoRotating = true;
            
        this.initScene();
        this.setupControls();
        this.startAnimation();
    }

    // ───── SCENE SETUP ─────
    initScene() {
        this.scene = new THREE.Scene();
        this._createBackground();

        // Camera – same position/FOV as old version
        this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
        );
        this.camera.position.set(0, 0, 27);

        // Renderer with antialiasing and transparency
        this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Lighting (exactly like old version)
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(10, 10, 10);
        this.scene.add(ambient);
        this.scene.add(directional);
    }

    // Background gradient that matches the current theme
    _createBackground() {
        const isDark = document.body.classList.contains('dark-mode');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 256, 256);

        if (isDark) {
        grad.addColorStop(0, '#0a1428');
        grad.addColorStop(1, '#1a2a4a');
        } else {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#fdeb83');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
    }

    // ───── ANIMATION LOOP (auto‑rotation) ─────
    startAnimation() {
        const autoRotationSpeed = 0.009;
        const animate = () => {
        this.animationId = requestAnimationFrame(animate);

        //   Auto-rotate helix only if enabled
        if (this.dnaHelix && this.isAutoRotating) {
            this.dnaHelix.rotation.y += autoRotationSpeed;
        }

        this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    // ───── MOUSE / TOUCH CONTROLS ─────
    setupControls() {
        // Drag to rotate
        document.addEventListener('mousemove', (e) => {
        if (e.buttons === 1 && this.dnaHelix) {
            this.dnaHelix.rotation.y += e.movementX * 0.01;
            this.dnaHelix.rotation.z += e.movementY * 0.01;
        }
        });
    }

    // ───── BUILD DNA HELIX ─────
    createDNAHelix(sequence, options = {}) {
        const { problemPositions = [] } = options;
        this.clearHelix();  // remove old helix

        this.dnaHelix = new THREE.Group();

        const isDark = document.body.classList.contains('dark-mode');
        const normalColor = isDark ? 0x00d4ff : 0xff8c42;   // cyan / orange
        const mutationColor = 0xff3366;

        const radius = 2;
        const heightStep = 0.3;
        const basesPerTurn = 50;         // number of base pairs per full turn
        const angularStep = (2 * Math.PI) / basesPerTurn; // constant angle increment

        const numSteps = sequence.length;

        // Helper to create a strand
        const makeStrand = (phaseShift) => {
        const strand = new THREE.Group();
        for (let i = 0; i < numSteps; i++) {
            const angle = i * angularStep + phaseShift; // constant angular step instead of a fraction of 4π
            const x = Math.cos(angle) * radius;
            const y = i * heightStep;
            const z = Math.sin(angle) * radius;

            const isMutation = problemPositions.includes(i);
            const color = isMutation ? mutationColor : normalColor;

            const geo = new THREE.SphereGeometry(0.3, 8, 8);
            const mat = new THREE.MeshStandardMaterial({
            color,
            emissive: isMutation ? mutationColor : 0x000000,
            emissiveIntensity: isMutation ? 0.5 : 0,
            transparent: true,
            opacity: 0.8
            });

            const sphere = new THREE.Mesh(geo, mat);
            sphere.position.set(x, y, z);
            sphere.userData = { index: i, isMutation };
            strand.add(sphere);
        }
        return strand;
        };

        // Strand 1 (0 shift), Strand 2 (π shift)
        this.dnaHelix.add(makeStrand(0));
        this.dnaHelix.add(makeStrand(Math.PI));

        // ── Connecting bonds (coloured lines) ──
        const bondPositions = [];
        const bondColors = [];
        for (let i = 0; i < numSteps; i++) {

        const angle1 = i * angularStep; // use constant angular step
        const angle2 = angle1 + Math.PI;
        const y = i * heightStep;
        const x1 = Math.cos(angle1) * radius;
        const z1 = Math.sin(angle1) * radius;
        const x2 = Math.cos(angle2) * radius;
        const z2 = Math.sin(angle2) * radius;

        bondPositions.push(x1, y, z1, x2, y, z2);
        const isMut = problemPositions.includes(i);
        const col = isMut ? new THREE.Color(mutationColor) : new THREE.Color(normalColor);
        bondColors.push(col.r, col.g, col.b, col.r, col.g, col.b);
        }

        const bondGeo = new THREE.BufferGeometry();
        
        bondGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bondPositions), 3));
        bondGeo.setAttribute( 'color', new THREE.BufferAttribute(new Float32Array(bondColors), 3) );

        const bondMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        linewidth: 2
        });
        this.dnaHelix.add(new THREE.LineSegments(bondGeo, bondMat));

        const offsetX = -13; // tweak this to move left/right
        const offsetY = 3; // tweak this to move up/down

        this.dnaHelix.position.set(
            -(numSteps * heightStep) / 4 + offsetX,
            -(numSteps * heightStep) / 2 + offsetY,
            0
        );
        this.scene.add(this.dnaHelix);
    }

    // ───── HIGHLIGHT A NUCLEOTIDE ─────
    highlightNucleotide(index) {
        if (!this.dnaHelix) return;

        // Strand 1 and Strand 2 are the first two children of the group
        const strands = [this.dnaHelix.children[0], this.dnaHelix.children[1]];
        strands.forEach(strand => {
            strand.children.forEach(sphere => {
                if (sphere.userData.index === index) {
                sphere.material.emissiveIntensity = 1;
                sphere.scale.set(1.3, 1.3, 1.3);
                } else {
                sphere.material.emissiveIntensity = sphere.userData.isMutation ? 0.5 : 0;
                sphere.scale.set(1, 1, 1);
                }
            });
        });
    }

    // ───── THEME CHANGE HANDLER ─────
    setTheme(isLightMode) {
        // Rebuild background
        this._createBackground();
        // Rebuild the helix so normal colours change
        if (this.dnaHelix) {
        const problemIndices = [];
        // Grab mutation info from userData of strand 1
        this.dnaHelix.children[0].children.forEach(sphere => {
            if (sphere.userData.isMutation) problemIndices.push(sphere.userData.index);
        });
        const len = this.dnaHelix.children[0].children.length;
        // Dummy sequence of correct length – only positions matter
        this.createDNAHelix('A'.repeat(len), { problemPositions: problemIndices });
        }
    }

    // ───── CLEANUP ─────
    clearHelix() {
        if (this.dnaHelix) {
        this.scene.remove(this.dnaHelix);
        // Dispose materials/geometries to avoid memory leaks
        this.dnaHelix.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
            }
        });
        this.dnaHelix = null;
        }
    }

    // Called from window resize handler
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setAutoRotation(enabled) {
        this.isAutoRotating = enabled;
    }

    // Update resetView to match new camera distance:
    resetView() {
        const cameraDistance = 25;
        if (this.dnaHelix) {
            this.dnaHelix.rotation.set(0, 0, 0);
        }
        if (this.camera) {
            this.camera.position.set(0, 0, cameraDistance);
            this.camera.lookAt(0, 0, 0);
        }
    }
}
