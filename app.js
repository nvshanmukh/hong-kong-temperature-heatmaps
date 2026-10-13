const CONFIG = {
  dataPath: "./data/temperature_daily.csv",

  temperatureDomain: [0, 39],

  recentYearCount: 10,

  margin: {
    top: 30,
    right: 110,
    bottom: 20,
    left: 85
  },

  monthly: {
    cellWidth: 34,
    cellHeight: 30,
    gapX: 7,
    gapY: 7
  },

  daily: {
    cellWidth: 78,
    cellHeight: 58,
    gapX: 19,
    gapY: 14,
    linePadding: 3
  },

  legend: {
    width: 18,
    height: 220,
    offsetX: 20
  },

  maximumLineColor: "#1a9850",
  minimumLineColor: "#a6dbe8",

  tooltipOffset: 12
};

const MONTH_NAMES = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];

const state = {
  metric: "maximum"
};

const parseDate = d3.utcParse("%Y-%m-%d");

async function loadDailyTemperatures() {
  const dailyRecords = await d3.csv(CONFIG.dataPath, row => {
    const date = parseDate(row.date);

    const maximum =
      row.max_temperature?.trim() === ""
        ? NaN
        : Number(row.max_temperature);

    const minimum =
      row.min_temperature?.trim() === ""
        ? NaN
        : Number(row.min_temperature);

    if (
      !date ||
      !Number.isFinite(maximum) ||
      !Number.isFinite(minimum) ||
      maximum < minimum
    ) {
      throw new Error(`Invalid temperature record: ${row.date}`);
    }

    return {
      date,
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      maximum,
      minimum
    };
  });

  return dailyRecords.sort(
    (first, second) => first.date - second.date
  );
}

function summarizeMonths(dailyRecords) {
  const groupedMonths = d3.group(
    dailyRecords,
    record => record.year,
    record => record.month
  );

  const monthlyRecords = [];

  for (const [year, months] of groupedMonths) {
    for (const [month, days] of months) {
      monthlyRecords.push({
        key: `${year}-${String(month).padStart(2, "0")}`,
        year,
        month,

        maximum: d3.max(days, day => day.maximum),
        minimum: d3.min(days, day => day.minimum),

        days: [...days].sort(
          (first, second) => first.day - second.day
        )
      });
    }
  }

  return monthlyRecords.sort(
    (first, second) =>
      first.year - second.year ||
      first.month - second.month
  );
}

function createTemperatureColorScale() {
  const coldToHotColors = [...d3.schemeSpectral[11]].reverse();

  return d3.scaleQuantize()
    .domain(CONFIG.temperatureDomain)
    .range(coldToHotColors);
}

const temperatureColor = createTemperatureColorScale();

function createMatrixFrame(containerSelector, years, layout) {
  const months = d3.range(1, 13);

  const stepX = layout.cellWidth + layout.gapX;
  const stepY = layout.cellHeight + layout.gapY;

  const plotWidth = years.length * stepX;
  const plotHeight = months.length * stepY;

  const xYear = d3.scaleBand()
    .domain(years)
    .range([0, plotWidth])
    .paddingInner(layout.gapX / stepX)
    .paddingOuter(layout.gapX / (2 * stepX));

  const yMonth = d3.scaleBand()
    .domain(months)
    .range([0, plotHeight])
    .paddingInner(layout.gapY / stepY)
    .paddingOuter(layout.gapY / (2 * stepY));

  const margin = CONFIG.margin;

  const container = d3.select(containerSelector);
  container.selectAll("*").remove();

  const svg = container.append("svg")
    .attr("width", plotWidth + margin.left + margin.right)
    .attr("height", plotHeight + margin.top + margin.bottom);

  const plot = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  plot.append("g")
    .attr("class", "axis")
    .call(d3.axisTop(xYear).tickSizeOuter(0));

  plot.append("g")
    .attr("class", "axis")
    .call(
      d3.axisLeft(yMonth)
        .tickFormat(month => MONTH_NAMES[month - 1])
        .tickSizeOuter(0)
    );

  return {
    plot,
    xYear,
    yMonth,
    plotWidth,
    cellWidth: xYear.bandwidth(),
    cellHeight: yMonth.bandwidth()
  };
}

