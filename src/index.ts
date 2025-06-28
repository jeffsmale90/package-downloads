import * as asciichart from 'asciichart';
import { Command } from 'commander';

async function getStats() {
    const program = new Command('package-downloads');

    program
        .argument('<packageName>', 'npm package name')
        .argument('[granularity]', 'Data granularity (daily, weekly, monthly)', 'daily')
        .option('-n, --num-points <number>', 'Number of data points to chart', '60')
        .action((packageName, granularity, options) => {
            runStats(packageName, granularity, parseInt(options.numPoints, 10));
        });

    // Check if no arguments are provided to the CLI itself
    // This handles 'package-downloads' and 'npm start' without further arguments
    // process.argv[0] is node executable, process.argv[1] is script path
    // If length is 2, it's 'package-downloads'
    // If length is 3 and process.argv[2] is the script itself (e.g., 'src/index.ts' when run via npm start),
    // it means no arguments were passed to the CLI.
    if (process.argv.length <= 2 || (process.argv.length === 3 && process.argv[2].endsWith('index.ts'))) {
        program.help();
        return; // Exit after showing help
    }

    program.parse(process.argv);
}

async function runStats(packageName: string, granularity: string, numPoints: number) {
    console.log(''); // Add an empty line at the start of output

    let startDateApi: string;
    let endDateApi: string;
    let apiRange: string;

    const today = new Date();
    const formatDateForApi = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const calculateStartDate = (baseDate: Date, points: number, type: 'days' | 'weeks' | 'months') => {
        const newDate = new Date(baseDate);
        if (type === 'days') {
            newDate.setDate(baseDate.getDate() - points);
        } else if (type === 'weeks') {
            newDate.setDate(baseDate.getDate() - (points * 7));
        } else if (type === 'months') {
            newDate.setMonth(baseDate.getMonth() - points);
        }
        return newDate;
    };

    endDateApi = formatDateForApi(today);

    switch (granularity) {
        case 'daily':
            startDateApi = formatDateForApi(calculateStartDate(today, numPoints, 'days'));
            apiRange = `${startDateApi}:${endDateApi}`;
            break;
        case 'weekly':
            startDateApi = formatDateForApi(calculateStartDate(today, numPoints * 7, 'days')); // Fetch daily for aggregation
            apiRange = `${startDateApi}:${endDateApi}`;
            break;
        case 'monthly':
            startDateApi = formatDateForApi(calculateStartDate(today, numPoints * 30, 'days')); // Fetch daily for aggregation
            apiRange = `${startDateApi}:${endDateApi}`;
            break;
        default:
            console.error('Invalid granularity. Choose from: daily, weekly, monthly.');
            process.exit(1);
    }

    try {
        // Fetch package metadata
        const metadataResponse = await fetch(`https://registry.npmjs.org/${packageName}`);
        if (!metadataResponse.ok) {
            const errorText = await metadataResponse.text();
            console.error(`Failed to fetch package metadata: ${metadataResponse.status} ${metadataResponse.statusText} - ${errorText}`);
            // Continue without metadata if it fails, or exit if critical
        } else {
            const metadata = await metadataResponse.json();
            console.log(`Package: ${metadata.name}`);
            console.log(`Description: ${metadata.description || 'N/A'}`);
            console.log(`Latest Version: ${metadata['dist-tags']?.latest || 'N/A'}`);
            console.log(`Homepage: ${metadata.homepage || 'N/A'}`);
            console.log('\n' + '-'.repeat(80) + '\n'); // Separator
        }

        const response = await fetch(`https://api.npmjs.org/downloads/range/${apiRange}/${packageName}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = await response.json();

        if (data.downloads && data.downloads.length > 0) {
            let processedDownloads: number[] = [];
            let processedPeriods: string[] = [];

            if (granularity === 'daily') {
                processedDownloads = data.downloads.map((entry: { day: string; downloads: number }) => entry.downloads);
                processedPeriods = data.downloads.map((entry: { day: string; downloads: number }) => entry.day);
            } else if (granularity === 'weekly') {
                const aggregated = aggregateToWeeks(data.downloads);
                processedDownloads = aggregated.map(entry => entry.downloads);
                processedPeriods = aggregated.map(entry => entry.period);
            } else if (granularity === 'monthly') {
                const aggregated = aggregateToMonths(data.downloads);
                processedDownloads = aggregated.map(entry => entry.downloads);
                processedPeriods = aggregated.map(entry => entry.period);
            }

            // Slice the data to the requested numPoints from the end
            processedDownloads = processedDownloads.slice(-numPoints);
            processedPeriods = processedPeriods.slice(-numPoints);

            if (processedDownloads.length === 0) {
                console.log(`No download data available for the selected period and granularity (${granularity}).`);
                process.exit(0);
            }

            const maxDownload = Math.max(...processedDownloads);
            const minDownload = Math.min(...processedDownloads);
            const maxLabelLength = String(Math.floor(maxDownload)).length;

            const chartOutput = asciichart.plot(processedDownloads, {
                height: 20,
                format: (x) => String(Math.floor(x)).padStart(maxLabelLength, ' ')
            });
            console.log(chartOutput);

            // Calculate actual chart data width and y-axis padding
            const chartLines = chartOutput.split('\n');
            const firstChartLine = chartLines[0];
            const yAxisSeparatorIndex = firstChartLine.indexOf('┤');
            let chartLeftPadding = 0;

            if (yAxisSeparatorIndex !== -1) {
                chartLeftPadding = yAxisSeparatorIndex + 2; // Includes the '┤' character and the space after it
            } else {
                chartLeftPadding = 14; // Default estimate
            }

            let effectiveChartDataWidth = 0;
            for (const line of chartLines) {
                const plotArea = line.substring(chartLeftPadding);
                let lastCharIndex = plotArea.length - 1;
                while (lastCharIndex >= 0 && plotArea[lastCharIndex] === ' ') {
                    lastCharIndex--;
                }
                effectiveChartDataWidth = Math.max(effectiveChartDataWidth, lastCharIndex + 1);
            }

            const formatPeriodLabel = (periodString: string, type: string) => {
                const date = new Date(periodString);
                if (type === 'daily') {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    return `${month}/${day}`;
                } else if (type === 'weekly') {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    return `Wk ${month}/${day}`;
                } else if (type === 'monthly') {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear().toString().substring(2);
                    return `${month}/${year}`;
                }
                return periodString; // Fallback
            };

            const xAxisLabels: { [key: number]: string } = {};

            // Always include start and end periods
            xAxisLabels[0] = formatPeriodLabel(processedPeriods[0], granularity);
            xAxisLabels[processedPeriods.length - 1] = formatPeriodLabel(processedPeriods[processedPeriods.length - 1], granularity);

            // Add intermediate labels if space allows (aim for around 4-5 labels)
            const numLabels = 5; // Target number of labels
            const interval = Math.floor(processedPeriods.length / (numLabels - 1));

            for (let i = interval; i < processedPeriods.length - 1; i += interval) {
                if (i > 0 && i < processedPeriods.length - 1) { // Ensure not to overwrite start/end
                    xAxisLabels[i] = formatPeriodLabel(processedPeriods[i], granularity);
                }
            }

            const xAxisLineChars = new Array(effectiveChartDataWidth).fill(' ');

            Object.keys(xAxisLabels).forEach(indexStr => {
                const index = parseInt(indexStr);
                const label = xAxisLabels[index];

                let position = Math.floor((index / (processedPeriods.length - 1)) * (effectiveChartDataWidth - 1));

                if (index === processedPeriods.length - 1) {
                    position = effectiveChartDataWidth - label.length;
                }

                if (position >= 0 && position + label.length <= effectiveChartDataWidth) {
                    let canPlace = true;
                    for (let i = 0; i < label.length; i++) {
                        if (xAxisLineChars[position + i] !== ' ') {
                            canPlace = false;
                            break;
                        }
                    }
                    if (canPlace) {
                        for (let i = 0; i < label.length; i++) {
                            xAxisLineChars[position + i] = label[i];
                        }
                    }
                }
            });

            const xAxisLine = ' '.repeat(chartLeftPadding) + xAxisLineChars.join('');
            console.log(xAxisLine);

        } else {
            console.log(`No download data available for the selected period and granularity (${granularity}).`);
        }

    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    }
}

// Helper functions for aggregation
function aggregateToWeeks(dailyDownloads: { day: string; downloads: number }[]): { period: string; downloads: number }[] {
    const weeklyData: { [key: string]: number } = {};
    dailyDownloads.forEach(entry => {
        const date = new Date(entry.day);
        // Get the start of the week (Monday)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
        const weekKey = `${startOfWeek.getFullYear()}-${(startOfWeek.getMonth() + 1).toString().padStart(2, '0')}-${startOfWeek.getDate().toString().padStart(2, '0')}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + entry.downloads;
    });

    return Object.keys(weeklyData).sort().map(key => ({ period: key, downloads: weeklyData[key] }));
}

function aggregateToMonths(dailyDownloads: { day: string; downloads: number }[]): { period: string; downloads: number }[] {
    const monthlyData: { [key: string]: number } = {};
    dailyDownloads.forEach(entry => {
        const date = new Date(entry.day);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + entry.downloads;
    });
    return Object.keys(monthlyData).sort().map(key => ({ period: key, downloads: monthlyData[key] }));
}

getStats();