# HelixMatch 🧬
**A Dynamic Programming based Tool for Genetic Disease Risk Assessment** *Project for CS-251: Design and Analysis of Algorithm*

## 📝 Statement
Hereditary diseases collectively affect a significant portion of humanity — approximately 1 in every 17 people will be affected by a rare condition at some point in their lives, the vast majority of which are genetic in origin. It is estimated that 80% of rare diseases have a genetic cause, making hereditary conditions the single largest category of chronically undiagnosed illness. 

The diagnostic challenge is compounded by the high cost of genetic screening: commercially available DNA testing kits range from $100 to $2,000 per test, placing them entirely out of reach for populations in low-income countries such as Chad, Niger, and Sudan, where GNI per capita falls below $1,000. The result is a global inequity in which the burden of hereditary disease falls heaviest on those least equipped to diagnose it. **HelixMatch** addresses the high cost of genetic screening by providing an algorithmic pre-screening tool.

There exists, therefore, a need for an accessible, algorithmic pre-screening tool capable of identifying the likelihood of hereditary disease from raw DNA sequence data — before expensive confirmatory testing is ordered. This project, HelixMatch, addresses this gap by implementing the Smith-Waterman local sequence alignment algorithm, a well-established dynamic programming technique, to align a user-submitted DNA sequence against a curated reference library of known pathogenic mutations sourced from ClinVar and NCBI GenBank. By returning a ranked similarity score against each reference mutation, the system functions as a triage layer — narrowing the diagnostic space so that targeted, disease-specific kits are used only where algorithmic evidence warrants them, rather than broad and costly comprehensive panels. This approach does not replace clinical diagnosis, but meaningfully reduces its cost barrier.

## 🔬 Literature Review
Hereditary diseases are genetic conditions passed from parents to offspring through mutations in germline cells. Common examples include cystic fibrosis, sickle cell disease, and Huntington's disease. A genetic mutation is a permanent change in the nucleotide sequence of DNA, arising from both external causes — such as UV radiation and mutagenic chemicals — and internal causes such as errors during DNA replication. Because many of these diseases are well-characterized at the genomic level, their causative mutation sequences are publicly documented, making sequence comparison a natural algorithmic approach to pre-screening.

Sequence alignment is the process of arranging two or more DNA, RNA, or protein sequences to identify regions of similarity that may reflect shared function or common origin. Alignments are categorized as either global or local. Global alignment aligns two sequences end-to-end in their entirety, and is appropriate when sequences are known to be homologous across their full length. Local alignment, by contrast, identifies the highest-scoring matching subsequence between two strings, making it suitable for cases where only a region of the input is expected to correspond to the reference. Since hereditary mutations are typically short, well-defined sequence variants embedded within a much longer patient genome, local alignment is the appropriate choice for this project.

The canonical algorithm for local sequence alignment is the Smith-Waterman algorithm, introduced by Smith and Waterman in 1981. A naïve brute-force approach to local alignment would enumerate all possible alignments — an exponential operation. Smith-Waterman instead applies dynamic programming, constructing an (M × N) scoring matrix where each cell represents the optimal alignment score for the corresponding subsequences, computed from previously solved subproblems. Negative scores are set to zero rather than carried forward, ensuring that only locally similar regions contribute to the final alignment. This yields a time complexity of O(M × N), where M and N are the lengths of the two sequences — guaranteed optimal for local alignment under the chosen scoring scheme.

While tools such as BLAST (Basic Local Alignment Search Tool) also perform local sequence comparison, they differ fundamentally from HelixMatch in both purpose and methodology. BLAST is a heuristic approximation of the Smith-Waterman algorithm, designed to search massive sequence databases at speed by sacrificing some alignment sensitivity. Studies have consistently demonstrated that the exact Smith-Waterman algorithm yields more accurate alignments than BLAST, which is known to miss alignments that Smith-Waterman finds. For a diagnostic pre-screening application where a missed match could mean a missed disease flag, this accuracy trade-off is unacceptable. Furthermore, BLAST is a broad similarity search tool, while HelixMatch is a targeted diagnostic instrument — aligning input sequences specifically against a curated library of clinically significant pathogenic variants from ClinVar and NCBI GenBank, and returning disease-labelled similarity scores rather than raw database hits. In this manner, HelixMatch is both algorithmically justified and clinically distinct.

## ⚙️ How it Works
HelixMatch aims to detect mutation in DNA by cross checking nucleotide sequences from those of mutation-based ones that cause widely known diseases, giving the chances for the development of that disease. 

Dynamic programming optimizes pattern matching especially in the context of large scale genetic data, allowing for an efficient solution implemented with meager resources. With the alignment of the DNA sequence against referenced diseases, raw alignment is converted to meaningful metrics via a position-based ranking matrix, where differences in position within the gene have significant changes in weights. The final output gives a chance percentage of the referenced disease to develop, along with a 3D render of the relevant window of sequence, and a PDF report generated for future reference.

### Smith–Waterman Algorithm
The Smith-Waterman algorithm identifies the best matching subsequence in a localized alignment. It can detect point mutations and allows for gaps within a subsequence, making it ideal for detection of hereditary diseases where variants occur in short windows.

For a Top-Down approach using memoization, the algorithm starts by creating a scoring matrix of size `(m+1) × (n+1)`, where `m` and `n` are the lengths of the two sequences. Each cell is computed using the recursive relation:

`H[i][j] = max(0, H[i-1][j-1] + match_score, H[i-1][j] + gap, H[i][j-1] + gap)`

* Default of 0 avoids negative scores (local alignment property)
* Diagonal: bases match or mismatch
* Gaps in each respective sequence is added

If the score is set to negative, it is reset to `0` by default which discards poorly matching regions. Scores from immediate upper, left and diagonal cells to the current one are checked. The highest score in the entire matrix identifies the optimal local alignment. The traceback proceeds from this maximum cell diagonally upward until a cell with value zero is reached, extracting the best matching subsequence.

### Complexity
* **Time Complexity `O(m × n)`:** Each cell in the matrix computed exactly once
* **Space Complexity `O(m × n)`:** Matrix of scores stored for traceback

## 📊 Dataset & Tech Stack

### Implementation Notes
* **Intended Dataset:** The DNA nucleotide sequence data for this project is sourced from the NCBI Nucleotide database. This database is an annotated collection of publicly available DNA sequences that covers a diverse range of mutation-based diseases, providing the reference sequences necessary for comparing patient DNA against known disease-associated genetic variants.
* **Reference Standards:** For disease nucleotides, HelixMatch specifically utilizes RefSeqGene records (`NG_` prefix) as curated reference standards, as they are non-redundant and do not have sequencing errors.
* **Test Inputs:** The test input is sourced from raw genomic contigs (`NT_` prefix) that make up the human genome. They are high-quality, finished sequences with non-curated data, suitable for realistic test cases.

### Software Tools
* **Source:** NCBI Nucleotide database (RefSeqGene `NG_` records)
* **Backend:** Node.js + Express
* **Frontend:** HTML/CSS/JS + Three.js for 3D sequence visualization
* **Report Generation:** PDFKit

## 👥 Team
* **Amna Ahmed** 
* **Zainab Mobin** 