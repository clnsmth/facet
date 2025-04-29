const conceptMap = {};
vocabulary.concepts.forEach(c => {
  conceptMap[c.id] = c;
});

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
  label.textContent = concept.label;

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

function filterRecords(selectedConcepts) {
  return data.records.filter(record =>
    selectedConcepts.some(concept => record.concepts.includes(concept))
  );
}

const data = {
  "records": [
    { "id": "a1", "title": "Golden Retriever", "concepts": ["http://example.org/concept/dog"] },
    { "id": "a2", "title": "Bald Eagle", "concepts": ["http://example.org/concept/bird"] },
    { "id": "a3", "title": "Elephant", "concepts": ["http://example.org/concept/mammal"] }
  ]
};

function updateResults() {
  const selectedCheckboxes = Array.from(document.querySelectorAll('#concept-form input[type="checkbox"]:checked'));
  const selected = selectedCheckboxes.map(cb => cb.value);

  const filtered = filterRecords(selected);

  const resultList = document.getElementById('result-list');
  resultList.innerHTML = '';

  if (filtered.length === 0) {
    resultList.innerHTML = '<li>No matching records.</li>';
  } else {
    filtered.forEach(record => {
      const li = document.createElement('li');
      li.textContent = record.title;
      resultList.appendChild(li);
    });
  }

  // Update tiles
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

// Concept search input logic
searchInput.addEventListener('input', () => {
  const term = searchInput.value.trim().toLowerCase();
  const items = ul.querySelectorAll('li');

  if (term === '') {
    // Collapse everything when input is empty
    items.forEach(item => {
      const narrower = item.querySelector('ul.narrower');
      if (narrower) {
        narrower.classList.add('hidden');
        const toggle = item.querySelector('.toggle-button');
        if (toggle) toggle.textContent = '▶';
      }
      item.style.display = '';
    });
  } else {
    items.forEach(item => {
      const label = item.dataset.label || '';
      const matches = label.includes(term);
      const descendantMatches = Array.from(item.querySelectorAll('li')).some(child =>
        (child.dataset.label || '').includes(term)
      );

      if (matches || descendantMatches) {
        item.style.display = '';
        const narrowerUl = item.querySelector('ul.narrower');
        if (narrowerUl) {
          narrowerUl.classList.remove('hidden');
          const toggle = item.querySelector('.toggle-button');
          if (toggle) toggle.textContent = '▼';
        }
      } else {
        item.style.display = 'none';
      }
    });
  }
});
