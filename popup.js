// ===== DOM REFERENCES =====
const saveBtn = document.getElementById("saveBtn");
const usernameInput = document.getElementById("username");
const dashboardContent = document.getElementById("dashboard-content");
const solvedContent = document.getElementById("solved-content");
const contestContent = document.getElementById("contest-content");
const insightsList = document.getElementById("insights-list");
const insightsSearch = document.getElementById("insights-search");
const noUserPrompt = document.getElementById("no-user-prompt");

// ===== TAB LOGIC =====
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(tc => tc.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// ===== SAVE BUTTON =====
saveBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username) return;
  chrome.storage.local.set({ username });
  loadAllData(username);
});

// ===== AUTO-LOAD =====
chrome.storage.local.get(["username"], (result) => {
  if (result.username) {
    usernameInput.value = result.username;
    loadAllData(result.username);
  }
});

// ===== LOAD ALL DATA =====
async function loadAllData(username) {
  noUserPrompt && (noUserPrompt.style.display = "none");
  const noContestPrompt = document.getElementById("no-contest-prompt");
  noContestPrompt && (noContestPrompt.style.display = "none");
  loadDashboard(username);
  loadSolved(username);
  loadContest(username);
  loadInsights();
}

// ===== GRAPHQL HELPER =====
async function lcQuery(query, variables) {
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    mode: "cors",
    credentials: "include",
    referrer: "https://leetcode.com/",
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://leetcode.com"
    },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadContestAndBadgeData(username) {
  try {
    const contestData = await lcQuery(`
      query getContestStats($username: String!) {
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          topPercentage
          totalParticipants
          badge {
            name
          }
        }
        matchedUser(username: $username) {
          badges {
            id
            displayName
            icon
          }
        }
      }
    `, { username });

    return {
      contestRanking: contestData.data?.userContestRanking || {},
      badges: contestData.data?.matchedUser?.badges || []
    };
  } catch (error) {
    console.warn("Contest/badge fetch failed:", error);
    return {
      contestRanking: {},
      badges: []
    };
  }
}

