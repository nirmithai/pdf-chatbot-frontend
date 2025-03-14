// import React, { useState } from "react";
// import axios from "axios";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import remarkMath from "remark-math";
// import rehypeKatex from "rehype-katex";
// import * as pdfjs from "pdfjs-dist";
// import "pdfjs-dist/build/pdf.worker.min.js";
// import "katex/dist/katex.min.css";

// // ✅ Set correct PDF.js worker path
// pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js`;

// function Demo() {
//   const [file, setFile] = useState(null);
//   const [totalPages, setTotalPages] = useState(null);
//   const [startPage, setStartPage] = useState("");
//   const [endPage, setEndPage] = useState("");
//   const [summaryType, setSummaryType] = useState("brief");
//   const [summary, setSummary] = useState("");
//   const [metadata, setMetadata] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   // ✅ Handle file selection
//   const handleFileSelect = async (e) => {
//     const selectedFile = e.target.files[0];
//     if (!selectedFile || selectedFile.type !== "application/pdf") {
//       setError("Please select a valid PDF file");
//       return;
//     }
//     setError("");
//     setFile(selectedFile);
//     extractPageCount(selectedFile);
//   };

//   // ✅ Extract number of pages
//   const extractPageCount = async (selectedFile) => {
//     try {
//       const fileReader = new FileReader();
//       fileReader.readAsArrayBuffer(selectedFile);
//       fileReader.onload = async function () {
//         const pdf = await pdfjs.getDocument({ data: fileReader.result }).promise;
//         setTotalPages(pdf.numPages);
//         if (!endPage) setEndPage(pdf.numPages.toString());
//       };
//     } catch (error) {
//       setError("Error reading PDF file.");
//       console.error("PDF Parsing Error:", error);
//       setTotalPages(null);
//     }
//   };

//   // ✅ Handle file upload & summarization request
//   const handleUpload = async () => {
//     if (!file) {
//       setError("Please select a file");
//       return;
//     }
//     setLoading(true);
//     setSummary("");
//     setMetadata(null);
  
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("start_page", startPage);
//     formData.append("end_page", endPage);
//     formData.append("summary_type", summaryType);
  
//     console.log("Form Data Sent:", {
//       file: file.name,
//       start_page: startPage,
//       end_page: endPage,
//       summary_type: summaryType,
//     }); // Debugging the data being sent
  
//     try {
//       const res = await axios.post("http://127.0.0.1:8000/upload_pdf/", formData);
  
