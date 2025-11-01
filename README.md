# Google Sheets Daily Data Updater

This script automates the process of adding new daily data to a Google Sheet. It's designed to be run once a day, generating random data that simulates daily metrics and updating several sheets within a spreadsheet to reflect the new data.

## Prerequisites

Before you can run this script, you'll need the following:

- **Google Cloud Platform Project:** A GCP project with the Google Sheets API enabled.
- **Service Account:** A service account with credentials that have permission to edit the target Google Sheet.
- **Node.js:** Node.js installed on your system.
- **Dependencies:** The `googleapis` package, which can be installed via npm or yarn.

## Configuration

1. **Service Account Credentials:**
   - Place your service account's JSON key file in a secure location.
   - Update the `KEYFILEPATH` constant in the script to point to the location of your key file.

2. **Spreadsheet ID:**
   - Open your Google Sheet and copy the ID from the URL. The ID is the long string of characters between `/d/` and `/edit`.
   - Replace the placeholder value of the `SPREADSHEET_ID` constant with your actual spreadsheet ID.

## Script Functionality

### Date Logic

The script is designed to update the sheet for the correct month. It includes special logic for the first day of the month:

- If the script is run on the first day of a month (e.g., March 1st), it will target the sheet for the *previous* month (February).
- On any other day, it will target the sheet for the current month.

This ensures that data is always recorded in the correct monthly sheet, even if the script is run at the beginning of a new month.

### Data Generation

The script generates new data by taking the values from the previous day and applying a small, random percentage change (±10%). This creates a semi-realistic trend of daily fluctuations.

### Sheet Updates

The script interacts with three different sheets within the spreadsheet:

1.  **`Data {Month} {Year}`:** This is the main data sheet where the daily values are appended. The script dynamically determines the correct sheet name based on the current date.
2.  **`Flat Data`:** A sheet that likely contains a summary or a flattened version of the data. The script updates a cell in this sheet to reflect the total number of days passed.
3.  **`Dashboard`:** A dashboard sheet that displays the most recent data and weekly averages. The script updates cells on this sheet to reference the newly added data and to calculate the 7-day average.

## Dry Run Mode

The script includes a `dryRun` flag that allows you to test its functionality without making any actual changes to your Google Sheet. When `dryRun` is set to `true`, the script will log the actions it *would* have taken to the console, including the data that would have been written and the cells that would have been updated.

To perform a real update, you must set the `dryRun` flag to `false`.

## Running the Script

To run the script, navigate to its directory in your terminal and execute the following command:

```bash
node sheets-update-complete.js
```

## SQL Output

In addition to updating the Google Sheet, the script also generates and logs a SQL `INSERT` statement. This statement is formatted to insert the newly generated data into a MySQL table named `showcase_traffic_dashboard`. This can be useful for maintaining a database backup of your data or for integrating with other systems or, as is the case with us, to use a MySQL database as datasource for Looker Studio.