// ===== DASHBOARD =====
async function loadDashboard(username) {
  dashboardContent.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Fetching your stats...</p>
    </div>
  `;

  try {
    const [statsData, calendarData, contestAndBadges] = await Promise.all([
      lcQuery(`
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
      `, { username }),
      lcQuery(`
        query userProfileCalendar($username: String!, $year: Int) {
          matchedUser(username: $username) {
            userCalendar(year: $year) {
              activeYears
              streak
              totalActiveDays
              submissionCalendar
            }
          }
        }
      `, { username, year: new Date().getFullYear() }),
      loadContestAndBadgeData(username)
    ]);

    if (!statsData.data?.matchedUser || !calendarData.data?.matchedUser) {
      dashboardContent.innerHTML = `
        <div class="error-state">
          <div class="error-icon">❌</div>
          <p>User "<strong>${username}</strong>" not found</p>
        </div>
      `;
      return;
    }

    const stats = statsData.data.matchedUser.submitStats.acSubmissionNum;
    const calendar = calendarData.data.matchedUser.userCalendar;
    const contestRanking = contestAndBadges.contestRanking || {};
    const badges = contestAndBadges.badges || [];

    const total = stats[0].count;
    const easy = stats[1].count;
    const medium = stats[2].count;
    const hard = stats[3].count;

    const ratingLabel = contestRanking.rating != null ? Math.round(contestRanking.rating) : "—";
    const rankLabel = contestRanking.globalRanking != null ? contestRanking.globalRanking : "—";
    const topPercentLabel = contestRanking.topPercentage != null ? `${contestRanking.topPercentage}%` : "—";
    const contestsLabel = contestRanking.attendedContestsCount != null ? contestRanking.attendedContestsCount : "—";
    const contestBadgeLabel = contestRanking.badge?.name ? contestRanking.badge.name : null;

    const badgesHtml = badges.length > 0
      ? badges.slice(0, 10).map(badge => {
          let iconSrc = badge.icon || "";
          if (iconSrc && !iconSrc.startsWith("http")) {
            iconSrc = "https://leetcode.com" + iconSrc;
          }
          const label = badge.displayName || badge.id || "Badge";
          return `
            <div class="badge-pill" title="${label}">
              ${iconSrc ? `<img class="badge-pill-icon" src="${iconSrc}" alt="${label}">` : `<div class="badge-pill-placeholder">${label.slice(0, 2).toUpperCase()}</div>`}
              <span class="badge-pill-label">${label}</span>
            </div>
          `;
        }).join('')
      : `<div class="badges-empty">No badges found yet.</div>`;

    chrome.runtime.sendMessage({ type: "updateBadge", streak: calendar.streak });

    dashboardContent.innerHTML = `
      <!-- Streak Card -->
      <div class="streak-card">
        <div class="streak-fire">🔥</div>
        <div class="streak-count">${calendar.streak}</div>
        <div class="streak-label">Day Streak</div>
        <div class="streak-meta">
          <div class="streak-meta-item">
            <div class="streak-meta-value">${calendar.totalActiveDays}</div>
            <div class="streak-meta-label">Active Days</div>
          </div>
          <div class="streak-meta-item">
            <div class="streak-meta-value">${total}</div>
            <div class="streak-meta-label">Total Solved</div>
          </div>
        </div>
      </div>

      <!-- Contest Ranking -->
      <div class="achievement-card">
        <div class="achievement-row">
          <div>
            <div class="achievement-label">Contest Rating</div>
            <div class="achievement-value">${ratingLabel}</div>
            ${contestBadgeLabel ? `<div class="achievement-subtitle">${contestBadgeLabel}</div>` : ``}
          </div>
          <div class="achievement-score">
            <span class="achievement-score-value">${contestsLabel}</span>
            <span class="achievement-score-label">Contests Played</span>
          </div>
        </div>
        <div class="achievement-meta-grid">
          <div class="achievement-meta-item">
            <span class="achievement-meta-title">Rank</span>
            <span class="achievement-meta-value">${rankLabel}</span>
          </div>
          <div class="achievement-meta-item">
            <span class="achievement-meta-title">Top</span>
            <span class="achievement-meta-value">${topPercentLabel}</span>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card easy">
          <div class="stat-count">${easy}</div>
          <div class="stat-label">Easy</div>
        </div>
        <div class="stat-card medium">
          <div class="stat-count">${medium}</div>
          <div class="stat-label">Medium</div>
        </div>
        <div class="stat-card hard">
          <div class="stat-count">${hard}</div>
          <div class="stat-label">Hard</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-total">
            Solved <span class="progress-total-count">${total}</span> / ~3,300
          </span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill easy-fill" style="width: ${(easy / 3300 * 100).toFixed(1)}%"></div>
          <div class="progress-bar-fill medium-fill" style="width: ${(medium / 3300 * 100).toFixed(1)}%"></div>
          <div class="progress-bar-fill hard-fill" style="width: ${(hard / 3300 * 100).toFixed(1)}%"></div>
        </div>
      </div>

      <!-- Badges -->
      <div class="badges-section">
        <div class="badges-header">
          <div class="badges-title">Achievements & Badges</div>
          <div class="badge-count">${badges.length} earned</div>
        </div>
        <div class="badges-list">
          ${badgesHtml}
        </div>
      </div>

      <!-- Heatmap -->
      <div class="heatmap-section">
        <div class="heatmap-title">📅 Submission Activity</div>
        <div class="heatmap-grid" id="heatmap-grid"></div>
        <div class="heatmap-legend">
          <span>Less</span>
          <div class="heatmap-legend-cell heatmap-cell"></div>
          <div class="heatmap-legend-cell heatmap-cell level-1"></div>
          <div class="heatmap-legend-cell heatmap-cell level-2"></div>
          <div class="heatmap-legend-cell heatmap-cell level-3"></div>
          <div class="heatmap-legend-cell heatmap-cell level-4"></div>
          <span>More</span>
        </div>
      </div>
    `;

    renderHeatmap(calendar.submissionCalendar);

  } catch (error) {
    console.error("Dashboard error:", error);
    dashboardContent.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <p>Failed to load stats</p>
        <p style="margin-top:4px;font-size:11px;color:var(--text-muted)">${error.message}</p>
      </div>
    `;
  }
}

// ===== HEATMAP RENDERER =====
function renderHeatmap(submissionCalendarStr) {
  const grid = document.getElementById("heatmap-grid");
  if (!grid) return;

  let calendarData = {};
  try {
    const rawData = JSON.parse(submissionCalendarStr || "{}");
    for (const [timestamp, count] of Object.entries(rawData)) {
      // LeetCode timestamps are in seconds and represent midnight UTC of the given day
      const d = new Date(parseInt(timestamp) * 1000);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      calendarData[`${yyyy}-${mm}-${dd}`] = count;
    }
  } catch (e) {
    console.error("Calendar parse error:", e);
  }

  const now = new Date();
  const showDays = 140; // Show last 20 weeks (~140 days)
  const startShow = new Date(now);
  startShow.setDate(startShow.getDate() - showDays + 1);

  let html = '';
  for (let i = 0; i < showDays; i++) {
    const d = new Date(startShow);
    d.setDate(startShow.getDate() + i);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const count = calendarData[dateStr] || 0;

    let level = '';
    if (count >= 8) level = 'level-4';
    else if (count >= 5) level = 'level-3';
    else if (count >= 2) level = 'level-2';
    else if (count >= 1) level = 'level-1';

    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    html += `<div class="heatmap-cell ${level}" data-tooltip="${displayDate}: ${count} submissions"></div>`;
  }

  grid.innerHTML = html;
}

