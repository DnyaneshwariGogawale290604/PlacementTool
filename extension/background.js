// Set badge background color
chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });

// Function to update the badge count from API
async function updateBadgeCount() {
  try {
    const response = await fetch('http://localhost:8000/api/applications');
    if (!response.ok) return;
    const applications = await response.json();
    
    // Count active jobs (exclude Rejected and Ghosted)
    const activeJobs = applications.filter(app => 
      app.status !== 'Rejected' && app.status !== 'Ghosted'
    );
    
    const count = activeJobs.length;
    
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error fetching applications for badge:', error);
  }
}

// Initial update
updateBadgeCount();

// Listen for messages from popup to update badge
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateBadge") {
    updateBadgeCount();
  }
});
