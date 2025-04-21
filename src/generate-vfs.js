const fs = require('fs');
const path = require('path');

// Directory with font files
const fontDir = path.join(__dirname, '../public/fonts');
// Output file
const outputFile = path.join(__dirname, './assets/vfs_fonts.js');

// Create fonts object
const fonts = {};

// Function to convert file to base64
function fileToBase64(filePath) {
  const fileData = fs.readFileSync(filePath);
  return Buffer.from(fileData).toString('base64');
}

console.log('Starting font conversion...');

// Read font directory
fs.readdirSync(fontDir)
  .filter(file => file.endsWith('.ttf'))
  .forEach(file => {
    console.log(`Converting ${file}...`);
    const fontPath = path.join(fontDir, file);
    fonts[file] = fileToBase64(fontPath);
  });

// Create output
const output = `
// This file was automatically generated
window.pdfMake = window.pdfMake || {};
window.pdfMake.vfs = ${JSON.stringify(fonts, null, 2)};
`;

// Write to file
fs.writeFileSync(outputFile, output);

console.log(`VFS file created at ${outputFile}`);
console.log(`Processed ${Object.keys(fonts).length} font files.`); 