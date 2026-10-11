import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfGenerator {
  generate(elementId: string, filename: string): Promise<void>;
}

export class ClientPdfGenerator implements PdfGenerator {
  async generate(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found.`);
    }

    // Wait briefly to ensure rendering is complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Capture the canvas
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');

    // Calculate dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  }
}
