const CONFIG = {
  dataPath: "./data/temperature_daily.csv",

  temperatureDomain: [0, 40],

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