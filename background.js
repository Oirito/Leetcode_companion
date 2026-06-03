// ===== LeetCode Companion: Background Service Worker =====

// Listen for badge update messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateBadge") {
    const streak = message.streak;
    const text = streak > 0 ? String(streak) : "";

    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#ff6d00" });

    // Store streak for periodic refresh
    chrome.storage.local.set({ lastStreak: streak });

    sendResponse({ success: true });
  }
});

// Set up periodic alarm to refresh streak badge (every 6 hours)
chrome.alarms.create("refreshStreak", {
  periodInMinutes: 360
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "refreshStreak") {
    try {
      const result = await chrome.storage.local.get(["username"]);
      if (!result.username) return;

      const response = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": "https://leetcode.com"
        },
        body: JSON.stringify({
          query: `
            query userProfileCalendar($username: String!, $year: Int) {
              matchedUser(username: $username) {
                userCalendar(year: $year) {
                  streak
                }
              }
            }
          `,
          variables: {
            username: result.username,
            year: new Date().getFullYear()
          }
        })
      });

      if (!response.ok) return;

      const data = await response.json();
      const streak = data?.data?.matchedUser?.userCalendar?.streak || 0;
      const text = streak > 0 ? String(streak) : "";

      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({ color: "#ff6d00" });
      chrome.storage.local.set({ lastStreak: streak });

    } catch (error) {
      console.error("Background streak refresh failed:", error);
    }
  }
});

// On install, restore badge from storage
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(["lastStreak"]);
  if (result.lastStreak) {
    chrome.action.setBadgeText({ text: String(result.lastStreak) });
    chrome.action.setBadgeBackgroundColor({ color: "#ff6d00" });
  }
});

// On startup, restore badge
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(["lastStreak"]);
  if (result.lastStreak) {
    chrome.action.setBadgeText({ text: String(result.lastStreak) });
    chrome.action.setBadgeBackgroundColor({ color: "#ff6d00" });
  }
});
