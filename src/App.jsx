import React, { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as pdfjs from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.min.js";

// ✅ Set correct PDF.js worker path
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js`;

function App() {
    const [file, setFile] = useState(null);
    const [totalPages, setTotalPages] = useState(null);
    const [startPage, setStartPage] = useState("");
    const [endPage, setEndPage] = useState("");
    const [summaryType, setSummaryType] = useState("brief"); // ✅ Default summary type
    const [summary, setSummary] = useState("");
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ✅ Handle file selection
    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile || selectedFile.type !== "application/pdf") {
            setError("Please select a valid PDF file");
            return;
        }
        setError("");
        setFile(selectedFile);
        extractPageCount(selectedFile);
    };

    // ✅ Extract number of pages
    const extractPageCount = async (selectedFile) => {
        try {
            const fileReader = new FileReader();
            fileReader.readAsArrayBuffer(selectedFile);
            fileReader.onload = async function () {
                const pdf = await pdfjs.getDocument({ data: fileReader.result }).promise;
                setTotalPages(pdf.numPages);
                if (!endPage) setEndPage(pdf.numPages.toString());
            };
        } catch (error) {
            setError("Error reading PDF file.");
            console.error("PDF Parsing Error:", error);
            setTotalPages(null);
        }
    };

    // ✅ Handle file upload & summarization request
    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file");
            return;
        }
        setLoading(true);
        setSummary("");
        setMetadata(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("start_page", startPage);
        formData.append("end_page", endPage);
        formData.append("summary_type", summaryType.toLowerCase());

        try {
            const res = await axios.post("http://127.0.0.1:8000/upload_pdf/", formData);

            console.log("DEBUG: API Response ->", res.data); // ✅ Debugging Log

            if (res.data.error) {
                setError(res.data.error);
            } else {
                setSummary(res.data.summary || res.data);

                // ✅ Ensure tokens are numbers before displaying
                setMetadata({
                    prompt_tokens: res.data.prompt_tokens !== undefined ? res.data.prompt_tokens : "N/A",
                    completion_tokens: res.data.completion_tokens !== undefined ? res.data.completion_tokens : "N/A",
                    total_time: res.data.total_time !== undefined ? res.data.total_time.toFixed(2) : "N/A"
                });
            }
        } catch (error) {
            console.error("Error uploading PDF:", error);
            setError("Error generating summary. Please check the backend logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={appContainer}>
            {/* Header */}
            <header style={headerStyle}>
                <h1 style={titleStyle}>📄 PDF Summarizer</h1>
            </header>

            {/* Main Layout */}
            <div style={layoutContainer}>
                {/* Sidebar */}
                <aside style={sidebarStyle}>
                    <div style={inputContainer}>
                        <input type="file" onChange={handleFileSelect} accept="application/pdf" style={fileInputStyle} />
                        {totalPages !== null && <p style={pageCountStyle}>📄 Total Pages: {totalPages}</p>}
                        <input
                            type="number"
                            placeholder="Start Page"
                            value={startPage}
                            onChange={(e) => setStartPage(e.target.value)}
                            style={inputStyle}
                        />
                        <input
                            type="number"
                            placeholder="End Page"
                            value={endPage}
                            onChange={(e) => setEndPage(e.target.value)}
                            style={inputStyle}
                        />
                        <select value={summaryType} onChange={(e) => setSummaryType(e.target.value)} style={selectStyle}>
                            <option value="brief">📝 Brief Summary</option>
                            <option value="detailed">📖 Detailed Summary</option>
                        </select>
                        <button onClick={handleUpload} style={buttonStyle}>
                            {loading ? "⏳ Generating..." : "Generate"}
                        </button>
                    </div>
                </aside>

                {/* Main Section */}
                <main style={mainStyle}>
                    {error && <p style={errorStyle}>⚠️ {error}</p>}

                    {/* Summary Section */}
                    <div style={summaryContainer}>
                        <h2 style={summaryTitleStyle}>
                            {summary ? (file?.name ? `Summary of ${file.name}` : "Summary") : "Summary"}
                        </h2>
                        {loading ? (
                            <div style={loadingStyle}>
                                <p>⏳ Generating summary... Please wait.</p>
                            </div>
                        ) : (
                            <div style={summaryContentStyle}>
                                {summary ? (
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({node, ...props}) => <p style={paragraphStyle} {...props} />,
                                            h1: ({node, ...props}) => <h1 style={headingStyle} {...props} />,
                                            h2: ({node, ...props}) => <h2 style={headingStyle} {...props} />,
                                            h3: ({node, ...props}) => <h3 style={headingStyle} {...props} />,
                                            li: ({node, ...props}) => <li style={listItemStyle} {...props} />,
                                            ul: ({node, ...props}) => <ul style={listStyle} {...props} />,
                                            ol: ({node, ...props}) => <ol style={listStyle} {...props} />
                                        }}
                                    >
                                        {summary}
                                    </ReactMarkdown>
                                ) : (
                                    <p style={placeholderStyle}>⚡ No summary yet. Upload a PDF and click Generate.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Token Metadata */}
                    {metadata && (
                        <div style={metadataContainer}>
                            <h3 style={metadataTitleStyle}>📊 Token Usage</h3>
                            <div style={metadataContentStyle}>
                                <p><strong>📥 Input Tokens:</strong> {metadata.prompt_tokens}</p>
                                <p><strong>📤 Output Tokens:</strong> {metadata.completion_tokens}</p>
                                <p><strong>⏳ Processing Time:</strong> {metadata.total_time} seconds</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Footer */}
            <footer style={footerStyle}>
                <p>PDF Summarizer. All rights reserved.</p>
            </footer>
        </div>
    );
}

// ✅ Styles
const appContainer = {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#f0f2f5",
    fontFamily: "'Poppins', sans-serif",
};

const headerStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
};

const titleStyle = {
    color: "#333",
    fontSize: "28px",
    margin: 0,
};

const layoutContainer = {
    display: "flex",
    flex: 1,
    margin: "20px",
    gap: "20px",
};

const sidebarStyle = {
    width: "300px",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    alignSelf: "flex-start",
};

const inputContainer = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
};

const fileInputStyle = {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
};

const pageCountStyle = {
    margin: "10px 0",
    fontSize: "14px",
    color: "#666",
};

const inputStyle = {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
};

const selectStyle = {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
};

const buttonStyle = {
    padding: "10px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
    transition: "background-color 0.3s",
    fontWeight: "500",
};

const mainStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "900px",
};

const summaryContainer = {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    borderRadius: "10px",
    padding: "30px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
};

const summaryTitleStyle = {
    marginTop: 0,
    marginBottom: "20px",
    color: "#333",
    borderBottom: "1px solid #eee",
    paddingBottom: "10px",
};

const summaryContentStyle = {
    overflow: "auto",
    lineHeight: "1.6",
    color: "#444",
};

const paragraphStyle = {
    marginBottom: "16px",
    textAlign: "justify",
};

const headingStyle = {
    marginTop: "24px",
    marginBottom: "12px",
    color: "#333",
};

const listStyle = {
    marginBottom: "16px",
    paddingLeft: "20px",
};

const listItemStyle = {
    marginBottom: "8px",
};

const placeholderStyle = {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    padding: "30px 0",
};

const loadingStyle = {
    textAlign: "center",
    padding: "30px 0",
    color: "#666",
};

const metadataContainer = {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
};

const metadataTitleStyle = {
    marginTop: 0,
    marginBottom: "15px",
    color: "#333",
    fontSize: "18px",
};

const metadataContentStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#555",
};

const errorStyle = {
    color: "#e74c3c",
    fontWeight: "bold",
    textAlign: "center",
    padding: "10px",
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    borderRadius: "5px",
    marginBottom: "10px",
};

const footerStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    padding: "10px",
    textAlign: "center",
    boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
    marginTop: "auto",
};

export default App;