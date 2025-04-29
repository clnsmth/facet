const vocabulary = {
  "concepts": [
    { "id": "1", "label": "Animal", "narrower": ["2", "3"] },
    { "id": "2", "label": "Mammal", "narrower": ["4"] },
    { "id": "3", "label": "Bird", "narrower": [] },
    { "id": "4", "label": "Dog", "narrower": [] }
  ]
};

const data = {
  "records": [
    { "id": "a1", "title": "Golden Retriever", "concepts": ["4"] },
    { "id": "a2", "title": "Bald Eagle", "concepts": ["3"] },
    { "id": "a3", "title": "Elephant", "concepts": ["2"] }
  ]
};

const conceptMap = {};
vocabulary.concepts.forEach(c => {
  conceptMap[c.id] = c;
});

function buildTree(conceptId) {
  const concept = conceptMap[conceptId];
  const li = document.createElement('li');

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
const topLevelConcepts = vocabulary.concepts.filter(c => !Object.values(conceptMap).some(other => other.narrower.includes(c.id)));
const ul = document.createElement('ul');
topLevelConcepts.forEach(concept => {
  ul.appendChild(buildTree(concept.id));
});
form.appendChild(ul);

function filterRecords(selectedConcepts) {
  return data.records.filter(record =>
    selectedConcepts.some(concept => record.concepts.includes(concept))
  );
}

function updateResults() {
  const selected = Array.from(document.querySelectorAll('#concept-form input[type="checkbox"]:checked'))
                         .map(cb => cb.value);

  const filtered = filterRecords(selected);

  const resultList = document.getElementById('result-list');
  resultList.innerHTML = '';

  if (filtered.length === 0) {
    resultList.innerHTML = '<li>No matching records.</li>';
    return;
  }

  filtered.forEach(record => {
    const li = document.createElement('li');
    li.textContent = record.title;
    resultList.appendChild(li);
  });
}
