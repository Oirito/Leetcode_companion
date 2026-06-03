// ===== LeetCode Companion: Content Script =====

(function () {
  // Extract problem slug from URL
  const pathParts = window.location.pathname.split("/");
  const slug = pathParts[2];
  if (!slug) return;

  // Load insights data
  fetch(chrome.runtime.getURL("insights.json"))
    .then(res => res.json())
    .then(data => {
      const insight = data[slug];
      if (!insight) return;

      createPanel(insight, slug);
    })
    .catch(err => {
      console.error("LeetCode Companion: Failed to load insights", err);
    });

  function createPanel(insight, slug) {
    const difficulty = (insight.difficulty || "Medium").toLowerCase();
    const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    // Create main panel
    const panel = document.createElement("div");
    panel.id = "lc-companion-panel";

    panel.innerHTML = `
      <div class="lc-panel-body">
        <div class="lc-panel-header">
          <span class="lc-panel-title">
            <span>🧠</span> Optimal Approach
          </span>
          <button class="lc-panel-toggle" id="lc-toggle-btn" title="Collapse">−</button>
        </div>
        <div class="lc-panel-content">
          <span class="lc-difficulty-badge ${difficulty}">${diffLabel}</span>

          <div class="lc-detail-row">
            <div class="lc-detail-label">Pattern</div>
            <div class="lc-detail-value">${insight.pattern}</div>
          </div>

          <div class="lc-divider"></div>

          <div class="lc-detail-row">
            <div class="lc-detail-label">Time Complexity</div>
            <div class="lc-detail-value"><span class="lc-complexity">${insight.time}</span></div>
          </div>

          <div class="lc-detail-row">
            <div class="lc-detail-label">Space Complexity</div>
            <div class="lc-detail-value"><span class="lc-complexity">${insight.space}</span></div>
          </div>

          <div class="lc-divider"></div>

          <div class="lc-detail-row">
            <div class="lc-detail-label">Approach</div>
            <div class="lc-detail-value">${insight.approach}</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Create FAB (floating action button) for when panel is minimized
    const fab = document.createElement("button");
    fab.id = "lc-companion-fab";
    fab.innerHTML = "🧠";
    fab.title = "Show Optimal Approach";
    document.body.appendChild(fab);

    // Toggle collapse/expand
    const toggleBtn = panel.querySelector("#lc-toggle-btn");

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel.classList.contains("collapsed")) {
        // Expand
        panel.classList.remove("collapsed");
        toggleBtn.textContent = "−";
        toggleBtn.title = "Collapse";
      } else {
        // Collapse
        panel.classList.add("collapsed");
        toggleBtn.textContent = "+";
        toggleBtn.title = "Expand";
      }
    });

    // FAB to show panel
    fab.addEventListener("click", () => {
      panel.style.display = "block";
      fab.style.display = "none";
      panel.classList.remove("collapsed");
      toggleBtn.textContent = "−";
    });

    // Make panel draggable by header
    let isDragging = false;
    let startX, startY, panelStartX, panelStartY;

    const header = panel.querySelector(".lc-panel-header");
    header.style.cursor = "grab";

    header.addEventListener("mousedown", (e) => {
      if (e.target === toggleBtn) return;
      isDragging = true;
      header.style.cursor = "grabbing";
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      panelStartX = rect.left;
      panelStartY = rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = (panelStartX + dx) + "px";
      panel.style.top = (panelStartY + dy) + "px";
      panel.style.right = "auto";
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = "grab";
      }
    });
  }
})();