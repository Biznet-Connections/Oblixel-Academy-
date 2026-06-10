// Simple PDF service without Puppeteer (works on Termux)
// This generates HTML that can be printed as PDF

function generateCertificateHTML(certificateData) {
  const { certificateId, studentName, courseName, score, issueDate } = certificateData;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate - ${courseName}</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .certificate {
      width: 800px;
      margin: 50px auto;
      padding: 40px;
      border: 10px solid #8b5cf6;
      text-align: center;
      background: linear-gradient(135deg, #fff 0%, #f0f0ff 100%);
    }
    h1 { font-size: 48px; color: #2c3e50; margin-bottom: 20px; }
    h2 { font-size: 24px; color: #8b5cf6; margin-bottom: 30px; }
    .student-name { font-size: 32px; color: #06b6d4; margin: 30px 0; font-weight: bold; }
    .course-name { font-size: 24px; color: #8b5cf6; margin: 20px 0; }
    .score { font-size: 18px; margin: 20px 0; }
    .certificate-id { font-size: 12px; color: #7f8c8d; margin-top: 40px; }
    .date { font-size: 14px; margin-top: 20px; }
    .seal { margin-top: 30px; font-size: 12px; color: #555; }
    @media print {
      body { margin: 0; padding: 0; }
      .certificate { margin: 0; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <h1>OBliXel Academy</h1>
    <h2>CERTIFICATE OF COMPLETION</h2>
    <p>This is to certify that</p>
    <div class="student-name">${studentName}</div>
    <p>has successfully completed</p>
    <div class="course-name">${courseName}</div>
    <p>with a score of ${score}%</p>
    <div class="certificate-id">Certificate ID: ${certificateId}</div>
    <div class="date">Issued on: ${issueDate}</div>
    <div class="seal">OBliXel Academy | Authorized Certification</div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
}

function generateReceiptHTML(receiptData) {
  const { receiptNo, date, clientName, description, amount, method } = receiptData;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${receiptNo}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .receipt {
      width: 700px;
      margin: 50px auto;
      padding: 30px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #8b5cf6;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .company-name { font-size: 28px; font-weight: bold; color: #2c3e50; }
    .receipt-title { font-size: 20px; text-align: center; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #7f8c8d; }
    @media print {
      body { margin: 0; padding: 0; }
      .receipt { margin: 0; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="company-name">OBliXel Academy</div>
      <div>Professional Certification Platform</div>
    </div>
    <div class="receipt-title">PAYMENT RECEIPT</div>
    <table>
      <tr><th>Receipt No</th><td>${receiptNo}</td></tr>
      <tr><th>Date</th><td>${date}</td></tr>
      <tr><th>Client Name</th><td>${clientName}</td></tr>
      <tr><th>Description</th><td>${description}</td></tr>
      <tr><th>Payment Method</th><td>${method}</td></tr>
      <tr><th>Amount Paid</th><td>$${amount.toFixed(2)} USD</td></tr>
    </table>
    <div class="total">Total: $${amount.toFixed(2)} USD</div>
    <div class="footer">Thank you for choosing OBliXel Academy!</div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
}

async function generateCertificatePDF(certificateData) {
  // On Termux, return HTML that can be printed
  return { html: generateCertificateHTML(certificateData), type: 'html' };
}

async function generateReceiptPDF(receiptData) {
  // On Termux, return HTML that can be printed
  return { html: generateReceiptHTML(receiptData), type: 'html' };
}

module.exports = { generateCertificatePDF, generateReceiptPDF, generateCertificateHTML, generateReceiptHTML };
