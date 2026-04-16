# ai-email-organizer
This script organizes unread emails in Gmail using AI for semantic labeling and categorization, applying a daily processing limit.

# Designing a "Zero-Cost" AI Chief of Staff: How I Saved 2 hours a Week Using Gemini 3 Flash

As a Senior Technical Product Manager, my inbox is a constant flood of data. Between recruiter outreach, deep-tech newsletters, and local community updates, I was losing 15–30 minutes every single day just triaging emails.

I didn't want a "dumb" filter that looks for keywords; I wanted an assistant that understands intent. So, I built one. Using Google Apps Script and the Gemini 3 Flash API, I created a "Chief of Staff" that categorizes and archives my mail automatically. This project has reclaimed my morning focus and opened the door for even cooler automations, like a weekly "Tech Feed" script that summarizes my newsletter label every Friday.

# Step-by-Step Setup: From Zero to Automated
If you want to replicate this, here is the exact path I took:
1. **API Generation:** Go to [Google AI Studio](https://aistudio.google.com/) and create a free API Key. Note: I used a variable for the MODEL_URL to ensure I can easily swap in the latest model (like Gemini 3 Flash) as Google releases updates.
2. **Script Environment:** Open Gmail, click the three dots on any email > "More" > "Script Editor" (or go to script.google.com).
3. **Code Deployment:** Copy the final script (in repo) into the editor. I included try-catch blocks and Logger.log statements specifically to help debug API response formats.
4. **Testing:** Run the organizeEmails function manually first. Check the Execution Log to see how the AI is thinking.
5. **Triggers:** Once it’s working, go to the Triggers (Clock icon) and set two Day Timers: one for 9 AM and one for 9 PM. This ensures you maximize the "Midnight Reset" of the API's free daily quota.

#  Architectural Decisions, Learnings, and Trade-offs
Building this wasn't just about writing code; it was about solving for constraints. Here is the breakdown of the "Engine" under the hood.

## 1. Architectural Decisions
1. **Dynamic Taxonomy vs. Hardcoding:** I chose to let Gemini invent tags on the fly rather than hardcoding them. This allows the system to adapt if I suddenly start a new hobby (like sailing) without me having to update the code.
2. **The "Shield Label" Pattern:** I created a _processed label to tag every email the AI touches. My search query specifically excludes this label (-label:_processed). This prevents the script from burning my limited API quota on the same email twice.
3. **The 10-Label Ceiling:** To prevent "Label Sprawl" (where the AI creates a new label for every single sender), I capped the system at 10 labels. This forces the AI to group related items, keeping my sidebar clean.
4. **Noise Reduction (Archive Logic):** I decided to archive anything the AI deems non-essential. If it’s not "Essential", it disappears from my main folder immediately.

## 2. Learnings from Problems
1. **Context is King (The Tatcha Lesson):** Initially, Gemini tagged marketing emails from Tatcha (promotional email) as "Essential." I realized the AI needed more than just a subject line. I provided 15 specific examples in the prompt, teaching it to distinguish between a Delta flight ticket (Essential) and a Delta discount offer (Archive).
2. **The "Stringify" Fix:** I ran into API errors where Gemini couldn't parse the email content. I solved this by using JSON.stringify on the payload to handle special characters and newlines in the email bodies correctly.
3. **System Label Conflicts:** At first, Gemini tried to use labels like "Promotions," which caused errors because those are reserved by Gmail. I added a "Forbidden" list to the prompt to force the AI to use custom names like "Promotions Vault" instead.
4. **Robust Debugging:** When the script failed early on, I added try-catch blocks to print the Raw API Response. This revealed that I was hitting quota limits, which led to the next big decision.

## 3. The Trade-offs
1. **Rate Limiting (RPM):** The Gemini Free Tier for API calls is slow. I had to implement a 15-second "sleep" timer between emails. It means a batch of 20 emails takes 5 minutes to run, but it’s 100% reliable.
2. **The 20-Request Daily Ceiling:** Since I can only process 20 emails a day for free in the Free Tier, I prioritized my "Primary" inbox. If I get 30 emails, the last 10 just wait for the next day's run.
3. **The "Safe Clause":** If the API fails or the AI is confused, the script defaults to Unknown | KEEP. It’s better to have a messy inbox than to accidentally archive a job offer because of a technical glitch.

# Final Thoughts
This project was a lesson in Resource-Constrained Design. By treating my API quota as a finite budget and my inbox as a data stream, I built a tool that feels truly premium without spending a cent.

Total **Time Saved:** ~1.5 hours per week. **Mental Clarity:** Priceless.

For anyone looking to replicate this: focus on your Examples. The code is the engine, but those examples are the "GPS" that tells the AI exactly where you want your data to go.