// ===== SOLVED TAB =====
async function loadSolved(username) {
  solvedContent.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading recent submissions...</p>
    </div>
  `;

  try {
    const data = await lcQuery(`
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
        }
      }
    `, { username, limit: 30 });

    if (!data.data?.recentAcSubmissionList) {
      solvedContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>No submissions found</p>
        </div>
      `;
      return;
    }

    const submissions = data.data.recentAcSubmissionList;

    if (submissions.length === 0) {
      solvedContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>No accepted submissions yet</p>
        </div>
      `;
      return;
    }

    // Fetch exact difficulties dynamically using GraphQL aliases
    const uniqueSlugs = [...new Set(submissions.map(s => s.titleSlug))];
    const aliasQuery = uniqueSlugs.map((slug, idx) => `
      q${idx}: question(titleSlug: "${slug}") { difficulty }
    `).join(' ');

    let diffMap = {};
    try {
      const diffData = await lcQuery(`query getDiffs { ${aliasQuery} }`);
      uniqueSlugs.forEach((slug, idx) => {
        diffMap[slug] = diffData.data[`q${idx}`]?.difficulty?.toLowerCase() || "medium";
      });
    } catch (e) {
      console.error("Difficulty fetch error:", e);
    }

    let html = '<div class="solved-list">';
    submissions.forEach(sub => {
      const difficulty = diffMap[sub.titleSlug] || "medium";
      const timeAgo = formatTimeAgo(parseInt(sub.timestamp) * 1000);
      const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      const icon = difficulty === "easy" ? "E" : difficulty === "hard" ? "H" : "M";

      html += `
        <a class="solved-item"
           href="https://leetcode.com/problems/${sub.titleSlug}/"
           target="_blank"
           rel="noopener">
          <div class="solved-icon ${difficulty}">${icon}</div>
          <div class="solved-info">
            <div class="solved-title">${sub.title}</div>
            <div class="solved-time">${timeAgo}</div>
          </div>
          <span class="solved-badge ${difficulty}">${diffLabel}</span>
        </a>
      `;
    });
    html += '</div>';

    solvedContent.innerHTML = html;

  } catch (error) {
    console.error("Solved error:", error);
    solvedContent.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <p>Failed to load submissions</p>
        <p style="margin-top:4px;font-size:11px;color:var(--text-muted)">${error.message}</p>
      </div>
    `;
  }
}

