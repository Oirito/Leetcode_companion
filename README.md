LeetCode Companion Extension Summary
Here is a comprehensive breakdown of the extension, its architecture, the tools and APIs utilized, and the benefits of using it over the standard LeetCode website.

1. Extension Description & Steps Taken
The LeetCode Companion is a Chrome extension (Manifest V3) designed to enhance a user's LeetCode experience by providing instant stats tracking, contest details, and optimal problem-solving approaches directly on the problem page.

Here is a breakdown of how the extension is built and operates:

Manifest & Configuration (manifest.json): Configures the extension to use Manifest V3, requests necessary permissions (storage, alarms), and specifies host permissions to interact with https://leetcode.com/*. It declares background scripts, content scripts, and popups.
Background Service Worker (background.js): Runs in the background and sets up a Chrome Alarm to run every 6 hours. Its main job is to fetch the user's current streak and update the extension's badge icon (displaying the streak number with an orange background). It also listens to badge update requests from the popup.
Content Script (content.js & content.css): Injected automatically whenever you visit a LeetCode problem page (https://leetcode.com/problems/*). It extracts the problem name (slug) from the URL, checks a local database (insights.json), and creates a floating, draggable panel directly on your screen containing the optimal approach, time/space complexity, and coding patterns.
Popup UI (popup.html, popup.css, popup.js): The user interface that appears when you click the extension icon. It features a tabbed navigation system:
Dashboard: Displays daily streaks, solved problems (Easy, Medium, Hard), a 140-day activity heatmap, and badges.
Solved: Shows a list of the 30 most recent accepted submissions.
Contest: Displays contest rating, global rank, and contest-specific badges.
Insights: A searchable directory of optimal approaches loaded from the local JSON file.


2. Tools & Technologies Used
GraphQL: Instead of traditional REST APIs, the extension heavily uses GraphQL to query precise data structures from LeetCode's backend.
Chrome Extension APIs:
chrome.storage.local: To save the user's username and last known streak locally.
chrome.alarms: To run background tasks at scheduled intervals without keeping the script active constantly.
chrome.runtime: For sending messages between the popup UI and the background worker, and for resolving local asset URLs.
chrome.action: To dynamically change the text and color of the extension icon's badge.
Vanilla Web Technologies: Built using pure HTML, CSS, and JavaScript without heavy frameworks. It utilizes modern JS features (Promises, async/await, Fetch API) and custom CSS for sleek styling, heatmaps, and progress bars.
Local JSON Database (insights.json): A static JSON file bundled with the extension that acts as a local database for problem insights and optimal solutions.


4. Which API is Used?
The extension fetches all material from LeetCode's Official GraphQL API: https://leetcode.com/graphql.

By sending a POST request to this endpoint with specific queries and variables, the extension retrieves exactly what it needs. Some of the specific GraphQL queries used include:

userProfileCalendar: Retrieves the user's streak and activity calendar for the heatmap.
getUserProfile: Retrieves the count of easy, medium, and hard problems solved.
getContestStats: Retrieves contest ratings, global rankings, and top percentage.
recentAcSubmissions: Retrieves the latest successfully solved problems.
question: Retrieves difficulty metadata for specific problem slugs.

5. Why Use the Extension Instead of the Website?
While the LeetCode website is great, this extension provides several key advantages:

In-Context Optimal Approaches: On LeetCode, finding the optimal approach often requires digging through community solutions or paying for Premium Editorials. The extension's content script injects a floating, draggable panel with the optimal time/space complexity and approach directly on the problem page while you code.
Always-Visible Motivation: The extension badge sits in your browser toolbar and displays your active streak number. This constant visual reminder encourages daily consistency without even having to visit the LeetCode website.
Consolidated Dashboard: To see your streak, recent submissions, contest ratings, and heatmaps on the website, you often have to navigate to multiple different profile tabs. The extension aggregates all this critical data into one instant, beautiful popup view.
Fast, Offline-Ready Insights: The insights.json file allows you to instantly search through problem patterns and optimal approaches right from the popup, providing a lightning-fast reference guide without network lag.
