# npm Package Download Stats CLI

A command-line interface (CLI) tool to fetch and visualize download statistics for npm packages using ASCII charts.

## Features

*   Get daily, weekly, or monthly download counts for any npm package.
*   Get 7-day rolling average to smooth out daily fluctuations and show trends.
*   Visualize download trends over a specified number of data points.
*   Displays basic package metadata (description, latest version, homepage).

## Installation

To install the CLI globally, first build, then install the package as a global dependency:

```bash
npm run build
npm install -g .
```

This will allow you to run the `package-downloads` command from anywhere in your terminal.

## Usage

```bash
package-downloads <packageName> [granularity] [options]
```

### Arguments

*   `<packageName>`: The name of the npm package you want to get statistics for (e.g., `express`, `react`). (Required)
*   `[granularity]`: The data granularity. Can be `daily`, `weekly`, `monthly`, or `7day-avg`. Defaults to `daily`. (Optional)

### Options

*   `-n, --num-points <number>`: The number of data points (days, weeks, or months) to chart. Defaults to `60`. (Optional)

## Examples

### Get daily downloads for 'express' for the last 60 days (default)

```bash
package-downloads express
```

### Get weekly downloads for 'lodash' for the last 10 weeks

```bash
package-downloads lodash weekly -n 10
```

### Get monthly downloads for 'vue' for the last 5 months

```bash
package-downloads vue monthly -n 5
```

### Get 7-day rolling average for 'axios' for the last 30 days

```bash
package-downloads axios 7day-avg -n 30
```

### Get help

```bash
package-downloads --help
```

## Output

The CLI will display basic metadata about the package, followed by an ASCII chart showing the download trends. The y-axis represents the download count, and the x-axis shows the dates/periods.
