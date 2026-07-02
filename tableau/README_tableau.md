# Tableau Public Analytics Integration

This guide walks you through setting up a Tableau Public dashboard for your Job Tracker using the exported CSV.

## 1. Sign Up for Tableau Public
1. Go to [Tableau Public](https://public.tableau.com/) and create a free account.
2. Download the Tableau Public Desktop app or use the Web Authoring tool.

## 2. Connect Your Data
1. Export your data from the extension (by clicking **View Analytics →** which will download the CSV, or using the API directly).
2. Alternatively, use the `sample_data.csv` in this folder to build the dashboard first.
3. In Tableau, click **Connect to Data** > **Text file** and select the CSV.

## 3. Build the Dashboard Views

### A. Funnel Chart (Wishlist → Applied → Interviewing → Offer)
1. Drag `Status` to **Rows**.
2. Filter `Status` to only include Wishlist, Applied, Interviewing, Offer.
3. Drag `id` (Count) to **Columns**.
4. Change the mark type to **Area** or **Bar** and sort descending.

### B. Bar Chart: Applications by Platform
1. Drag `Platform` to **Columns**.
2. Drag `id` (Count) to **Rows**.
3. Add `Status` to the **Color** mark to see the breakdown of responses per platform.

### C. Heatmap: Applications by Month
1. Drag `DateSaved` to **Columns** (set to Continuous Month/Year).
2. Drag `id` (Count) to **Color** on the Marks card.
3. Choose a square mark type to visualize high-activity months.

### D. Status Breakdown: Donut Chart
1. Create a pie chart with `Status` on **Color** and `id` (Count) on **Angle**.
2. Create a dual-axis chart with a smaller, white pie chart in the center to make it a donut.

## 4. Publish and Link
1. Click **File** > **Save to Tableau Public**.
2. Once published, copy the URL of your dashboard.
3. Open `extension/config.js` in your project and update the `TABLEAU_URL` variable with your link.
4. Now, clicking "View Analytics" in the extension will open your live dashboard!
