// Utility: Sleep for JS heavy sites
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// Extraction Functions
function extractLinkedIn() {
  const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.top-card-layout__title, h1.topcard__title');
  const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, a.topcard__org-name-link, .topcard__flavor, .job-details-jobs-unified-top-card__primary-description a');
  const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .topcard__flavor--bullet');
  
  let location = '';
  if (locationEl) {
    location = locationEl.innerText.trim();
  }

  if (titleEl || companyEl) {
    return {
      role: titleEl ? titleEl.innerText.trim() : document.title.split(' | ')[0],
      company: companyEl ? companyEl.innerText.trim() : '',
      location: location
    };
  }
  return null;
}

function extractGreenhouse() {
  const titleEl = document.querySelector('h1.app-title');
  const companyEl = document.querySelector('span.company-name');
  const locationEl = document.querySelector('div.location');
  
  if (titleEl) {
    return {
      role: titleEl.innerText.trim(),
      company: companyEl ? companyEl.innerText.trim().replace('at ', '') : getMeta('og:site_name'),
      location: locationEl ? locationEl.innerText.trim() : ''
    };
  }
  return null;
}

function extractLever() {
  const titleEl = document.querySelector('.posting-headline h2');
  const companyEl = getMeta('og:site_name');
  const locationEl = document.querySelector('.sort-by-time.posting-category');
  
  if (titleEl || getMeta('og:title')) {
    return {
      role: titleEl ? titleEl.innerText.trim() : getMeta('og:title'),
      company: companyEl || window.location.hostname.split('.')[0],
      location: locationEl ? locationEl.innerText.trim() : ''
    };
  }
  return null;
}

function extractIndeed() {
  const titleEl = document.querySelector('.jobsearch-JobInfoHeader-title');
  const companyEl = document.querySelector('[data-company-name="true"]');
  const locationEl = document.querySelector('[data-testid="inlineHeader-companyLocation"]');
  
  if (titleEl) {
    return {
      role: titleEl.innerText.trim(),
      company: companyEl ? companyEl.innerText.trim() : '',
      location: locationEl ? locationEl.innerText.trim() : ''
    };
  }
  
  // Try structured JSON-LD
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let script of scripts) {
    try {
      const data = JSON.parse(script.innerText);
      if (data && data["@type"] === "JobPosting") {
        return {
          role: data.title,
          company: data.hiringOrganization?.name || '',
          location: data.jobLocation?.address?.addressLocality || ''
        };
      }
    } catch(e) {}
  }
  return null;
}

function extractWorkday() {
  const titleEl = document.querySelector('[data-automation-id="jobPostingHeader"]');
  const companyEl = document.querySelector('[data-automation-id="jobPostingCompany"]');
  const locationEl = document.querySelector('[data-automation-id="locations"]');
  
  if (titleEl) {
    return {
      role: titleEl.innerText.trim(),
      company: companyEl ? companyEl.innerText.trim() : document.title.split('-')[0].trim(),
      location: locationEl ? locationEl.innerText.trim() : ''
    };
  }
  return null;
}

function extractGeneric() {
  const title = getMeta('og:title') || document.title;
  let company = getMeta('og:site_name');
  
  if (!company && title) {
    // Try to split title by common separators
    const parts = title.split(/[-|]/);
    if (parts.length > 1) {
      company = parts[parts.length - 1].trim();
    }
  }

  return {
    role: title ? title.split(/[-|]/)[0].trim() : '',
    company: company || '',
    location: ''
  };
}

function getMeta(name) {
  const meta = document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
  return meta ? meta.getAttribute('content') : null;
}

async function scrapeJobDetails() {
  const url = window.location.href;
  let data = null;

  // Workday / JS heavy check
  if (url.includes('myworkdayjobs.com') || url.includes('workday')) {
    await sleep(1200); // 1.2s delay for JS rendering
    data = extractWorkday();
  } else if (url.includes('linkedin.com/jobs')) {
    data = extractLinkedIn();
  } else if (url.includes('greenhouse.io')) {
    data = extractGreenhouse();
  } else if (url.includes('jobs.lever.co')) {
    data = extractLever();
  } else if (url.includes('indeed.com')) {
    data = extractIndeed();
  }

  // Fallback
  if (!data || (!data.role && !data.company)) {
    data = extractGeneric();
  }
  
  if (!data) data = {};
  
  data.url = url;
  data.dateSaved = getTodayStr();

  // Basic Job Type guessing from text
  const bodyText = document.body.innerText.toLowerCase();
  if (bodyText.includes('internship') || bodyText.includes('intern ')) data.type = 'Internship';
  else if (bodyText.includes('contract')) data.type = 'Contract';
  else if (bodyText.includes('part-time') || bodyText.includes('part time')) data.type = 'Part-time';
  else data.type = 'Full-time'; // Default

  return data;
}

// Listen for messages from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getJobDetails") {
    scrapeJobDetails().then(data => {
      sendResponse(data);
    }).catch(err => {
      console.error(err);
      sendResponse({});
    });
    return true; // Keep message channel open for async response
  }
});
