
// Main JavaScript (with deduplicated counts)
let conceptCounts = {};

function updateConceptCounts(records) {
  conceptCounts = {};
  records.forEach(record => {
    const uniqueConcepts = new Set(record.concepts);
    uniqueConcepts.forEach(cid => {
      conceptCounts[cid] = (conceptCounts[cid] || 0) + 1;
    });
  });
}

function labelWithCount(concept) {
  const count = conceptCounts[concept.id] || 0;
  return `${concept.label} (${count})`;
}

let filterMode = "OR";
document.addEventListener("DOMContentLoaded", () => {
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

  fetch('metadata/index.json')
    .then(res => res.json())
    .then(fileList => {
      const parser = new DOMParser();
      dynamicRecords = [];
      Promise.all(fileList.map(filename =>
        fetch('metadata/' + filename)
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

  const conceptMap = {};
  vocabulary.concepts.forEach(c => {
    conceptMap[c.id] = c;
  });

  const form = document.getElementById('concept-form');
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search concepts...';
  searchInput.id = 'concept-search';
  form.appendChild(searchInput);

  const ul = document.createElement('ul');
  const topLevelConcepts = vocabulary.concepts.filter(c => !Object.values(conceptMap).some(other => other.narrower.includes(c.id)));
  topLevelConcepts.forEach(concept => {
    ul.appendChild(buildTree(concept.id));
  });
  form.appendChild(ul);

  const selectedTiles = document.getElementById('selected-tiles');
  const resultList = document.getElementById('result-list');

  function buildTree(conceptId) {
    const concept = conceptMap[conceptId];
    const li = document.createElement('li');
    li.dataset.label = concept.label.toLowerCase();
    li.dataset.id = concept.id;
    const container = document.createElement('div');
    const toggleBtn = document.createElement('span');
    toggleBtn.classList.add('toggle-button');
    toggleBtn.textContent = concept.narrower.length ? '▶' : '';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = concept.id;
    checkbox.value = concept.id;
    const label = document.createElement('label');
    label.htmlFor = concept.id;
    label.textContent = labelWithCount(concept);
    container.appendChild(toggleBtn);
    container.appendChild(checkbox);
    container.appendChild(label);
    li.appendChild(container);
    if (concept.narrower.length) {
      const ul = document.createElement('ul');
      ul.classList.add('narrower', 'hidden');
      concept.narrower.forEach(narrowerId => {
        ul.appendChild(buildTree(narrowerId));
      });
      li.appendChild(ul);
      toggleBtn.addEventListener('click', () => {
        ul.classList.toggle('hidden');
        toggleBtn.textContent = ul.classList.contains('hidden') ? '▶' : '▼';
      });
      checkbox.addEventListener('change', () => {
        const childCheckboxes = ul.querySelectorAll('input[type="checkbox"]');
        childCheckboxes.forEach(cb => {
          cb.checked = checkbox.checked;
        });
        updateResults();
      });
    } else {
      checkbox.addEventListener('change', updateResults);
    }
    return li;
  }

  function updateResults() {
    const selectedCheckboxes = Array.from(document.querySelectorAll('#concept-form input[type="checkbox"]:checked'));
    const selected = selectedCheckboxes.map(cb => cb.value);
    let filtered = [];
    if (selected.length > 0) {
      filtered = dynamicRecords.filter(record =>
        filterMode === "AND"
          ? selected.every(concept => record.concepts.includes(concept))
          : selected.some(concept => record.concepts.includes(concept))
      );
    }
    resultList.innerHTML = '';
    if (filtered.length === 0) {
      resultList.innerHTML = '<li>No matching records.</li>';
    } else {
      filtered.forEach(record => {
        const li = document.createElement('li');
        li.textContent = record.filename;
        resultList.appendChild(li);
      });
    }
    selectedTiles.innerHTML = '';
    selectedCheckboxes.forEach(cb => {
      const tile = document.createElement('div');
      tile.classList.add('tile');
      tile.textContent = conceptMap[cb.value]?.label || cb.value;
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.onclick = () => {
        cb.checked = false;
        updateResults();
      };
      tile.appendChild(closeBtn);
      selectedTiles.appendChild(tile);
    });
  }

  function rebuildLabelsWithCounts() {
    const labels = document.querySelectorAll('#concept-form label');
    labels.forEach(label => {
      const id = label.htmlFor;
      const concept = conceptMap[id];
      if (concept) {
        label.textContent = labelWithCount(concept);
      }
    });
  }
});
