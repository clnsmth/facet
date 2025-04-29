let conceptCounts = {};
let filterMode = "OR";
let dynamicRecords = [];
const conceptMap = {};

function updateConceptCounts(records) {
  conceptCounts = {};
  records.forEach(record => {
    const uniqueConcepts = new Set(record.concepts);
    uniqueConcepts.forEach(cid => {
      conceptCounts[cid] = (conceptCounts[cid] || 0) + 1;
    });
  });

  // Roll up counts from top-level concepts
  const topLevelConcepts = Object.values(conceptMap).filter(
    c => !Object.values(conceptMap).some(other => other.narrower?.includes(c.id))
  );
  topLevelConcepts.forEach(c => rollupCounts(c.id));
}

function rollupCounts(conceptId) {
  const concept = conceptMap[conceptId];
  let total = conceptCounts[conceptId] || 0;
  if (concept.narrower && concept.narrower.length > 0) {
    concept.narrower.forEach(childId => {
      total += rollupCounts(childId);
    });
  }
  conceptCounts[conceptId] = total;
  return total;
}

function labelWithCount(concept) {
  const count = conceptCounts[concept.id] || 0;
  return `${concept.label} (${count})`;
}

document.addEventListener("DOMContentLoaded", () => {
  vocabulary.concepts.forEach(c => conceptMap[c.id] = c);

  const form = document.getElementById("concept-form");
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search concepts...";
  searchInput.id = "concept-search";
  form.appendChild(searchInput);

  const ul = document.createElement("ul");
  const topLevelConcepts = vocabulary.concepts.filter(c => !Object.values(conceptMap).some(other => other.narrower.includes(c.id)));
  topLevelConcepts.forEach(concept => ul.appendChild(buildTree(concept.id)));
  form.appendChild(ul);

  const selectedTiles = document.getElementById("selected-tiles");
  const resultList = document.getElementById("result-list");

  document.getElementById("and-mode").addEventListener("click", () => {
    filterMode = "AND";
    document.getElementById("and-mode").classList.add("active");
    document.getElementById("or-mode").classList.remove("active");
    updateResults();
  });

  document.getElementById("or-mode").addEventListener("click", () => {
    filterMode = "OR";
    document.getElementById("or-mode").classList.add("active");
    document.getElementById("and-mode").classList.remove("active");
    updateResults();
  });

  fetch("metadata/index.json").then(res => res.json()).then(fileList => {
    const parser = new DOMParser();
    Promise.all(fileList.map(filename =>
      fetch("metadata/" + filename)
        .then(r => r.text())
        .then(xmlStr => {
          const xml = parser.parseFromString(xmlStr, "application/xml");
          const titles = xml.getElementsByTagNameNS("*", "title");
          const matchedConcepts = [];
          Array.from(titles).forEach(t => {
            const label = t.textContent.trim();
            const match = Object.values(conceptMap).find(c => c.label === label);
            if (match) matchedConcepts.push(match.id);
          });
          if (matchedConcepts.length > 0) {
            dynamicRecords.push({ filename, concepts: matchedConcepts });
          }
        })
    )).then(() => {
      updateConceptCounts(dynamicRecords);
      rebuildLabelsWithCounts();
      updateResults();
    });
  });

  function buildTree(conceptId) {
    const concept = conceptMap[conceptId];
    const li = document.createElement("li");
    li.dataset.label = concept.label.toLowerCase();
    li.dataset.id = concept.id;
    const container = document.createElement("div");
    const toggleBtn = document.createElement("span");
    toggleBtn.classList.add("toggle-button");
    toggleBtn.textContent = concept.narrower.length ? "▶" : "";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = concept.id;
    checkbox.value = concept.id;
    const label = document.createElement("label");
    label.htmlFor = concept.id;
    label.textContent = labelWithCount(concept);
    container.appendChild(toggleBtn);
    container.appendChild(checkbox);
    container.appendChild(label);
    li.appendChild(container);
    if (concept.narrower.length) {
      const ul = document.createElement("ul");
      ul.classList.add("narrower", "hidden");
      concept.narrower.forEach(narrowerId => ul.appendChild(buildTree(narrowerId)));
      li.appendChild(ul);
      toggleBtn.addEventListener("click", () => {
        ul.classList.toggle("hidden");
        toggleBtn.textContent = ul.classList.contains("hidden") ? "▶" : "▼";
      });
      checkbox.addEventListener("change", () => {
        ul.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = checkbox.checked);
        updateResults();
      });
    } else {
      checkbox.addEventListener("change", updateResults);
    }
    return li;
  }

  function updateResults() {
    const selected = Array.from(document.querySelectorAll("#concept-form input[type=checkbox]:checked")).map(cb => cb.value);
    let filtered = [];
    if (selected.length > 0) {
      filtered = dynamicRecords.filter(record =>
        filterMode === "AND"
          ? selected.every(concept => record.concepts.includes(concept))
          : selected.some(concept => record.concepts.includes(concept))
      );
    }
    resultList.innerHTML = "";
    resultList.innerHTML = filtered.length === 0 ? "<li>No matching records.</li>" : filtered.map(r => `<li>${r.filename}</li>`).join("");
    const selectedTiles = document.getElementById("selected-tiles");
    selectedTiles.innerHTML = "";
    selected.forEach(id => {
      const cb = document.getElementById(id);
      const tile = document.createElement("div");
      tile.classList.add("tile");
      tile.textContent = conceptMap[id]?.label || id;
      const btn = document.createElement("button");
      btn.textContent = "×";
      btn.onclick = () => { cb.checked = false; updateResults(); };
      tile.appendChild(btn);
      selectedTiles.appendChild(tile);
    });
  }

  function rebuildLabelsWithCounts() {
    document.querySelectorAll("#concept-form label").forEach(label => {
      const id = label.htmlFor;
      label.textContent = labelWithCount(conceptMap[id]);
    });
  }

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    const items = ul.querySelectorAll("li");
    if (!term) {
      items.forEach(item => {
        const ulChild = item.querySelector("ul.narrower");
        if (ulChild) ulChild.classList.add("hidden");
        const toggle = item.querySelector(".toggle-button");
        if (toggle) toggle.textContent = "▶";
        item.style.display = "";
      });
    } else {
      items.forEach(item => {
        const label = item.dataset.label || "";
        const matches = label.includes(term);
        const descendantMatches = Array.from(item.querySelectorAll("li")).some(child =>
          (child.dataset.label || "").includes(term)
        );
        if (matches || descendantMatches) {
          item.style.display = "";
          const ulChild = item.querySelector("ul.narrower");
          if (ulChild) ulChild.classList.remove("hidden");
          const toggle = item.querySelector(".toggle-button");
          if (toggle) toggle.textContent = "▼";
        } else {
          item.style.display = "none";
        }
      });
    }
  });
});
