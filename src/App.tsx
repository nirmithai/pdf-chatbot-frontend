import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import * as pdfjs from "pdfjs-dist";
import "katex/dist/katex.min.css";
import {
  Download,
  Copy,
  FileText,
  Clock,
  MessageSquare,
  Zap,
  FileText as FileIcon,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");
  const [summaryType, setSummaryType] = useState("brief");
  const [summary, setSummary] = useState("");
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    setRenderKey((prev) => prev + 1);
  }, [summary]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || selectedFile.type !== "application/pdf") {
      toast.error("Please select a valid PDF file");
      return;
    }
    setFile(selectedFile);
    extractPageCount(selectedFile);
  };

  const extractPageCount = async (selectedFile: File) => {
    try {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(selectedFile);
      fileReader.onload = async function () {
        try {
          const pdf = await pdfjs.getDocument({ data: fileReader.result } as any).promise;
          setTotalPages(pdf.numPages);
          if (!endPage) setEndPage(pdf.numPages.toString());
          toast.success(`PDF loaded successfully. Total pages: ${pdf.numPages}`);
        } catch (err) {
          toast.error("Error parsing PDF file.");
          console.error("PDF Parsing Error:", err);
        }
      };
    } catch (error) {
      toast.error("Error reading PDF file.");
      console.error("PDF Reading Error:", error);
      setTotalPages(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (startPage && endPage) {
      const sPage = parseInt(startPage);
      const ePage = parseInt(endPage);
      if (sPage > ePage) {
        toast.error("Start page cannot be greater than end page");
        return;
      }
      if (totalPages && ePage > totalPages) {
        toast.error(`End page cannot exceed total pages (${totalPages})`);
        return;
      }
    }

    setLoading(true);
    setSummary("");
    setMetadata(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("start_page", startPage);
    formData.append("end_page", endPage);
    formData.append("summary_type", summaryType);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND}upload_pdf/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setSummary(data.summary);
      setMetadata({
        prompt_tokens: data.prompt_tokens ?? "N/A",
        completion_tokens: data.completion_tokens ?? "N/A",
        total_time: data.total_time ?? "N/A",
        total_pages: totalPages ?? "N/A",
        pdf_filename: data.pdf_filename ?? null,
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error("Error generating summary.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary || !summaryRef.current) return;
    navigator.clipboard
      .writeText(summaryRef.current.textContent || "")
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  const handleDownloadPDF = async () => {
    if (!summary || !summaryRef.current) return;
  
    setPdfLoading(true);
    try {
      const loadingToast = toast.info("Generating PDF...", { autoClose: false });
  
      // Create a temporary container to hold the cloned content
      const tempContainer = document.createElement("div");
      tempContainer.style.width = "800px";
      tempContainer.style.padding = "20px";
      tempContainer.style.backgroundColor = "white";
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
  
      // Clone the summary content
      const clonedContent = summaryRef.current.cloneNode(true) as HTMLElement;
      tempContainer.appendChild(clonedContent);
      document.body.appendChild(tempContainer);
  
      // Render LaTeX expressions with proper configuration
      renderMathInElement(clonedContent, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false
      });
  
      // Wait for LaTeX rendering to complete
      await new Promise(requestAnimationFrame);
  
      // Use html2canvas with adjusted settings for better rendering
      const canvas = await html2canvas(clonedContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: false,
        backgroundColor: "#ffffff",
        // Removed invalid property 'letterRendering'
      });
  
      // Clean up the temporary container
      document.body.removeChild(tempContainer);
  
      // Convert the canvas to an image
      const imgData = canvas.toDataURL("image/png", 1.0);
  
      // Create a new jsPDF document
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
  
      // Add title to the PDF
      doc.setFontSize(18);
      doc.text("PDF Summary", 20, 20);
  
      // Calculate image dimensions with proper aspect ratio
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 20;
  
      // Add image to the first page
      doc.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
  
      // Check if content exceeds page height and add additional pages if needed
      if (imgHeight > pageHeight - 40) {
        const totalPagesNeeded = Math.ceil(imgHeight / (pageHeight - 40));
        
        for (let i = 1; i < totalPagesNeeded; i++) {
          doc.addPage();
          position = i * (pageHeight - 40) + 20;
          doc.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
        }
      }
  
      // Add page numbers to each page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - 20,
          pageHeight - 10
        );
      }
  
      // Save the PDF using the appropriate method
      if ((window as any).showSaveFilePicker) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: `pdf-summary-${new Date().getTime()}.pdf`,
            types: [
              {
                description: "PDF Files",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });
  
          const writableStream = await fileHandle.createWritable();
          const pdfBlob = doc.output("blob");
          await writableStream.write(pdfBlob);
          await writableStream.close();
        } catch (error) {
          console.error("Error saving PDF:", error);
          toast.error("Failed to save PDF. Please try again.");
        }
      } else {
        doc.save(`pdf-summary-${new Date().getTime()}.pdf`);
      }
  
      // Clean up
      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-500 text-white py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8" />
            PDF Summarizer
          </h1>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDF
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept="application/pdf"
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                </div>

                {totalPages !== null && (
                  <div className="bg-teal-50 p-3 rounded-md">
                    <p className="text-sm text-teal-700 flex items-center gap-2">
                      <FileIcon className="w-4 h-4" />
                      Total Pages: {totalPages}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Page
                    </label>
                    <input
                      type="number"
                      value={startPage}
                      onChange={(e) => setStartPage(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Page
                    </label>
                    <input
                      type="number"
                      value={endPage}
                      onChange={(e) => setEndPage(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Summary Type
                  </label>
                  <select
                    value={summaryType}
                    onChange={(e) => setSummaryType(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  >
                    <option value="brief">Brief Summary</option>
                    <option value="detailed">Detailed Summary</option>
                    <option value="cheatsheet">CheatSheet</option>
                  </select>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-teal-500 hover:bg-teal-600"
                  }`}
                >
                  {loading ? "Generating..." : "Generate Summary"}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-md p-6 min-h-[600px] relative">
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={!summary || pdfLoading}
                  className="p-2 text-gray-600 hover:text-teal-600 disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!summary}
                  className="p-2 text-gray-600 hover:text-teal-600 disabled:opacity-50"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Summary
              </h2>

              <div ref={summaryRef} className="prose max-w-none">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                    <p className="mt-4 text-gray-600">Generating summary...</p>
                  </div>
                ) : (
                  <ReactMarkdown
                    key={renderKey}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
                        if (inline) {
                          return <code className={className} {...props}>{children}</code>;
                        } 
                        const match = /language-(\w+)/.exec(className || '');
                        if (match && match[1] === 'latex') {
                          return (
                            <div className="latex-block" {...props as React.HTMLAttributes<HTMLDivElement>}>
                              <div
                                className="latex-content"
                                dangerouslySetInnerHTML={{ __html: Array.isArray(children) ? children.join('') : String(children) }}
                              />
                            </div>
                          );
                        }
                        return <pre className={className} {...props as React.HTMLAttributes<HTMLPreElement>}><code>{children}</code></pre>;
                      }
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Metadata */}
      {metadata && (
        <footer className="bg-teal-500 text-white py-4 px-4 mt-8">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2">
              <FileIcon className="w-5 h-5" />
              <span>Total Pages: {metadata.total_pages}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <span>Input Tokens: {metadata.prompt_tokens}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span>Output Tokens: {metadata.completion_tokens}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Processing Time: {metadata.total_time} sec</span>
            </div>
          </div>
        </footer>
      )}

      <ToastContainer position="top-right" />
    </div>
  );
}

// Implement proper LaTeX rendering
function renderMathInElement(element: HTMLElement, options: any) {
  const katex = (window as any).katex;
  if (!katex) {
    console.error("KaTeX not loaded properly");
    return;
  }

  const { delimiters, throwOnError } = options;
  const mathNodes: Node[] = [];

  // Find all text nodes that might contain LaTeX
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const text = node.nodeValue?.trim();
      if (text && delimiters.some((d: { left: string; right: string; }) => text.includes(d.left) && text.includes(d.right))) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    }
  });

  let node: Node | null;
  while ((node = walker.nextNode() as Node | null)) {
    const text = node.nodeValue?.trim();
    if (!text) continue;

    // Check each delimiter
    for (const delimiter of delimiters) {
      const regex = new RegExp(`${delimiter.left}([^${delimiter.right}]+)${delimiter.right}`, 'g');
      let match: RegExpExecArray | null;
      
      while ((match = regex.exec(text))) {
        const latex = match[1].trim();
        const mathNode = document.createElement('span');
        mathNode.className = 'katex';
        
        try {
          katex.render(latex, mathNode, {
            throwOnError,
            displayMode: delimiter.display
          });
        } catch (error) {
          console.error("Error rendering LaTeX:", error);
          mathNode.textContent = latex;
        }
        
        node.parentNode?.insertBefore(mathNode, node);
        mathNodes.push(mathNode);
      }
    }
  }

  // Remove original text nodes if they're empty after processing
  for (const node of mathNodes) {
    if (node.nextSibling?.nodeValue?.trim() === '') {
      node.parentNode?.removeChild(node.nextSibling);
    }
  }
}

export default App;