# Hong Kong Temperature Heatmaps

This project visualizes daily maximum and minimum temperatures in Hong Kong using the dataset from the [CSCE 679 Data Visualization Assignment 1](https://github.com/xiameng552180/CSCE-679-Data-Visualization-Assignment1).

## Visualizations

**Level 1: Monthly heatmap** shows years across the top and months down the side. Each cell represents one month. Use the dropdown to color cells by either the monthly maximum or monthly minimum temperature. Hover over a cell to see both values.

**Level 2: Daily temperatures** shows the final ten years in the dataset, 2008–2017. Each cell contains two lines: green for daily maximum temperatures and light blue for daily minimum temperatures. The cell background uses the temperature selected in the dropdown.

The color legend explains how cell colors map to temperatures in degrees Celsius.

## How monthly values are calculated

- **Monthly maximum:** The highest daily `max_temperature` recorded during that month.
- **Monthly minimum:** The lowest daily `min_temperature` recorded during that month.

For example, January 1997 has a monthly maximum of **26°C** and a monthly minimum of **10°C**. These differ from the values for January 1 because the cell summarizes the entire month.

Both charts use the same temperature color palette and a 0–39°C color scale. Daily lines in Level 2 use a consistent temperature scale across cells so their heights can be compared.

## Data

The source file is [`temperature_daily.csv`](https://github.com/xiameng552180/CSCE-679-Data-Visualization-Assignment1/blob/main/temperature_daily.csv). It contains a date, daily maximum temperature, and daily minimum temperature for each record.

The dataset ends on **October 28, 2017**. November and December 2017 are left blank because no data is available for those months. October 2017 is a partial month.

## Run locally

1. Download or clone this repository.
2. Start a local web server in the project folder, such as VS Code’s **Live Server** extension.
3. Open `index.html` through that server.

The CSV must be available at `data/temperature_daily.csv` for the visualizations to load.

## Implementation

The project uses HTML, CSS, JavaScript, and [D3.js](https://d3js.org/). The code separates data loading, monthly calculations, color mapping, axes, legends, tooltips, and chart drawing into functions so each part can be changed independently.