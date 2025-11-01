// sheets-update-complete.js
const { google } = require('googleapis');
const path = require('path');

// Path to service account key
const KEYFILEPATH = '/home/<USERNAME>/.secrets/credentials.json';

// The ID of the spreadsheet (from its URL)
const SPREADSHEET_ID = '_IojkhdsAKlsdNuwdcssgSXsdjsQWOspcmnfjpLAAQmp'; // Replace this random id with your own spreadsheet ID

// Authenticate using the service account
async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

// --- Fixed date logic ---
function getTargetDate() {
  const today = new Date();
  // If it's the first of the month, we should use the *previous month* for the sheet
  const target = new Date(today);
  if (today.getDate() === 1) {
    target.setMonth(target.getMonth() - 1);
  }
  return target;
}

function yesterdaysDate() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

async function run() {
  const dryRun = true; // Set to false to perform actual updates

  const auth = await authenticate();
  const sheets = google.sheets({ version: 'v4', auth });

  // --- Use adjusted target date ---
  const target = getTargetDate();
  const month = target.toLocaleString('default', { month: 'long' });
  const year = target.getFullYear();
  const sheetName = `Data ${month} ${year}`;

  const mysqlDate = yesterdaysDate();
  if (dryRun) console.log(`[MySQL date] ${mysqlDate}`);
  if (dryRun) console.log(`[Target sheet] ${sheetName}`);

  const getValues = async (range) => {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      });
      return res.data.values || [];
    } catch (err) {
      if (err.code === 400 || err.code === 404) {
        console.warn(`[WARN] Sheet ${sheetName} not found or empty.`);
        return [];
      }
      throw err;
    }
  };

  const updateValues = async (range, values) => {
    if (dryRun) {
      console.log(`[DRY RUN] Would update range: ${range}`);
      console.table(values);
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      console.log(`Updated range: ${range}`);
    }
  };

  // Read existing sheet data
  const values = await getValues(`${sheetName}!A1:F32`);
  console.log(`[DEBUG] Retrieved ${values.length} rows from ${sheetName}!A1:F32`);

  // Find next empty row
  let rowCounter = values.findIndex(row => (row[1] ?? '') === '') + 1;
  if (rowCounter === 0) rowCounter = values.length + 1;

  // Get previous values safely (handle empty sheets)
  const previousRow = values[rowCounter - 2] || ['','100','100','100']; // Fallback base values
  const prevValues = previousRow.slice(1, 4);

  // Generate new values with small random change
  const newValues = prevValues.map(val => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const pctChange = (Math.random() * 0.2) - 0.1; // ±10%
      return Math.round(num * (1 + pctChange));
    }
    return val;
  });

  // Formulas
  const rowFormulas = [
    `=C${rowCounter}/D${rowCounter}`,
    `=B${rowCounter}/D${rowCounter}`
  ];
  const fullRow = [...newValues, ...rowFormulas];

  const sqlOutput = `INSERT INTO \`showcase_traffic_dashboard\` (\`Date\`,\`PV\`,\`VI\`,\`UC\`,\`VI_by_UC\`,\`PI_by_UC\`) VALUES ("${mysqlDate}", ${newValues[0]}, ${newValues[1]}, ${newValues[2]}, ${(newValues[1]/newValues[2]).toFixed(2)}, ${(newValues[0]/newValues[2]).toFixed(2)});`;

  // --- Apply updates ---
  await updateValues(`${sheetName}!B${rowCounter}:F${rowCounter}`, [fullRow]);
  await updateValues(`Flat Data!C2`, [[rowCounter - 1]]);

  const references = ['B', 'C', 'D'].map(col => `='${sheetName}'!${col}${rowCounter}`);
  await updateValues(`Dashboard!B3`, [references]);

  const divisor = Math.min(7, rowCounter - 1);
  const offset = Math.min(6, rowCounter - 2);
  const avgFormulas = ['B', 'C', 'D'].map(
    col => `=SUM('${sheetName}'!${col}${rowCounter - offset}:${col}${rowCounter})/${divisor}`
  );
  await updateValues(`Dashboard!B4`, [avgFormulas]);

  // --- Log summary ---
  if (dryRun) {
    console.log(`[DRY RUN] Would update row ${rowCounter} with:`, fullRow);
    console.log(`[DRY RUN] Would set days passed to: ${rowCounter - 1}`);
  } else {
    console.log(`Updated row ${rowCounter} with new values:`, fullRow);
    console.log(`Days passed: ${rowCounter - 1}`);
  }

  console.log(sqlOutput);
}

run().catch(console.error);
