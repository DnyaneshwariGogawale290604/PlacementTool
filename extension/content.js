// Utility: Sleep for JS heavy sites
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// 1. First line of defense: Structured Data (JSON-LD)
// Almost all modern job boards (LinkedIn, Greenhouse, Lever, Indeed) use schema.org/JobPosting
function extractJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let script of scripts) {
    try {
      const data = JSON.parse(script.innerText);
      const items = Array.isArray(data) ? data : [data];
      
      for (let item of items) {
        // Sometimes the JobPosting is nested inside a @graph array
        let job = item;
        if (item["@graph"]) {
          job = item["@graph"].find(g => g["@type"] === "JobPosting") || item;
        }

        if (job["@type"] === "JobPosting") {
          let location = '';
          if (job.jobLocation) {
            const loc = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
            if (loc.address) {
              location = [loc.address.addressLocality, loc.address.addressRegion, loc.address.addressCountry]
                .filter(Boolean).join(', ');
            }
          }

          return {
            role: job.title || '',
            company: job.hiringOrganization?.name || '',
            location: location
          };
        }
      }
    } catch(e) {
      // Ignore JSON parse errors
    }
  }
  return null;
}

// 2. Specific Platform Fallbacks
function extractLinkedIn() {
  let title = '';
  let company = '';
  let location = '';

  // 1. Title is almost always an H1 on the page. We take the main one.
  const h1s = Array.from(document.querySelectorAll('h1'));
  if (h1s.length > 0) {
    // The actual job title h1 is usually visible and not empty
    const jobTitleH1 = h1s.find(h => h.innerText.trim().length > 0);
    if (jobTitleH1) title = jobTitleH1.innerText.trim();
  }

  // Fallback to title tag for the role if h1 fails
  if (!title) {
    title = document.title.split(' | ')[0].replace(' hiring ', ' - ').split(' - ')[0].trim();
  }

  // 2. Company Name: Highly aggressive search
  // Pattern A: It's an anchor tag that immediately follows the title or is inside a primary description container.
  const topCardLinks = Array.from(document.querySelectorAll('.job-details-jobs-unified-top-card__primary-description a, .job-details-jobs-unified-top-card__company-name a, a.app-aware-link'));
  
  // Filter out known bad links
  const validCompanyLinks = topCardLinks.filter(a => {
    const text = a.innerText.trim().toLowerCase();
    return text.length > 0 && !text.includes('linkedin') && !text.includes('connections') && !text.includes('alumni');
  });

  if (validCompanyLinks.length > 0) {
    company = validCompanyLinks[0].innerText.trim();
  }

  // Pattern B: Look at the image alt text for the company logo.
  // The logo is usually a square image near the top.
  if (!company) {
    const images = Array.from(document.querySelectorAll('img'));
    const logoImg = images.find(img => img.alt && img.alt.toLowerCase().includes('logo') && !img.alt.toLowerCase().includes('linkedin'));
    if (logoImg) {
      company = logoImg.alt.replace(/logo/i, '').trim();
    }
  }

  // Pattern C: Document title fallback (e.g. "Google hiring Software Engineer...")
  if (!company && document.title.includes(' hiring ')) {
    company = document.title.split(' hiring ')[0].trim();
  }

  // 3. Location: Usually a span right next to the company name, containing a middle dot or just text.
  const tvmTexts = Array.from(document.querySelectorAll('.tvm__text, .job-details-jobs-unified-top-card__bullet'));
  if (tvmTexts.length > 0) {
    location = tvmTexts[0].innerText.trim();
  }

  // Clean up location if it caught extra bullet points
  if (location && location.includes('·')) {
    location = location.split('·')[0].trim();
  }

  // Clean up Company Name
  if (company) {
    company = company.replace(/Company\s*for,?\s*/ig, '') // Remove "Company for, "
                     .replace(/logo/ig, '')               // Remove "logo"
                     .replace(/\.$/, '')                  // Remove trailing period if any
                     .trim();
  }

  if (title || company) {
    return {
      role: title,
      company: company,
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
  
  // 1. Try JSON-LD structured data first (most accurate for most sites)
  let data = extractJsonLd();

  // 2. If JSON-LD is missing or incomplete, fall back to DOM scraping
  if (!data || !data.role || !data.company || (data.company.toLowerCase() === 'linkedin')) {
    let domData = null;

    if (url.includes('myworkdayjobs.com') || url.includes('workday')) {
      await sleep(1200); // 1.2s delay for JS rendering
      domData = extractWorkday();
    } else if (url.includes('linkedin.com/jobs')) {
      domData = extractLinkedIn();
    } else if (url.includes('greenhouse.io')) {
      domData = extractGreenhouse();
    } else if (url.includes('jobs.lever.co')) {
      domData = extractLever();
    } else if (url.includes('indeed.com')) {
      domData = extractIndeed();
    }

    // Merge DOM data into data if JSON-LD missed anything
    if (domData) {
      if (!data) data = domData;
      else {
        if (!data.role) data.role = domData.role;
        if (!data.company || data.company.toLowerCase() === 'linkedin') data.company = domData.company;
        if (!data.location) data.location = domData.location;
      }
    }
  }

  // 3. Final generic fallback
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

