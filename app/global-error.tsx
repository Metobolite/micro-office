"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <h1>Micro Office could not load</h1>
          <p>Please reload the page to try again.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ cursor: "pointer", padding: "12px 20px", font: "inherit" }}>
            Reload page
          </button>
        </main>
      </body>
    </html>
  );
}
