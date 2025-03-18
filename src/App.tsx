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


pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

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
        pdf_filename: data.pdf_filename ?? null, // <--- IMPORTANT
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
  };


  const handleDownloadPDF = async () => {
    if (!summary) return;
  
    const summaryElement = summaryRef.current;
    if (!summaryElement) {
      toast.error("Summary element not found");
      return;
    }
  
    try {
      // Show loading toast
      const loadingToast = toast.info("Generating PDF...", { autoClose: false });
  
      // Create PDF document
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });
  
      // Get PDF page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40; // Margins for content
  
      // Add header to the first page
      pdf.setFillColor(20, 184, 166);
      pdf.rect(0, 0, pageWidth, 60, 'F');
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text('PDF Summarizer', pageWidth / 2, 30, { align: 'center' });
      
      // Clone the summary element to work with
      const tempContainer = document.createElement('div');
      tempContainer.style.width = `${pageWidth - 2 * margin}px`;
      tempContainer.style.padding = `${margin}px`;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '12pt';
      tempContainer.style.lineHeight = '1.5';
      
      // Clone and append content
      const clonedContent = summaryElement.cloneNode(true);
      tempContainer.appendChild(clonedContent);
      document.body.appendChild(tempContainer);
      
      // Calculate how many elements fit on each page
      const contentElements = Array.from(tempContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, table, pre, blockquote'));
      
      if (contentElements.length === 0) {
        // If no elements found, try to use the text content directly
        const textContent = summaryElement.textContent || summary;
        const textLines = pdf.splitTextToSize(textContent, pageWidth - 2 * margin);
        
        // Add content starting from below the header on first page
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        
        let yPos = 80; // Start position below header
        const lineHeight = 15;
        
        for (let i = 0; i < textLines.length; i++) {
          // Check if we need a new page
          if (yPos > pageHeight - margin) {
            pdf.addPage();
            yPos = margin; // Reset Y position on new page
          }
          
          pdf.text(textLines[i], margin, yPos);
          yPos += lineHeight;
        }
      } else {
        // Initialize variables for multi-page rendering
        let currentPage = 1;
        let yPos = 80; // Start position below header on first page
        
        // Process each content element
        for (let i = 0; i < contentElements.length; i++) {
          const element = contentElements[i];
          
          // Create a canvas from this element
          const canvas = await html2canvas(element as HTMLElement, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
          });
          
          // Convert to image
          const imgData = canvas.toDataURL("image/png", 1.0);
          
          // Calculate dimensions while preserving aspect ratio
          const imgWidth = pageWidth - 2 * margin;
          const imgProps = pdf.getImageProperties(imgData);
          const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
          
          // Check if this element will fit on the current page
          if (yPos + imgHeight > pageHeight - margin) {
            // Add a new page
            pdf.addPage();
            currentPage++;
            yPos = margin; // Reset Y position
          }
          
          // Add image to PDF
          pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
          
          // Update Y position for next element
          yPos += imgHeight + 10; // Add some spacing between elements
        }
      }
      
      // Remove the temporary container
      document.body.removeChild(tempContainer);
      
      // Add page numbers
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10);
      }
      
      // Save PDF
      pdf.save('summary.pdf');
      
      // Close loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Error generating PDF: " + errorMessage);
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
                  disabled={!summary}
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

export default App;


