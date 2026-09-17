import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

interface FilePickerProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string;
  label?: string;
}

export const AttractiveFilePicker: React.FC<FilePickerProps> = ({
  onFileSelect,
  acceptedFormats = ".pdf,.pptx,.docx,.zip",
  label = "Upload Deliverable / IEEE Paper"
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
      
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-[#111111] bg-[#EDE7DB] scale-[1.01]"
              : "border-[#D8CCBA] hover:border-[#111111] bg-[#F8F5EE] hover:bg-[#F3EFE6]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptedFormats}
            onChange={handleChange}
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center mb-3 shadow-xs border border-[#D8CCBA]">
            <UploadCloud size={22} />
          </div>
          <p className="text-xs font-serif font-bold text-[#111111]">
            Click to upload or drag &amp; drop
          </p>
          <p className="text-[11px] text-[#75695A] mt-1">
            Supported formats: PDF, PPTX, DOCX, ZIP (Max: 25MB)
          </p>
        </div>
      ) : (
        <div className="bg-[#F3EFE6] border border-[#D8CCBA] rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#111111] text-[#F8F5EE] flex items-center justify-center shadow-subtle border border-[#292725]">
              <FileText size={18} />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-[#111111] max-w-[200px] sm:max-w-xs truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-[#75695A] font-semibold mt-0.5">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to Submit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="p-1.5 rounded-lg text-[#75695A] hover:text-[#7C3838] hover:bg-white/60 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AttractiveFilePicker;
