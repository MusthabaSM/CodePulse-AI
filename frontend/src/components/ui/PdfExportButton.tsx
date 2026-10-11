"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ClientPdfGenerator } from '../../lib/pdf/ClientPdfGenerator';

interface PdfExportButtonProps {
  targetId: string;
  filename: string;
  className?: string;
  buttonText?: string;
}

export function PdfExportButton({ targetId, filename, className, buttonText = "Export PDF Report" }: PdfExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    toast.loading('Generating PDF...', { id: 'pdf-toast' });
    try {
      const generator = new ClientPdfGenerator();
      await generator.generate(targetId, filename);
      toast.success('PDF Exported Successfully!', { id: 'pdf-toast' });
    } catch (err) {
      console.error("Failed to export PDF", err);
      toast.error("Failed to export PDF", { id: 'pdf-toast' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <button className={className} onClick={handleExport} disabled={exporting}>
      {exporting ? 'Generating PDF...' : buttonText}
    </button>
  );
}
