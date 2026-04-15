/**
 * AI EMAIL ORGANIZER - 2026 HYBRID EDITION
 * Combines Google's Primary Tab protection with Gemini's semantic labeling.
 */

const API_KEY = 'YOUR_API_KEY_HERE';
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + API_KEY;
const MAX_LABELS = 10;

function organizeEmails() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const today = new Date().toDateString();
  const lastRunDate = scriptProperties.getProperty('LAST_RUN_DATE');
  const PROCESSED_LABEL = "_processed"; // Our "shield" label
  
  // 1. Daily Reset Logic
  if (lastRunDate !== today) {
    scriptProperties.setProperty('DAILY_COUNT', '0');
    scriptProperties.setProperty('LAST_RUN_DATE', today);
  }

  let dailyCount = parseInt(scriptProperties.getProperty('DAILY_COUNT'));
  const DAILY_LIMIT = 20;

  if (dailyCount >= DAILY_LIMIT) {
    Logger.log("Daily Quota Reached. Stopping.");
    return; 
  }

  // 2. EXCLUSIONARY SEARCH: Only find unread emails WITHOUT our shield label
  const remainingQuota = DAILY_LIMIT - dailyCount;
  const threads = GmailApp.search(`is:unread -label:${PROCESSED_LABEL}`, 0, remainingQuota); 
  
  if (threads.length === 0) {
    Logger.log("No new unread emails to process.");
    return;
  }

  // Ensure shield label exists
  let shieldLabel = GmailApp.getUserLabelByName(PROCESSED_LABEL) || GmailApp.createLabel(PROCESSED_LABEL);

  threads.forEach((thread, index) => {
    try {
      if (index > 0) Utilities.sleep(15000); // RPM Protection

      const message = thread.getMessages()[0];
      const emailContext = `FROM: ${message.getFrom()}\nSUBJECT: ${message.getSubject()}\nBODY: ${message.getPlainBody().substring(0, 1000)}`;
      
      const geminiResponse = callGemini(emailContext, []);
      
      if (geminiResponse !== "Unknown") {
        applyHybridLogic(thread, geminiResponse, []);
        
        // 3. APPLY SHIELD: Mark as processed so we never burn quota on this again
        thread.addLabel(shieldLabel);
        
        dailyCount++;
        scriptProperties.setProperty('DAILY_COUNT', dailyCount.toString());
        Logger.log(`Processed ${dailyCount}/20: ${message.getSubject()}`);
      }
    } catch (e) {
      Logger.log("ERROR: " + e.toString());
    }
  });
}

function callGemini(emailText, currentLabels) {
  
  const promptText = `You are an Expert Information Taxonomist and Chief of Staff. Your goal is to organize a high-volume professional inbox into a clean, 10-category system.
  
  Instructions:
  1. Analyze the email context (Sender, Subject, Body).
  2. Assign exactly ONE label from your 10-label taxonomy.
  3. Determine if the email should be "KEEP" (stay in inbox) or "ARCHIVE" (move out of inbox).
  
  Taxonomy rules:
  - "Essential" (FIXED): Bank alerts, payment receipts, human-to-human personal/work threads, and verified bookings (actual tickets/confirmations).
  - "Tech Newsletters" (FIXED): Product strategy, AdTech deep-dives, AI engineering news (e.g., Medium, NAB Show).
  - DYNAMIC LABELS: Create up to 8 more based on volume. Good candidates: "Career Applications", "Financial Services", "Lifestyle", "Sailing & Outdoors".
  - FORBIDDEN: Never use "Important", "Promotions", "Social", "Updates", "Primary", or "Forums".
  
  Archiving_policy:
  - KEEP: Only "Essential", "Career Applications", and personal human messages.
  - ARCHIVE: Everything else (Marketplace, Newsletters, Social Media, Wellness, etc.).
  
  Examples:
  - Example 1: Tatcha Skincare Sales -> Marketplace | ARCHIVE
  - Example 2: Delta Flight 123 Confirmation -> Essential | KEEP
  - Example 3: Delta 20% Off Sale, Vrbo -> Marketplace | ARCHIVE
  - Example 4: LinkedIn Job Alert, Amazon Thank you for your application -> Career Applications | KEEP
  - Example 5: LinkedIn "You have 5 new views", "You have an invitation" -> Social Media | ARCHIVE
  - Example 6: Quora: "How to bake a cake" -> General News | ARCHIVE
  - Example 7: [Other examples] 
  
  Email to process:
  ${emailText}
  
  OUTPUT FORMAT: LabelName | Status`;

  const payload = {
    "contents": [{
      "parts": [{
        "text": promptText
      }]
    }]
  };
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(MODEL_URL, options);
    const responseText = response.getContentText();
    const json = JSON.parse(responseText);

    // This handles the response or returns "Unknown" if the AI hits a safety filter
    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      let result = json.candidates[0].content.parts[0].text.trim();
      return result;
    } else {
      Logger.log("API Response was empty or blocked. Raw response: " + responseText);
      return "Unknown | KEEP";
    }
  } catch (e) {
    Logger.log("Critical Script Error: " + e.toString());
    return "Unknown | KEEP";
  }
}

function applyHybridLogic(thread, geminiResponse, existingLabels) {
  const parts = geminiResponse.split('|');
  if (parts.length < 2) return;

  let labelName = parts[0].trim().replace(/[*#]/g, "");
  const status = parts[1].trim().toUpperCase();

  // Safety rename for all Gmail system categories
  const forbidden = ["important", "promotions", "social", "updates", "primary", "forums"];
  if (forbidden.includes(labelName.toLowerCase())) {
    labelName = (labelName.toLowerCase() === "important") ? "Essential" : labelName + " Vault";
  }

  // Handle Label Creation (Limit to 10 total)
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label && existingLabels.length < 10) {
    label = GmailApp.createLabel(labelName);
    existingLabels.push(labelName);
  } else if (!label) {
    // If we've hit 10 labels, put it in the most relevant existing one or a catch-all
    label = GmailApp.getUserLabelByName("General Updates") || GmailApp.createLabel("General Updates");
  }
  
  thread.addLabel(label);

  // ARCHIVE LOGIC
  // We only keep it in the inbox if Gemini explicitly said KEEP.
  if (status === "ARCHIVE") {
    thread.moveToArchive();
    Logger.log(`Result: [${labelName}] -> Archived`);
  } else {
    Logger.log(`Result: [${labelName}] -> Kept in Inbox`);
  }
}
