import React, { useState, useRef } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface ImportCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  placeId: number;
  onImportCSV: (file: File) => Promise<{ total_rows: number; successful: number; failed: number; errors: any[] }>;
}

const ImportCustomersModal: React.FC<ImportCustomersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  placeId,
  onImportCSV
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ total_rows: number; successful: number; failed: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setImportResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setImportResult(null);
    
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setIsLoading(true);
    try {
      const result = await onImportCSV(file);
      setImportResult(result);
      
      if (result.failed === 0) {
        // All successful, close modal after a delay
        setTimeout(() => {
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      setError(error.message || 'Failed to import customers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFile(null);
      setError(null);
      setImportResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const downloadExampleCSV = () => {
    const csvContent = 'name,email,phone\nJohn Doe,john.doe@example.com,+1234567890\nJane Smith,jane.smith@example.com,\nBob Johnson,bob.johnson@example.com,+9876543210';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border border-[#E0E0E0] w-full max-w-2xl shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-[#333333] flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <ArrowUpTrayIcon className="h-6 w-6 mr-2 text-[#1E90FF]" />
            Import Customers from CSV
          </h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-[#9E9E9E] hover:text-[#333333] disabled:opacity-50 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* CSV Format Instructions */}
        <div className="mb-6 p-4 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0]">
          <h4 className="text-sm font-semibold text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            CSV Format Requirements:
          </h4>
          <ul className="text-sm text-[#666666] space-y-1 mb-3" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            <li>• Required columns: <strong>name</strong>, <strong>email</strong></li>
            <li>• Optional column: <strong>phone</strong></li>
            <li>• First row must contain column headers</li>
            <li>• Email addresses must be valid format</li>
          </ul>
          <button
            type="button"
            onClick={downloadExampleCSV}
            className="inline-flex items-center text-sm text-[#1E90FF] hover:text-[#1877D2] underline"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Download Example CSV Template
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>{error}</p>
          </div>
        )}

        {importResult && (
          <div className={`mb-4 p-4 rounded-lg border ${
            importResult.failed === 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <h4 className="text-sm font-semibold text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Import Results:
            </h4>
            <div className="text-sm text-[#666666] space-y-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              <p>Total rows: <strong>{importResult.total_rows}</strong></p>
              <p className="text-green-600">Successful: <strong>{importResult.successful}</strong></p>
              {importResult.failed > 0 && (
                <p className="text-red-600">Failed: <strong>{importResult.failed}</strong></p>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-[#333333] mb-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  Errors:
                </p>
                <ul className="text-xs text-red-600 space-y-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {importResult.errors.slice(0, 10).map((err: any, idx: number) => (
                    <li key={idx}>
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li>... and {importResult.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
              Select CSV File *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] transition-colors file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1E90FF] file:text-white hover:file:bg-[#1877D2] file:cursor-pointer"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
              disabled={isLoading}
              required
            />
            {file && (
              <p className="mt-2 text-sm text-[#666666]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-[#333333] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              {importResult && importResult.failed === 0 ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isLoading || !file}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#1E90FF] rounded-lg hover:bg-[#1877D2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E90FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0px_2px_8px_rgba(0,0,0,0.1)]"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Import Customers
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportCustomersModal;

