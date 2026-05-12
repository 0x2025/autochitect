export default function ArchitectureScan() {
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Center */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px", minWidth: 0 }}>
        <div className="article-header">
          <h2 className="article-title">Architecture Scan</h2>
          <div className="article-meta">
            <span style={{ fontStyle: "italic", color: "var(--g500)" }}>
              Autonomous repository analysis for identifying architectural patterns, anti-patterns, and structural drift.
            </span>
          </div>
        </div>

        <div className="prose">
          <p>
            Architecture Scan is an autonomous tool that performs deep analysis of a code repository,
            producing structured findings across context, container, and component levels using the C4
            model.
          </p>
          <p>
            It identifies security risks, performance bottlenecks, coupling issues, and structural drift —
            then generates a human-reviewable report with recommendations.
          </p>
        </div>

        <div style={{
          border: "1px dashed var(--g300)",
          padding: "24px",
          textAlign: "center",
          color: "var(--g500)",
          fontFamily: "var(--font-sans, ui-sans-serif, sans-serif)",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontStyle: "italic",
          marginTop: "48px",
        }}>
          Self-hosted scanning coming soon.
        </div>
      </main>

      {/* Right panel */}
      <aside style={{
        width: "272px",
        flexShrink: 0,
        overflowY: "auto",
        borderLeft: "1px solid var(--g300)",
        padding: "24px",
        background: "var(--oat)",
      }}>
        <div className="right-section">
          <p className="right-section-heading">About this Tool</p>
          <table className="props-table">
            <tbody>
              <tr><td>Type</td><td>Autonomous Agent</td></tr>
              <tr><td>Model</td><td>C4 Architecture</td></tr>
              <tr><td>Output</td><td>Structured Report</td></tr>
              <tr><td>Status</td><td>Coming Soon</td></tr>
            </tbody>
          </table>
        </div>

        <div className="right-section">
          <p className="right-section-heading">Detects</p>
          <ul className="related-list">
            {["Security Risks", "Performance Bottlenecks", "Coupling Issues", "Structural Drift", "Anti-patterns"].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="right-section">
          <p className="right-section-heading">Engineering Notes</p>
          <p className="right-notes">
            Analysis spans context, container, and component layers of the C4 model,
            giving a full picture from system boundaries down to individual service interactions.
          </p>
        </div>
      </aside>
    </div>
  );
}