//       console.log("API Response", res.data); // Debugging response
//       setSummary(res.data.summary);
//       setMetadata({
//         prompt_tokens: res.data.prompt_tokens ?? "N/A",
//         completion_tokens: res.data.completion_tokens ?? "N/A",
//         total_time: res.data.total_time ?? "N/A",
//       });
//     } catch (error) {
//       console.error("Error uploading PDF:", error);
//       setError("Error generating summary.");
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   return (
//     <div style={styles.appContainer}>
//       <header style={styles.header}>
//         <h1 style={styles.title}>PDF Summarizer</h1>
//       </header>

//       <div style={styles.layoutContainer}>
//         {/* Sidebar */}
//         <aside style={styles.sidebar}>
//           <div style={styles.inputContainer}>
//             <input
//               type="file"
//               onChange={handleFileSelect}
//               accept="application/pdf"
//               style={styles.fileInput}
//             />
//             {totalPages !== null && (
//               <p style={styles.pageCount}>📄 Total Pages: {totalPages}</p>
//             )}
//             <input
//               type="number"
//               placeholder="Start Page"
//               value={startPage}
//               onChange={(e) => setStartPage(e.target.value)}
//               style={styles.inputField}
//             />
//             <input
//               type="number"
//               placeholder="End Page"
//               value={endPage}
//               onChange={(e) => setEndPage(e.target.value)}
//               style={styles.inputField}
//             />
//             <select
//               value={summaryType}
//               onChange={(e) => setSummaryType(e.target.value)}
//               style={styles.selectField}
//             >
//               <option value="brief">Brief Summary</option>
//               <option value="detailed">Detailed Summary</option>
//               <option value="cheatsheet">CheatSheet</option>
//             </select>
//             <button onClick={handleUpload} style={styles.button}>
//               {loading ? "⏳ Generating..." : "Generate"}
//             </button>
//           </div>
//         </aside>

//         {/* Main Content */}
//         <main style={styles.mainContent}>
//           {error && <p style={styles.error}>⚠️ {error}</p>}

//           <div style={styles.summaryContainer}>
//             <h2 style={styles.summaryTitle}>📝 Summary</h2>
//             <div style={styles.summaryContent}>
//               <ReactMarkdown
//                 remarkPlugins={[remarkGfm, remarkMath]}
//                 rehypePlugins={[rehypeKatex]}
//                 components={{
//                   code({ node, inline, className, children, ...props }) {
//                     return !inline ? (
//                       <pre
//                         style={{
//                           backgroundColor: "#2d2d2d",
//                           color: "white",
//                           padding: "15px",
//                           borderRadius: "8px",
//                           fontFamily: "Courier New, monospace",
//                         }}
//                       >
//                         <code {...props}>{children}</code>
//                       </pre>
//                     ) : (
//                       <code {...props}>{children}</code>
//                     );
//                   },
//                 }}
//               >
//                 {summary}
//               </ReactMarkdown>
//             </div>
//           </div>
//         </main>
//       </div>

//       {/* Footer with Token Stats */}
//       <footer style={styles.footer}>
//         {metadata && (
//           <div style={styles.tokenContainer}>
//             <p>
//               📥 Input Tokens: <strong>{metadata.prompt_tokens}</strong>
//             </p>
//             <p>
//               📤 Output Tokens: <strong>{metadata.completion_tokens}</strong>
//             </p>
//             <p>
//               ⏳ Processing Time: <strong>{metadata.total_time} sec</strong>
//             </p>
//           </div>
//         )}
//       </footer>
//     </div>
//   );
// }

// // ✅ Inline Styles Object
// const styles = {
//   appContainer: {
//     display: "flex",
//     flexDirection: "column",
//     height: "100vh",
//     overflow: "hidden",
//     backgroundColor: "#f8f9fa",
//   },
//   header: {
//     padding: "20px",
//     textAlign: "center",
//     backgroundColor: "#007bff",
//     color: "white",
//     fontSize: "24px",
//     fontWeight: "bold",
//     borderRadius: "10px",
//   },
//   title: {
//     fontSize: "24px",
//     fontWeight: "bold",
//   },
//   layoutContainer: {
//     display: "flex",
//     flex: 1,
//     overflow: "hidden",
//   },
//   sidebar: {
//     width: "300px",
//     padding: "20px",
//     backgroundColor: "white",
//     borderRight: "2px solid #ddd",
//     flexShrink: 0,
//   },
//   inputContainer: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "10px",
//   },
//   fileInput: {
//     padding: "10px",
//     border: "1px solid #ccc",
//     borderRadius: "5px",
//     fontSize: "14px",
//   },
//   pageCount: {
//     fontSize: "14px",
//     color: "#666",
//   },
//   inputField: {
//     padding: "10px",
//     border: "1px solid #ccc",
//     borderRadius: "5px",
//     fontSize: "14px",
//   },
//   selectField: {
//     padding: "10px",
//     border: "1px solid #ccc",
//     borderRadius: "5px",
//     fontSize: "14px",
//   },
//   button: {
//     padding: "10px",
//     backgroundColor: "#007bff",
//     color: "white",
//     border: "none",
//     cursor: "pointer",
//     borderRadius: "5px",
//     transition: "background-color 0.3s",
//     fontWeight: "bold",
//   },
//   mainContent: {
//     flex: 1,
//     display: "flex",
//     flexDirection: "column",
//     overflow: "hidden",
//     padding: "20px",
//   },
//   summaryContainer: {
//     flex: 1,
//     padding: "20px",
//     backgroundColor: "white",
//     overflowY: "auto",
//     height: "100%",
//     borderRadius: "10px",
//     boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.1)",
//     marginBottom: "20px",
//   },
//   summaryTitle: {
//     fontSize: "20px",
//     fontWeight: "bold",
//   },
//   summaryContent: {
//     lineHeight: "1.6",
//     fontSize: "16px",
//     color: "#333",
//   },
//   error: {
//     color: "red",
//     fontWeight: "bold",
//   },
//   footer: {
//     padding: "10px",
//     textAlign: "center",
//     backgroundColor: "#007bff",
//     color: "white",
//     flexShrink: 0,
//     display: "flex",
//     justifyContent: "space-between",
//     borderRadius: "10px",
//   },
//   tokenContainer: {
//     display: "flex",
//     gap: "20px",
//     fontSize: "14px",
//   },
// };

// export default Demo;

import React, { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import * as pdfjs from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.min.js";
import "katex/dist/katex.min.css";

// ✅ Set correct PDF.js worker path
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js`;

function Demo() {
  const [file, setFile] = useState(null);
  const [totalPages, setTotalPages] = useState(null);
  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");
  const [summaryType, setSummaryType] = useState("brief");
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
    formData.append("summary_type", summaryType);
  
    console.log("Form Data Sent:", {
      file: file.name,
      start_page: startPage,
      end_page: endPage,
      summary_type: summaryType,
    }); // Debugging the data being sent
  
    try {
      const res = await axios.post("http://127.0.0.1:8000/upload_pdf/", formData);
  
      console.log("API Response", res.data); // Debugging response
      setSummary(res.data.summary);
      setMetadata({
        prompt_tokens: res.data.prompt_tokens ?? "N/A",
        completion_tokens: res.data.completion_tokens ?? "N/A",
        total_time: res.data.total_time ?? "N/A",
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setError("Error generating summary.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={styles.title}>PDF Summarizer</h1>
      </header>

      <div style={styles.layoutContainer}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.inputContainer}>
            <input
              type="file"
              onChange={handleFileSelect}
              accept="application/pdf"
              style={styles.fileInput}
            />
            {totalPages !== null && (
              <p style={styles.pageCount}>📄 Total Pages: {totalPages}</p>
            )}
            <input
              type="number"
              placeholder="Start Page"
              value={startPage}
              onChange={(e) => setStartPage(e.target.value)}
              style={styles.inputField}
            />
            <input
              type="number"
              placeholder="End Page"
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              style={styles.inputField}
            />
            <select
              value={summaryType}
              onChange={(e) => setSummaryType(e.target.value)}
              style={styles.selectField}
            >
              <option value="brief">Brief Summary</option>
              <option value="detailed">Detailed Summary</option>
              <option value="cheatsheet">CheatSheet</option>
            </select>
            <button onClick={handleUpload} style={styles.button}>
              {loading ? "⏳ Generating..." : "Generate"}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={styles.mainContent}>
          {error && <p style={styles.error}>⚠️ {error}</p>}

          <div style={styles.summaryContainer}>
            <h2 style={styles.summaryTitle}>📝 Summary</h2>
            <div style={styles.summaryContent}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        </main>
      </div>

      {/* Footer with Token Stats */}
      <footer style={styles.footer}>
        {metadata && (
          <div style={styles.tokenContainer}>
            <p>
              📥 Input Tokens: <strong>{metadata.prompt_tokens}</strong>
            </p>
            <p>
              📤 Output Tokens: <strong>{metadata.completion_tokens}</strong>
            </p>
            <p>
              ⏳ Processing Time: <strong>{metadata.total_time} sec</strong>
            </p>
          </div>
        )}
      </footer>
    </div>
  );
}

// ✅ Inline Styles Object with Teal Theme
const styles = {
  appContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: "20px",
    textAlign: "center",
    backgroundColor: "rgb(20, 184, 166)", // Teal color
    color: "white",
    fontSize: "24px",
    fontWeight: "bold",
    borderRadius: "10px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
  },
  layoutContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  sidebar: {
    width: "300px",
    padding: "20px",
    backgroundColor: "white",
    borderRight: "2px solid #ddd",
    flexShrink: 0,
  },
  inputContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  fileInput: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "14px",
  },
  pageCount: {
    fontSize: "14px",
    color: "#666",
  },
  inputField: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "14px",
  },
  selectField: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "14px",
  },
  button: {
    padding: "10px",
    backgroundColor: "rgb(20, 184, 166)", // Teal color
    color: "white",
    border: "none",
    cursor: "pointer",
    borderRadius: "5px",
    transition: "background-color 0.3s",
    fontWeight: "bold",
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "20px",
  },
  summaryContainer: {
    flex: 1,
    padding: "20px",
    backgroundColor: "white",
    overflowY: "auto",
    height: "100%",
    borderRadius: "10px",
    boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.1)",
    marginBottom: "20px",
  },
  summaryTitle: {
    fontSize: "20px",
    fontWeight: "bold",
  },
  summaryContent: {
    lineHeight: "1.6",
    fontSize: "16px",
    color: "#333",
  },
  error: {
    color: "red",
    fontWeight: "bold",
  },
  footer: {
    padding: "10px",
    textAlign: "center",
    backgroundColor: "rgb(20, 184, 166)", // Teal color
    color: "white",
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    borderRadius: "10px",
  },
  tokenContainer: {
    display: "flex",
    gap: "20px",
    fontSize: "14px",
  },
};

export default Demo;
