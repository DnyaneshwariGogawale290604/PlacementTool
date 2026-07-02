# Job Application Tracker & Pipeline Manager

A powerful, minimal Chrome Extension that helps you manage your entire job search pipeline directly from your browser. 
Now powered by a **Node.js/Express backend** with **MongoDB**, and integrated with **Tableau Public** for rich analytics!

## 🚀 Features

- **LeetHub-Style Dashboard**: Clean, minimal stats at a glance when you open the extension.
- **One-Click Saving**: Auto-extracts the job title, company, location, and URL from job boards.
- **Smart Extraction**: Detects details from LinkedIn, Greenhouse, Lever, Indeed, and Workday.
- **Auto Platform Detection**: The backend automatically categorizes your applications by platform (LinkedIn, Greenhouse, etc.) based on the URL.
- **Quick Status Updates**: Instantly recognizes already-saved jobs and lets you update your pipeline status with a single tap.
- **Pipeline Dashboard**: View all your saved jobs in one centralized, searchable dashboard.
- **Tableau Analytics Integration**: Export a clean CSV ready to be visualized in Tableau Public to track your funnel and response rates.
- **Secure Authentication**: Built-in JSON Web Token (JWT) authentication so multiple users can track their own independent job pipelines on the same deployed server without data mixing.

## 📦 Local Setup

Because this extension now uses a database, you need to run the backend server locally (or host it).

### 1. Start the Backend Server

1. Make sure you have [Node.js](https://nodejs.org/) and [MongoDB](https://www.mongodb.com/try/download/community) installed.
2. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server (runs on `http://localhost:8000` by default):
   ```bash
   npm start
   ```

*Note: You can configure the `PORT` and `MONGO_URI` in `backend/.env` (see `.env.example`). For production, you can easily host this Express app on the Render free tier and use a MongoDB Atlas free cluster.*

### 2. Install the Extension (Developer Mode)

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the `extension` folder from this repository.
5. Pin the extension to your toolbar!

### 3. Setup Tableau Analytics

1. Go to [Tableau Public](https://public.tableau.com/) and create a free account.
2. Check the `tableau/README_tableau.md` file in this repository for step-by-step instructions on building your dashboard using the provided `sample_data.csv`.
3. Once you publish your dashboard on Tableau Public, copy its URL.
4. Open `extension/config.js` and paste your URL into the `TABLEAU_URL` variable. Click the extension's reload icon in `chrome://extensions/` to apply the change.

## 🤝 Contributing
Contributions are welcome! If you notice that a specific job board is not scraping correctly (as layouts frequently change), feel free to open a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