function drawTemperatureLegend(frame) {
  const settings = CONFIG.legend;
  const colors = temperatureColor.range();

  const legend = frame.plot.append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${frame.plotWidth + settings.offsetX},10)`
    );

  const legendPosition = d3.scaleLinear()
    .domain(CONFIG.temperatureDomain)
    .range([0, settings.height]);

  legend.selectAll("rect")
    .data(colors)
    .join("rect")
    .attr("x", 0)
    .attr("y", color => {
      const [lower] = temperatureColor.invertExtent(color);
      return legendPosition(lower);
    })
    .attr("width", settings.width)
    .attr("height", color => {
      const [lower, upper] = temperatureColor.invertExtent(color);
      return legendPosition(upper) - legendPosition(lower);
    })
    .attr("fill", color => color);

  legend.append("g")
    .attr("transform", `translate(${settings.width},0)`)
    .call(
      d3.axisRight(legendPosition)
        .tickValues([0, 10, 20, 30, 39])
        .tickFormat(value => `${value}°C`)
        .tickSize(3)
    );
}

const tooltip = d3.select("#tooltip");

function showMonthlyTooltip(event, record) {
  const expectedDays = new Date(
    Date.UTC(record.year, record.month, 0)
  ).getUTCDate();

  const coverage =
    record.days.length < expectedDays
      ? `<br>Available days: ${record.days.length}/${expectedDays}`
      : "";

  tooltip
    .property("hidden", false)
    .html(`
      <strong>${MONTH_NAMES[record.month - 1]} ${record.year}</strong>
      <br>Maximum: ${record.maximum}°C
      <br>Minimum: ${record.minimum}°C
      ${coverage}
    `);

  moveTooltip(event);
}

function moveTooltip(event) {
  const bounds = tooltip.node().getBoundingClientRect();
  const offset = CONFIG.tooltipOffset;

  const left = Math.max(
    0,
    Math.min(
      event.clientX + offset,
      window.innerWidth - bounds.width - offset
    )
  );

  const top = Math.max(
    0,
    Math.min(
      event.clientY + offset,
      window.innerHeight - bounds.height - offset
    )
  );

  tooltip
    .style("left", `${left}px`)
    .style("top", `${top}px`);
}

function attachMonthlyTooltip(selection) {
  selection
    .on("mouseenter", showMonthlyTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseleave", () => {
      tooltip.property("hidden", true);
    });
}

function renderMonthlyHeatmap(monthlyRecords) {
  const years = [...new Set(
    monthlyRecords.map(record => record.year)
  )].sort(d3.ascending);

  const frame = createMatrixFrame(
    "#monthly-chart",
    years,
    CONFIG.monthly
  );

  const cells = frame.plot.append("g")
    .selectAll("rect")
    .data(monthlyRecords, record => record.key)
    .join("rect")
    .attr("class", "temperature-cell")
    .attr("x", record => frame.xYear(record.year))
    .attr("y", record => frame.yMonth(record.month))
    .attr("width", frame.cellWidth)
    .attr("height", frame.cellHeight)
    .attr("fill", record =>
      temperatureColor(record[state.metric])
    );

  attachMonthlyTooltip(cells);
  drawTemperatureLegend(frame);
}

function drawDailyLines(cellGroups, frame) {
  const padding = CONFIG.daily.linePadding;

  const dayPosition = d3.scaleLinear()
    .domain([1, 31])
    .range([padding, frame.cellWidth - padding]);

  const temperaturePosition = d3.scaleLinear()
    .domain(CONFIG.temperatureDomain)
    .range([frame.cellHeight - padding, padding]);

  const seriesDefinitions = [
    {
      field: "maximum",
      color: CONFIG.maximumLineColor
    },
    {
      field: "minimum",
      color: CONFIG.minimumLineColor
    }
  ];

  cellGroups.each(function(monthRecord) {
    const cell = d3.select(this);

    const daysInMonth = new Date(
      Date.UTC(monthRecord.year, monthRecord.month, 0)
    ).getUTCDate();

    const recordsByDay = new Map(
      monthRecord.days.map(record => [record.day, record])
    );

    // Explicit missing days allow the line to break at data gaps.
    const completeDaySequence = d3.range(1, daysInMonth + 1)
      .map(day => recordsByDay.get(day) ?? {
        day,
        maximum: null,
        minimum: null
      });

    for (const series of seriesDefinitions) {
      const createLine = d3.line()
        .defined(record => Number.isFinite(record[series.field]))
        .x(record => dayPosition(record.day))
        .y(record => temperaturePosition(record[series.field]))
        .curve(d3.curveLinear);

      cell.append("path")
        .datum(completeDaySequence)
        .attr("class", "daily-line")
        .attr("stroke", series.color)
        .attr("d", createLine);
    }
  });
}

function renderDailyHeatmap(monthlyRecords) {
  const latestYear = d3.max(
    monthlyRecords,
    record => record.year
  );

  const firstYear = latestYear - CONFIG.recentYearCount + 1;
  const years = d3.range(firstYear, latestYear + 1);

  const recentMonths = monthlyRecords.filter(
    record => record.year >= firstYear
  );

  const frame = createMatrixFrame(
    "#daily-chart",
    years,
    CONFIG.daily
  );

  const cellGroups = frame.plot.append("g")
    .selectAll("g.month-cell")
    .data(recentMonths, record => record.key)
    .join("g")
    .attr("class", "month-cell")
    .attr("transform", record =>
      `translate(
        ${frame.xYear(record.year)},
        ${frame.yMonth(record.month)}
      )`
    );

  const backgrounds = cellGroups.append("rect")
    .attr("class", "temperature-cell")
    .attr("width", frame.cellWidth)
    .attr("height", frame.cellHeight)
    .attr("fill", record =>
      temperatureColor(record[state.metric])
    );

  attachMonthlyTooltip(backgrounds);
  drawDailyLines(cellGroups, frame);
  drawTemperatureLegend(frame);
}

async function initializeVisualization() {
  const status = document.querySelector("#status");

  try {
    const dailyRecords = await loadDailyTemperatures();
    const monthlyRecords = summarizeMonths(dailyRecords);

    function renderCharts() {
      tooltip.property("hidden", true);

      renderMonthlyHeatmap(monthlyRecords);
      renderDailyHeatmap(monthlyRecords);
    }

    d3.select("#temperature-metric")
      .on("change", event => {
        state.metric = event.target.value;
        renderCharts();
      });

    renderCharts();

    status.textContent =
      "Temperatures are shown in °C. Missing months are blank.";
  } catch (error) {
    console.error(error);

    status.textContent =
      `Unable to load the visualization: ${error.message}`;
  }
}

initializeVisualization();