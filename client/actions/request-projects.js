import 'whatwg-fetch';

import localforage from 'localforage';

import {
	// REQUEST_PROJECTS,
	REQUEST_PROJECTS_FETCH,
	// REQUEST_PROJECTS_CACHED,
	REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	LOAD_CACHED_PROJECTS,
} from './action-types';

export const OFFLINE = 0,
	ONLINE = 1,
	UNKNOWN = -1;

// //////////////////////////////////////////////////////////////////////////////
//
// Fetch the list of projects
//
// //////////////////////////////////////////////////////////////////////////////


// function requestProjects() {
// 	return {
// 		type: REQUEST_PROJECTS,
// 	};
// }

function requestProjectsFetch() {
	return {
		type: REQUEST_PROJECTS_FETCH,
	};
}

// function requestProjectsCached() {
// 	return {
// 		type: REQUEST_PROJECTS_CACHED,
// 	};
// }

function requestProjectsFailed() {
	return {
		type: REQUEST_PROJECTS_FAILED,
		state: {
			fetchProjectsStatus: OFFLINE,
		},
	};
}

function loadOfflineProjects(list) {
	return {
		type: LOAD_CACHED_PROJECTS,
		state: {
			list,
			fetchProjectsStatus: OFFLINE,
		},
	};
}

function receiveProjects(json, prevList) {
	// convert json array to dictionary
	let list = {};
	let i = json.length;
	while (i--) {
		let ds = json[i];
		ds.path = ds.project + '/' + ds.filename;
		// don't overwrite existing datasets
		if (prevList && prevList[ds.path]) {
			ds = prevList[ds.path];
		} else {
			ds.fetchedGenes = {};
			ds.fetchingGenes = {};
			ds.col = null;
			ds.row = null;
		}
		list[ds.path] = ds;
	}

	return {
		type: RECEIVE_PROJECTS,
		state: {
			list,
			fetchProjectsStatus: ONLINE,
		},
	};
}


// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(requestProjects(...))

export function requestProjects(list, fetchProjectsStatus) {
	return (dispatch) => {
		// Check if projects already exists in the store,
		// and if we weren't offline last time we tried
		// to fetch the projects
		if (!(list && fetchProjectsStatus)) { // Announce we are fetching from server
			dispatch(requestProjectsFetch());
			return (
				fetch('/loom').then((response) => {
					return response.json();
				})
					.then((json) => {
						if (typeof json === 'string') {
							throw json;
						}
						return dispatch(receiveProjects(json, list));
					})
					.catch((err) => {
						console.log('fetching projects failed with following error:');
						console.log(err);
						// Try loading the offline datasets,
						// if we have not done so before
						if (!list) {
							console.log('attempting to load cached datasets');
							loadProjects(dispatch);
						}
					})
			);
		} else { // we retrieve from store cache
			return null;
		}
	};
}

function loadProjects(dispatch) {
	localforage.getItem('cachedDatasets')
		.then((cachedDatasets) => {
			if (cachedDatasets) {
				dispatch(loadOfflineProjects(cachedDatasets));
			} else {
				// if list is empty, we have no
				// cached datasets and fetching
				// effectively failed.
				throw 'no cached datasets';
			}
		})
		.catch((err) => {
			console.log('Loading projects failed:', err, { err });
			dispatch(requestProjectsFailed());
		});
}