function main() {
  const envs = new Set(ALL_COMPARISONS.map(r => r.environment));

  for (const env of envs) {
    addDataTable(env, ALL_RESULTS.filter(r => r.environment === env));
  }
}

function addNode(flavor, id) {
  const node = document.createElement(flavor);
  if (id) {
    node.setAttribute('id', id);
  }
  document.body.appendChild(node);
  return node;
}

function addDataTable(env, data) {
  addNode('h1').innerText = `Environment: ${env}`;

  // Summary stats table
  const summary = addNode('div');
  summary.setAttribute('class', 'summary');

  let html = `<table><tr>
    <td>test</td>
    <td>Samples</td>
    <td>slowdown factor</td>
    <td>basis mean (ms)</td>
    <td>test mean (ms)</td>
    <td>basis stddev</td>
    <td>test stddev</td>
    <td>T</td><td>P</td>
    <td>T-Significance</td>
  </tr>`;
  for (const sd of ALL_STATS[env]) {
    html += `<tr>
      <td>${sd.basistest} v ${sd.comparetest}</td>
      <td>${sd.samples}</td>
      <td>${(sd.testmean / sd.basismean).toFixed(2)}</td>
      <td>${sd.basismean.toFixed(3)}</td>
      <td>${sd.testmean.toFixed(3)}</td>
      <td>${sd.basisstddev.toFixed(3)}</td>
      <td>${sd.teststddev.toFixed(3)}</td>
      <td>${sd.tvalue.toFixed(3)}</td>
      <td>${sd.pvalue.toFixed(5)}</td>
      <td>${sd.sig999}</td>
    </tr>`;
  }
  summary.innerHTML = html + '</table>';
}

document.addEventListener('DOMContentLoaded', () => main());
