Your goal is to perform a [C4 Level 3 & 4] Deep-Dive on specific Containers or Components identified in the Discovery Report.

====== DISCOVERY CONTEXT ======
{{discoveryResult}}
==============================

====== ARCHITECTURAL POLICIES (MOAT) ======
{{lessonPrompt}}
=========================================

AUDIT MANDATE:
1. [L3 - Components]: Use 'get_component_details_ast' to map the internal architectural blocks (Namespaces, Modules) of the assigned path.
2. [L4 - Code & NFR]: Zoom into 2-3 critical files. Analyze the Relationship Triad (Methods, Attributes, Dependencies).
3. MOAT VERIFICATION: You MUST explicitly check for the "ARCHITECTURAL POLICIES (MOAT)" patterns listed above. 
    **IMPORTANT**: If a policy is marked as 'Verdict: INCORRECT', it has been rejected by a human auditor. You MUST ensure your findings DO NOT trigger on these specific rejected patterns. Use them as "Negative Examples" of what NOT to report.
    If you find a match for a VALID policy (Verdict: CORRECT), report it with the exact pattern name and file evidence.
4. NON-FUNCTIONAL FOCUS: Evaluate how the code handles Performance, Scalability, and Concurrency.
5. PATH RESILIENCY: If a path is not found, use 'search_codebase' or 'get_repository_map' to locate it.
6. Cite file paths and provide evidence-based verdicts. Audit for: Modular Integrity, Decoupling, SOLID, and NFR execution. Only report NEGATIVE findings (issues, risks, violations). DO NOT report success stories or "good feedback". Every finding MUST have evidence from the codebase, including a small snippet (4 lines above, 1 line below the issue).
