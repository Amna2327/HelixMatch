/**
 * DNA Sequence Match Detector
 * Main application logic for sequence analysis and visualization
 */

class DNASequenceDetector {
    constructor() {
        this.sequence = '';
        this.detectionReport = null;
        this.knownMutations = this.loadKnownMutations();
        this.detectedMutations = [];
    }

    /**
     * this would be loaded from a backend service, just a stub for now
     */
    loadKnownMutations() {
        return {
            'BRCA1': {
                positions: [68, 150, 200, 300],
                disease: 'Hereditary Breast and Ovarian Cancer',
                severity: 'High',
                penetrance: '72% by age 80',
                inheritance: 'Autosomal Dominant',
                treatment: [
                    'Increased surveillance (MRI + mammography)',
                    'Risk-reducing mastectomy/oophorectomy',
                    'Targeted therapies (PARP inhibitors)',
                    'Genetic counseling'
                ]
            },
            'CFTR': {
                positions: [45, 120, 180],
                disease: 'Cystic Fibrosis',
                severity: 'High',
                penetrance: '100%',
                inheritance: 'Autosomal Recessive',
                treatment: [
                    'CFTR modulators (Kalydeco, Trikafta)',
                    'Chest physiotherapy',
                    'Airway clearance',
                    'Pancreatic enzyme replacement'
                ]
            },
            'HTT': {
                positions: [120, 250, 380],
                disease: "Huntington's Disease",
                severity: 'High',
                penetrance: '100%',
                inheritance: 'Autosomal Dominant',
                treatment: [
                    'Symptom management',
                    'HTT-lowering drugs',
                    'Physical/occupational therapy',
                    'Cognitive support'
                ]
            },
            'HBB': {
                positions: [12, 67, 89],
                disease: 'Sickle Cell Disease',
                severity: 'High',
                penetrance: '100%',
                inheritance: 'Autosomal Recessive',
                treatment: [
                    'Hydroxyurea therapy',
                    'Blood transfusions',
                    'Bone marrow transplant',
                    'Voxelotor (oxygen enhancer)'
                ]
            },
            'APOE4': {
                positions: [200, 245],
                disease: "Alzheimer's Disease",
                severity: 'Medium',
                penetrance: '30% by age 85',
                inheritance: 'Autosomal Recessive',
                treatment: [
                    'Cognitive training',
                    'Cholinesterase inhibitors',
                    'Memantine',
                    'Lifestyle modifications (exercise, diet)',
                    'Amyloid-targeting monoclonal antibodies'
                ]
            },
            'TTR': {
                positions: [156, 289],
                disease: 'Transthyretin Amyloidosis',
                severity: 'Medium',
                penetrance: '50-80%',
                inheritance: 'Autosomal Dominant',
                treatment: [
                    'Stabilizers (Tafamidis)',
                    'Antisensse oligonucleotide therapy',
                    'Silencing RNAi drugs',
                    'Cardiac pacing/transplantation'
                ]
            }
        };
    }

    /**
     * Read DNA sequence from file
     */
    async readSequenceFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                let content = e.target.result;
                
                // Parse FASTA format
                if (content.includes('>')) {
                    content = content
                        .split('\n')
                        .filter(line => !line.startsWith('>'))
                        .join('');
                }
                
                // Clean and validate
                this.sequence = content
                    .toUpperCase()
                    .replace(/[^ATGC\n\s]/g, '')
                    .replace(/\s/g, '');
                
                if (!this.sequence.match(/^[ATGC]+$/)) {
                    reject(new Error('Invalid DNA sequence format'));
                    return;
                }
                
