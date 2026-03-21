const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docxPath = 'd:\\DOAN2\\HTSINHCAUHOITUDONG\\13_huynhphuochien_DoAnCoSo_02_dh22tin03.docx';

mammoth.extractRawText({path: docxPath})
    .then(function(result){
        const text = result.value; 
        fs.writeFileSync('d:\\DOAN2\\HTSINHCAUHOITUDONG\\extracted_text.txt', text);
        console.log('Text extracted to extracted_text.txt');
    })
    .catch(function(err){
        console.error(err);
    });
