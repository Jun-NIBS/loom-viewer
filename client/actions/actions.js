import 'whatwg-fetch';
import * as _ from 'lodash';


///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch the list of projects
//
///////////////////////////////////////////////////////////////////////////////////////////


function requestProjects() {
	return {
		type: 'REQUEST_PROJECTS',
	};
}

function requestProjectsFailed() {
	return {
		type: 'REQUEST_PROJECTS_FAILED',
	};
}

function receiveProjects(projects) {
	return {
		type: 'RECEIVE_PROJECTS',
		projects: projects,
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchProjects() {
	return (dispatch) => {
		// First, make known the fact that the request has been started
		dispatch(requestProjects());
		// Second, perform the request (async)
		return fetch(`/loom`)
			.then((response) => { return response.json();})
			.then((json) => {
				// Third, once the response comes in, dispatch an action to provide the data
				// Group by project
				const projs = _.groupBy(json, (item) => { return item.project; });
				dispatch(receiveProjects(projs));
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch((err) => {
				console.log(err);
				dispatch(requestProjectsFailed());
			});
	};
}

///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch metadata for a dataset
//
///////////////////////////////////////////////////////////////////////////////////////////


function requestDataset(dataset) {
	return {
		type: 'REQUEST_DATASET',
		dataset: dataset,
	};
}

function requestDatasetFailed() {
	return {
		type: 'REQUEST_DATASET_FAILED',
	};
}

function receiveDataset(dataset) {
	return {
		type: 'RECEIVE_DATASET',
		dataset: dataset,
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchDataset(dataset) {
	return (dispatch) => {
		// First, make known the fact that the request has been started
		dispatch(requestDataset(dataset));
		// Second, perform the request (async)
		return fetch(`/loom/${dataset}/fileinfo.json`)
			.then((response) => { return response.json(); })
			.then((ds) => {
				// Third, once the response comes in, dispatch an action to provide the data
				// Also, dispatch some actions to set required properties on the subviews
				const ra = ds.rowAttrs[0];
				const ca = ds.colAttrs[0];
				dispatch({ type: 'SET_GENESCAPE_PROPS', xCoordinate: ra, yCoordinate: ra, colorAttr: ra });
				dispatch({ type: 'SET_HEATMAP_PROPS', rowAttr: ra, colAttr: ca });
				dispatch(receiveDataset(ds)); // This goes last, to ensure the above defaults are set when the views are rendered
				dispatch({ type: "SET_VIEW_PROPS", view: "Landscape" });
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch((err) => {
				console.log(err);
				dispatch(requestDatasetFailed(dataset));
			});
	};
}


///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch a row of values for a single gene
//
///////////////////////////////////////////////////////////////////////////////////////////


function requestGene(gene) {
	return {
		type: 'REQUEST_GENE',
		gene: gene,
	};
}

function requestGeneFailed() {
	return {
		type: 'REQUEST_GENE_FAILED',
	};
}

function receiveGene(gene, list) {
	return {
		type: 'RECEIVE_GENE',
		gene: gene,
		data: list,
		receivedAt: Date.now(),
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(dataset, gene, cache) {
	const rowAttrs = dataset.rowAttrs;
	return (dispatch) => {
		if (!rowAttrs.hasOwnProperty("GeneName")) {
			return;
		}
		const row = rowAttrs["GeneName"].indexOf(gene);
		if (cache.hasOwnProperty(gene)) {
			return;
		}
		// First, make known the fact that the request has been started
		dispatch(requestGene(gene));
		// Second, perform the request (async)
		return fetch(`/loom/${dataset.name}/row/${row}`)
			.then((response) => { return response.json(); })
			.then((json) => {
				// Third, once the response comes in, dispatch an action to provide the data
				dispatch(receiveGene(gene, json));
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch((err) => {
				console.log(err);
				dispatch(requestGeneFailed());
			});
	};
}