// ===== CONTEST TAB =====
async function loadContest(username) {
  contestContent.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Fetching contest details & badges...</p>
    </div>
  `;

  try {
    const data = await loadContestAndBadgeData(username);
    const contestRanking = data.contestRanking || {};
    const badges = data.badges || [];

    const ratingValue = contestRanking.rating != null ? Math.round(contestRanking.rating) : null;
    const ratingLabel = ratingValue != null ? ratingValue : "—";
    const rankLabel = contestRanking.globalRanking != null ? contestRanking.globalRanking.toLocaleString() : "—";
    const topPercentLabel = contestRanking.topPercentage != null ? `${contestRanking.topPercentage}%` : "—";
    const contestsLabel = contestRanking.attendedContestsCount != null ? contestRanking.attendedContestsCount : "—";
    const totalParticipants = contestRanking.totalParticipants != null ? contestRanking.totalParticipants.toLocaleString() : "—";

    // Determine badge rank level
    let badgeClass = "contestant";
    let badgeTitle = "Contestant";

    if (ratingValue != null) {
      if (ratingValue >= 2190) {
        badgeClass = "guardian";
        badgeTitle = "Guardian";
      } else if (ratingValue >= 1850) {
        badgeClass = "knight";
        badgeTitle = "Knight";
      }
    }

    if (contestRanking.badge?.name) {
      badgeTitle = contestRanking.badge.name;
    }

    // Build Badges HTML
    const badgesHtml = badges.length > 0
      ? badges.map(badge => {
          let iconSrc = badge.icon || "";
          if (iconSrc && !iconSrc.startsWith("http")) {
            iconSrc = "https://leetcode.com" + iconSrc;
          }
          const label = badge.displayName || badge.id || "Badge";
          return `
            <div class="contest-badge-card" title="${label}">
              <div class="contest-badge-icon-container">
                ${iconSrc ? `<img class="contest-badge-img" src="${iconSrc}" alt="${label}">` : `<div class="contest-badge-placeholder">${label.slice(0, 2).toUpperCase()}</div>`}
              </div>
              <div class="contest-badge-info">
                <div class="contest-badge-name">${label}</div>
                <div class="contest-badge-slug">${badge.displayName || 'LeetCode Badge'}</div>
              </div>
            </div>
          `;
        }).join('')
      : `<div class="badges-empty">No badges earned yet.</div>`;

    contestContent.innerHTML = `
      <!-- Contest Profile Card -->
      <div class="contest-profile-card ${badgeClass}">
        <div class="contest-profile-header">
          <div class="contest-profile-badge-tag">${badgeTitle}</div>
          <div class="contest-profile-rating-label">Contest Rating</div>
        </div>
        <div class="contest-profile-body">
          <div class="contest-rating-value">${ratingLabel}</div>
          <div class="contest-global-rank">
            <span>Global Rank</span>
            <strong>${rankLabel}</strong>
            <span class="total-participants">/ ${totalParticipants}</span>
          </div>
        </div>
        <div class="contest-profile-footer">
          <div class="contest-meta-cell">
            <span class="meta-cell-value">${contestsLabel}</span>
            <span class="meta-cell-label">Contests Played</span>
          </div>
          <div class="contest-meta-cell">
            <span class="meta-cell-value">${topPercentLabel}</span>
            <span class="meta-cell-label">Top Percent</span>
          </div>
        </div>
      </div>

      <!-- Badges Section -->
      <div class="contest-badges-section">
        <div class="section-title-container">
          <h3 class="contest-section-title">🏆 Earned Badges</h3>
          <span class="contest-badge-count-pill">${badges.length}</span>
        </div>
        <div class="contest-badges-grid">
          ${badgesHtml}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Contest loading error:", error);
    contestContent.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <p>Failed to load contest stats</p>
        <p style="margin-top:4px;font-size:11px;color:var(--text-muted)">${error.message}</p>
      </div>
    `;
  }
}

// ===== INSIGHTS TAB =====
let allInsights = {};

async function loadInsights() {
  try {
    const res = await fetch(chrome.runtime.getURL("insights.json"));
    allInsights = await res.json();
    renderInsights(allInsights);
  } catch (e) {
    insightsList.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <p>Failed to load insights</p>
      </div>
    `;
  }
}

function renderInsights(data) {
  const slugs = Object.keys(data);
  if (slugs.length === 0) {
    insightsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧠</div>
        <p>No insights available</p>
      </div>
    `;
    return;
  }

  let html = '';
  slugs.forEach(slug => {
    const item = data[slug];
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const diff = (item.difficulty || "Medium").toLowerCase();

    html += `
      <div class="insight-item" data-slug="${slug}">
        <div class="insight-header">
          <div class="insight-difficulty-dot ${diff}"></div>
          <div class="insight-name">${name}</div>
          <span class="insight-pattern-badge">${item.pattern}</span>
        </div>
        <div class="insight-details">
          <div class="insight-detail-row">
            <span class="insight-detail-label">Time</span>
            <span class="insight-detail-value"><span class="insight-complexity">${item.time}</span></span>
          </div>
          <div class="insight-detail-row">
            <span class="insight-detail-label">Space</span>
            <span class="insight-detail-value"><span class="insight-complexity">${item.space}</span></span>
          </div>
          <div class="insight-detail-row">
            <span class="insight-detail-label">Approach</span>
            <span class="insight-detail-value">${item.approach}</span>
          </div>
        </div>
      </div>
    `;
  });

  insightsList.innerHTML = html;

  // Expand/collapse click handlers
  insightsList.querySelectorAll(".insight-item").forEach(el => {
    el.addEventListener("click", () => {
      el.classList.toggle("expanded");
    });
  });
}

// Search/filter
insightsSearch.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderInsights(allInsights);
    return;
  }

  const filtered = {};
  Object.entries(allInsights).forEach(([slug, item]) => {
    const name = slug.replace(/-/g, ' ');
    if (
      name.includes(query) ||
      item.pattern.toLowerCase().includes(query) ||
      item.approach.toLowerCase().includes(query) ||
      (item.difficulty || '').toLowerCase().includes(query)
    ) {
      filtered[slug] = item;
    }
  });

  renderInsights(filtered);
});

// Load insights on start (even without username)
loadInsights();

// ===== UTILITIES =====
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}