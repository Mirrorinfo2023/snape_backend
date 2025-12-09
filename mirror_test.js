const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const requestIp = require('request-ip');
const axios = require('axios');
const crypto = require('crypto');
const { parseString } = require('xml2js');

const bbpsConfig = {
  instituteId: "CV23",
  accessCode: "AVMU35FC06MQ20LKOG",
  workingKey: "F4DC2056224A8B67176155645619DFF3", // Must be 16 bytes for AES-128
  ver: "1.0",
  billFetchUrl: "https://api.billavenue.com/billpay/extBillCntrl/billFetchRequest/xml"
};

app.use(bodyParser.json());

function bbpsEncrypt(data, workingKey) {
  const iv = Buffer.alloc(16, 0); // 16 null bytes
  const cipher = crypto.createCipheriv('aes-128-cbc', workingKey, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}


function bbpsDecrypt(encryptedData, workingKey) {
  const iv = Buffer.alloc(16, 0);
  const decipher = crypto.createDecipheriv('aes-128-cbc', workingKey, iv);
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}



// ---------- XML BUILDER ----------
function buildBillFetchXML(payload) {
  const {
    biller_id,
    mobile_no,
    email_id,
    inputParam
  } = payload;

  let xml = `<BillFetchRequest>`;
  xml += `<BillerId>${biller_id}</BillerId>`;
  xml += `<CustomerMobile>${mobile_no}</CustomerMobile>`;
  xml += `<CustomerEmail>${email_id}</CustomerEmail>`;
  xml += `<CustomerParams>`;

  inputParam.paramInfo.forEach(param => {
    xml += `<CustomerParam>`;
    xml += `<Name>${param.paramName}</Name>`;
    xml += `<Value>${param.paramValue}</Value>`;
    xml += `</CustomerParam>`;
  });

  xml += `</CustomerParams>`;
  xml += `</BillFetchRequest>`;

  return xml;
}

// ---------- HELPER ----------
function parseXML(xml) {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ---------- ROUTE ----------
app.post('/api/bbps/bill-fetch', async (req, res) => {
  const requestId = Date.now().toString();
  const { billFetchUrl, accessCode, ver, instituteId, workingKey } = bbpsConfig;

  try {
    const billFetchXML = buildBillFetchXML(req.body);
    const encryptedXML = bbpsEncrypt(billFetchXML, workingKey);

    const fullUrl = `${billFetchUrl}?accessCode=${accessCode}&ver=${ver}&requestId=${requestId}&instituteId=${instituteId}`;

    const response = await axios.post(fullUrl, encryptedXML, {
      headers: { 'Content-Type': 'text/plain' }
    });
    
  res.status(200).json({  details: response.data });
    // const decryptedXML = bbpsDecrypt(response.data, workingKey);
    // const parsed = await parseXML(decryptedXML);

    // res.json({
    //   requestId,
    //   rawXML: decryptedXML, // For debugging - remove in prod
    //   data: parsed
    // });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch bill', details: err.message,fullUrl });
  }
});

const port = 4112;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});