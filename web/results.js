function main() {
  const envs = new Set(ALL_COMPARISONS.map(r => r.environment));

  for (const env of envs) {
    //addCompareChart(env, ALL_COMPARISONS.filter(r => r.environment === env));
    addDataChart(env, ALL_RESULTS.filter(r => r.environment === env));
  }
}

let CHART_NUMBER = 1;

function addNode(flavor, id) {
  const node = document.createElement(flavor);
  if (id) {
    node.setAttribute('id', id);
  }
  document.body.appendChild(node);
  return node;
}

function addCompareChart(env, data) {
  // Header and chart holder
  addNode('h1').innerText = `Environment: ${env}`;

  const chartId = `chart${CHART_NUMBER++}`;
  const div = addNode('div', chartId);
  div.setAttribute('style', 'height: 300px;');

  // Draw
  const root = am5.Root.new(chartId);
  const chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      layout: root.verticalLayout
    })
  );

  // Make categories out of the four comparison flavors
  const xRenderer = am5xy.AxisRendererX.new(root, {
  cellStartLocation: 0.1,
  cellEndLocation: 0.9,
  minorGridEnabled: true
  });
  const xAxis = chart.xAxes.push(
    am5xy.CategoryAxis.new(root, {
      renderer: xRenderer,
      categoryField: "comparetest"
    })
  );
  xRenderer.grid.template.setAll({
    location: 1
  })
  const comparetests = [...new Set(data.map(r => r.comparetest))];
  xAxis.data.setAll(comparetests.map(comparetest => {return {comparetest};}));

  const legend = chart.children.push(
    am5.Legend.new(root, {
      centerX: am5.p50,
      x: am5.p50
    })
  );

  const yAxis = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
      min: 0,
      renderer: am5xy.AxisRendererY.new(root, {
        strokeOpacity: 1,
      })
    })
  );

  const series = chart.series.push(
    am5xy.ColumnSeries.new(root, {
      name: env,
      xAxis: xAxis,
      yAxis: yAxis,
      valueYField: "testRatio",
      categoryXField: "comparetest",
      opacity: 0
    })
  );
  series.bullets.push(() => {
    const graphics = am5.Circle.new(root, {
      fill: series.get("fill"),
      radius: 2
    });
    return am5.Bullet.new(root, {
      sprite: graphics
    });
  });

  series.data.setAll(data);
}

function addDataChart(env, data) {
  // Header and chart holder
  addNode('h1').innerText = `Environment: ${env}`;

  const chartId = `chart${CHART_NUMBER++}`;
  const div = addNode('div', chartId);
  div.setAttribute('style', 'height: 300px;');

  // Summary stats table
  const summary = addNode('div');
  summary.setAttribute('class', 'summary');

  let html = `<table><tr>
    <td>test</td><td>N</td><td>bmean</td><td>tmean</td><td>bsd</td><td>tsd</td><td>T</td><td>Significant?</td>
  </tr>`;
  for (const sd of ALL_STATS[env]) {
    html += `<tr>
      <td>${sd.basistest} v ${sd.comparetest}</td>
      <td>${sd.samples}</td>
      <td>${sd.basismean.toFixed(3)}</td>
      <td>${sd.testmean.toFixed(3)}</td>
      <td>${sd.basisstddev.toFixed(3)}</td>
      <td>${sd.teststddev.toFixed(3)}</td>
      <td>${sd.tvalue.toFixed(3)}</td>
      <td>${sd.sig999}</td>
    </tr>`;
  }
  summary.innerHTML = html + '</table>';

  // Draw
  const root = am5.Root.new(chartId);
  const chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      layout: root.verticalLayout
    })
  );

  // Make categories out of the four comparison flavors
  const xRenderer = am5xy.AxisRendererX.new(root, {
  cellStartLocation: 0.1,
  cellEndLocation: 0.9,
  minorGridEnabled: true
  });
  const xAxis = chart.xAxes.push(
    am5xy.CategoryAxis.new(root, {
      renderer: xRenderer,
      categoryField: "testname"
    })
  );
  xRenderer.grid.template.setAll({
    location: 1
  })
  const testnames = [...new Set(data.map(r => r.testname))];
  xAxis.data.setAll(testnames.map(testname => {return {testname};}));

  const legend = chart.children.push(
    am5.Legend.new(root, {
      centerX: am5.p50,
      x: am5.p50
    })
  );

  const yAxis = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
      renderer: am5xy.AxisRendererY.new(root, {
        minorGridEnabled: true,
        strokeOpacity: 1,
      })
    })
  );

  const series = chart.series.push(
    am5xy.ColumnSeries.new(root, {
      name: env,
      xAxis: xAxis,
      yAxis: yAxis,
      valueYField: "durationMs",
      categoryXField: "testname",
      opacity: 0
    })
  );
  series.bullets.push(() => {
    const graphics = am5.Circle.new(root, {
      fill: series.get("fill"),
      radius: 2
    });
    return am5.Bullet.new(root, {
      sprite: graphics,
      tooltip: am5.Tooltip.new(root, {})

    });
  });

  series.data.setAll(data);
}

document.addEventListener('DOMContentLoaded', () => main());
