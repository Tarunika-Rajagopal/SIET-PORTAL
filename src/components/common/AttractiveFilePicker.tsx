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
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-mint-500 bg-mint-50 scale-[1.01]"
              : "border-slate-300 hover:border-mint-500 bg-slate-50 hover:bg-mint-50/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptedFormats}
            onChange={handleChange}
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto rounded-full bg-mint-100 text-mint-700 flex items-center justify-center mb-3 shadow-inner">
            <UploadCloud size={24} />
          </div>
          <p className="text-xs font-bold text-slate-800">
            Click to upload or drag &amp; drop
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Supported formats: PDF, PPTX, DOCX, ZIP (Max: 25MB)
          </p>
        </div>
      ) : (
        <div className="bg-mint-50 border border-mint-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint-500 text-white flex items-center justify-center shadow-sm">
              <FileText size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 max-w-[200px] sm:max-w-xs truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-mint-800 font-semibold mt-0.5">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to Submit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AttractiveFilePicker;
