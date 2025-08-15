CSV Tools - Prototype

This is a small client-side prototype that:
- Lets you upload a CSV
- Enter a simple Excel-like formula (e.g. =A*B+C or =[Price]*[Qty])
- Applies the formula per row and shows a table + bar chart

How to use:
1. Open `index.html` in a browser (or serve it via a static server)
2. Upload a CSV file with headers in the first row
3. Enter a formula and click Apply

Notes:
- Column letters (A,B,C) map to headers in the CSV first row
- You can also use column names in square brackets, e.g. =[Price]*[Qty]
- This prototype uses PapaParse and Chart.js from CDN

When you're ready I can:
- Add more Excel functions (IF, VLOOKUP/XLOOKUP mapping)
- Add CSV download of results
- Wrap in a Docker static server (nginx) if you want to test quickly
