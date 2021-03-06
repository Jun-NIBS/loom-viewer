import {
	anyVal,
	intVal,
	boolVal,
	oneOf,
	vectorOf,
	makeCompressor,
} from './state-compressor';

// NOTE: When adding a new mode, append it at the end
// of the array to maintain backwards compatibility!
const heatmapModes = oneOf(['Text', 'Bars', 'Categorical', 'Heatmap', 'Stacked', 'Flame', 'Box']);
const sparklineColorModes = oneOf(['Bars', 'Categorical', 'Heatmap', 'Stacked', 'Flame', 'Box']);
const sparklineGeneModes = oneOf(['Bars', 'Heatmap', 'Flame', 'Box']);
const scatterPlotModes = oneOf(['Heatmap', 'Categorical']);

export function createViewStateConverter(dataset) {
	// to avoid confusion with row and col in schema below
	const rowData = dataset.row;
	const colData = dataset.col;

	const oneOfRowAllKeys = oneOf(rowData.allKeys),
		oneOfColAllKeys = oneOf(colData.allKeys),
		oneOfColKeys = oneOf(colData.keys),
		oneOfGeneKeys = oneOf(colData.geneKeys);

	// Note: this schema doesn't necessarily include
	// all redux state! If it can be reconstructed from
	// other state, it will be skipped.
	// The skipped state is included as commented out
	// strings for documentation purposes.
	const rowPlot = {
		x: {
			attr: oneOfRowAllKeys,
			jitter: boolVal,
			logScale: boolVal,
		},
		y: {
			attr: oneOfRowAllKeys,
			jitter: boolVal,
			logScale: boolVal,
		},
		colorAttr: oneOfRowAllKeys,
		colorMode: scatterPlotModes,
		logScale: boolVal,
		clip: boolVal,
		lowerBound: intVal,
		upperBound: intVal,
		emphasizeNonZero: boolVal,
		scaleFactor: intVal,
	};

	const colPlot = {
		x: {
			attr: oneOfColAllKeys,
			jitter: boolVal,
			logScale: boolVal,
		},
		y: {
			attr: oneOfColAllKeys,
			jitter: boolVal,
			logScale: boolVal,
		},
		colorAttr: oneOfColAllKeys,
		colorMode: scatterPlotModes,
		logScale: boolVal,
		clip: boolVal,
		lowerBound: intVal,
		upperBound: intVal,
		emphasizeNonZero: boolVal,
		scaleFactor: intVal,
	};

	const viewStateSchema = {
		heatmap: {
			center: {
				lat: anyVal, lng: anyVal,
			},
			colAttr: oneOfColAllKeys,
			colMode: heatmapModes,
			rowAttr: oneOfRowAllKeys,
			rowMode: heatmapModes,
			zoom: intVal,
		},
		col: {
			order: vectorOf([{
				key: oneOfColAllKeys,
				asc: boolVal,
			}]),
			filter: vectorOf([{
				attr: oneOfColAllKeys,
				val: anyVal,
			}]),
			// indices: vectorOf(rangeVal(0, 1<<32))
			scatterPlots: {
				selectedPlot: intVal,
				totalPlots: intVal,
				plotSettings:  {
					0: colPlot,
					1: colPlot,
					2: colPlot,
					3: colPlot,
				},
			},
		},
		row: {
			order: vectorOf([{
				key: oneOfRowAllKeys, asc: boolVal,
			}]),
			filter: vectorOf([{
				attr: oneOfRowAllKeys, val: anyVal,
			}]),
			// indices: vectorOf(rangeVal(0, 1<<32))
			scatterPlots: {
				selectedPlot: intVal,
				totalPlots: intVal,
				plotSettings: {
					0: rowPlot,
					1: rowPlot,
					2: rowPlot,
					3: rowPlot,
				},
			},
		},
		sparkline: {
			colAttr: oneOfColKeys,
			colMode: sparklineColorModes,
			genes: vectorOf([oneOfGeneKeys]),
			geneMode: sparklineGeneModes,
			showLabels: boolVal,
			groupBy: boolVal,
		},
		cellMD: { searchVal: anyVal },
		geneMD: { searchVal: anyVal },
	};

	return makeCompressor(viewStateSchema);
}