                resolve(this.sequence);
            };
            
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsText(file);
        });
    }

    /**
     * Detect mutations in the loaded sequence
     */
    detectMutations(startPos = 0, endPos = null) {
        if (!this.sequence) {
            throw new Error('No sequence loaded');
        }

        if (!endPos) {
            endPos = this.sequence.length;
        }

        this.detectedMutations = [];

        // Check each known mutation position
        for (const [geneId, geneData] of Object.entries(this.knownMutations)) {
            for (const pos of geneData.positions) {
                if (pos >= startPos && pos < endPos && pos < this.sequence.length) {
                    this.detectedMutations.push({
                        position: pos,
                        geneId: geneId,
                        ...geneData,
                        subsequence: this.sequence.substring(
                            Math.max(0, pos - 5),
                            Math.min(this.sequence.length, pos + 6)
                        )
                    });
                }
            }
        }

        return this.detectedMutations;
    }

    /**
     * Generate detection report
     */
    generateReport(startPos = 0, endPos = null) {
        const mutations = this.detectMutations(startPos, endPos);

        this.detectionReport = {
            timestamp: new Date().toISOString(),
            sequenceLength: this.sequence.length,
            analysisRange: { start: startPos, end: endPos || this.sequence.length },
            totalMutationsDetected: mutations.length,
            riskLevel: this.calculateRiskLevel(mutations),
            mutations: mutations,
            recommendations: this.getRecommendations(mutations)
        };

        return this.detectionReport;
    }

    /**
     * Calculate overall risk level
     */
    calculateRiskLevel(mutations) {
        if (mutations.length === 0) return 'Low Risk';
        
        const highRiskCount = mutations.filter(m => m.severity === 'High').length;
        const mediumRiskCount = mutations.filter(m => m.severity === 'Medium').length;

        if (highRiskCount >= 2) return 'Very High Risk';
        if (highRiskCount >= 1) return 'High Risk';
        if (mediumRiskCount >= 2) return 'Medium Risk';
        
        return 'Low to Medium Risk';
    }

    /**
     * get recommendations form backend
     * frontend stub for now
     */
    getRecommendations(mutations) {
        const recommendations = [];

        mutations.forEach(mutation => {
            recommendations.push({
                disease: mutation.disease,
                recommendations: mutation.treatment,
                priority: mutation.severity,
                genetics: {
                    inheritance: mutation.inheritance,
                    penetrance: mutation.penetrance
                }
            });
        });

        // Add general recommendations
        if (mutations.length > 0) {
            recommendations.unshift({
                category: 'General',
                items: [
                    'Consult with a genetic counselor for interpretation',
                    'Discuss results with your primary care physician',
                    'Consider confirmatory testing',
                    'Explore family screening if indicated',
                    'Review lifestyle modifications'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Get mutation info for tooltip
     */
    getMutationInfo(position) {
        const mutation = this.detectedMutations.find(m => m.position === position);
        
        if (!mutation) {
            return {
                position: position,
                nucleotide: this.sequence[position],
                status: 'Normal'
            };
        }

        return {
            position: position,
            nucleotide: this.sequence[position],
            geneId: mutation.geneId,
            disease: mutation.disease,
            severity: mutation.severity,
            inheritance: mutation.inheritance,
            penetrance: mutation.penetrance
        };
    }

    /**
     * Export report as JSON
     */
    exportReport() {
        if (!this.detectionReport) {
            throw new Error('No report generated');
        }

        return JSON.stringify(this.detectionReport, null, 2);
    }

    /**
     * Export report as HTML
     */
    exportReportHTML() {
        if (!this.detectionReport) {
            throw new Error('No report generated');
        }

        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>DNA Analysis Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { color: #0066cc; margin-bottom: 20px; }
                .mutation { border-left: 4px solid #ff3366; padding: 15px; margin: 10px 0; background: #f9f9f9; }
                .risk-high { color: #cc0000; font-weight: bold; }
                .risk-medium { color: #ff8800; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #0066cc; color: white; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>DNA Sequence Analysis Report</h1>
                <p>Generated: ${new Date(this.detectionReport.timestamp).toLocaleString()}</p>
            </div>
            
            <h2>Summary</h2>
            <p>Sequence Length: ${this.detectionReport.sequenceLength} bp</p>
            <p>Analysis Range: ${this.detectionReport.analysisRange.start}-${this.detectionReport.analysisRange.end}</p>
            <p>Mutations Detected: <span class="${this.detectionReport.riskLevel.includes('High') ? 'risk-high' : 'risk-medium'}">${this.detectionReport.totalMutationsDetected}</span></p>
            <p>Overall Risk Level: <span class="${this.detectionReport.riskLevel.includes('High') ? 'risk-high' : 'risk-medium'}">${this.detectionReport.riskLevel}</span></p>
            
            <h2>Detected Mutations</h2>
            ${this.detectionReport.mutations.map(mut => `
                <div class="mutation">
                    <h3>${mut.disease} (${mut.geneId})</h3>
                    <p><strong>Position:</strong> ${mut.position + 1}</p>
                    <p><strong>Severity:</strong> ${mut.severity}</p>
                    <p><strong>Inheritance:</strong> ${mut.inheritance}</p>
                    <p><strong>Penetrance:</strong> ${mut.penetrance}</p>
                    <p><strong>Treatment Options:</strong></p>
                    <ul>
                        ${mut.treatment.map(t => `<li>${t}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
            
            <h2>Recommendations</h2>
            ${this.detectionReport.recommendations.map(rec => {
                if (rec.category === 'General') {
                    return `
                        <h3>General Recommendations</h3>
                        <ul>
                            ${rec.items.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    `;
                } else {
                    return `
                        <h3>${rec.disease}</h3>
                        <p><strong>Priority:</strong> ${rec.priority}</p>
                        <ul>
                            ${rec.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    `;
                }
            }).join('')}
        </body>
        </html>
        `;

        return html;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DNASequenceDetector;
}