/**
 * Our app stores the view state in the URL by applying LZ-string
 * to its JSON.stringified version. The viewstate can get pretty
 * big, especially when a large number of genes is selected.
 *
 * However, the list of genes to choose from is limited, constant,
 * and stored in a different object. So we do not have to store
 * the full gene names in the compressed viewState to be able to
 * recover them. This also applies to other aspects of the viewState
 * In other words: because we know the structure of the viewState
 * object, we can encode much of it as a positional array, where
 * keys are replaced by position, and values by index nrs into
 * arrays to recover the actual values.
 *
 * Boolean values can be replaced with 0 and 1.
 *
 * null and undefined would be converted to 0.
 *
 * Uninitialised state would be indicated with 0.
 *
 * Since the state to be saved is usually either attribute names
 * or row/column keys (respectively genes or cell id's), which
 * are stored in the metadata as arrays of strings,  we replace
 * the strings in the encoded viewState object with  indices.
 * The indices should refer to a _sorted_ array of keys to
 * ensure stability.
 *
 * This would make our viewState more complicated to change:
 * - adding new fields would mean appending to the end of the array.
 * - deleting fields would either require replacing them with 0,
 *	  or using some form of semver.
 *   (renaming should not be a major issue, relatively speaking)
 *
 * Semver would actually be fairly simple: we append the final array
 * with a number, which we increase if a breaking change is made
 * to the schema. Since this is a floating point value, we can use
 * point-increases to indicate non-breaking changes to the schema.
 *
 * The net result would be nested arrays of numbers, which are
 * much shorter, and will compress better too.
 *
 * For example:
 *	{
 *		heatmap: {
 *			zoomRange: [8, 13, 21],
 *			fullZoomWidth: 769280,
 *			fullZoomHeight: 1279488,
 *			shape: [4998, 3005]
 *		},
 *		col: {
 *			order: [
 *				{ key: 'Plp2', asc: true },
 *				{ key: 'Plp1', asc: true },
 *				{ key: 'Aplp2', asc: true },
 *				{ key: 'Aplp1', asc: true },
 *				{ key: 'Class', asc: true },
 *			],
 *			filter: []
 *		},
 *		row: {
 *			order: [
 *				{ key: '(original order)', asc: true },
 *				{ key: 'BackSPIN_level_0_group', asc: true },
 *				{ key: 'BackSPIN_level_1_group', asc: true },
 *				{ key: 'BackSPIN_level_2_group', asc: true },
 *				{ key: 'BackSPIN_level_3_group', asc: true }
 *			],
 *			filter: []
 *		},
 *		cellMD: { searchVal: '' },
 *		sparkline: {
 *			colMode: 'Categorical',
 *			geneMode: 'Bars',
 *			genes: [
 *				'Tspan12',
 *				'Gfap',
 *				'Plp1',
 *				'Plp2',
 *				'Aplp1',
 *				'Aplp2'
 *			],
 *			showLabels: true,
 *			colAttr: 'Class'
 *		}
 *	}
 *
 * Could become:
 *
 *	[
 *		[ // heatmap
 *			[8, 13, 21],
 *			769280, 1279488,
 *			[4998, 3005]
 *		],
 *		[ // col
 *			[ // order
 *			  #####, 1,
 *			  #####, 1,
 *			  #####, 1,
 *			  #####, 1,
 *			  #####, 1
 *			],
 *			[] // filter
 *		],
 *		[ // row
 *			[ // order
 *			  #####, 1,
 *			  #####, 1,
 *			  #####, 1,
 *			  #####, 1,
 *			  #####, 1
 *			],
 *			[] // filter
 *		],
 *		0, // unititiated landscape view
 *		[ // cellMD
 *		  '' // one of the few cases where we have to use a string
 *		],
 *		[ // sparkline
 *			0, // colMode has preset choices, so can be indexed
 *			0, // same with geneMode
 *			[ #####, #####, #####, #####, .. ],
 *			1, // "showLabels: true"
 *			.. // 'Class' is an attribute key
 *		],
 *		0, // unititiated geneScape view
 *		0, // unitiated geneMD view
 *		0, // first version of schema
 *	]
 *
 * Here ##### indicates an index to an attribute or row/col key, assuming
 * a (pessimistic) estimate of five digits (our upper limit is 30000 genes).
 * With that in mind, then the saved space after minification is as follows:
 *
 * {heatmap:{zoomRange:[8,13,21],fullZoomWidth:769280,fullZoomHeight:1279488,shape:[4998,3005]},col:{order:[{key:'Plp2',asc:true},{key:'Plp1',asc:true},{key:'Aplp2',asc:true},{key:'Aplp1',asc:true},{key:'Class',asc:true},],filter:[]},row:{order:[{key:'(originalorder)',asc:true},{key:'BackSPIN_level_0_group',asc:true},{key:'BackSPIN_level_1_group',asc:true},{key:'BackSPIN_level_2_group',asc:true},{key:'BackSPIN_level_3_group',asc:true}],filter:[]},cellMD:{searchVal:''},sparkline:{colMode:'Categorical',geneMode:'Bars',genes:['Tspan12','Gfap','Plp1','Plp2','Aplp1','Aplp2'],showLabels:true,colAttr:'Class'}}
 *
 * [[[8,13,21],769280,1279488,[4998,3005]],[[#####,1,#####, 1,#####, 1,#####, 1,#####, 1],[]],[[#####, 1,#####, 1,#####, 1,#####, 1,#####, 1],[]],0,[''],[0,0,[#####,#####,#####,#####,#####],1,#####],0,0,0]
 *
 */

import { isArray } from '../js/util';

// ===================================
// Encoder/decoder generator functions
// ===================================

// TODO: Semver schema support

/**
 * A `PreCompressor` contains functions for reversible transformations
 * @param {function} encodeMethod
 * @param {function} decodeMethod
 */
function PreCompressor(encodeMethod, decodeMethod){
	this.encoder = encodeMethod;
	this.decoder = decodeMethod;
}

// value that can be anything, so passes through unchanged
// (example: input field, which can have any string value)
function anyValConverter(val){
	return val;
}
export const anyVal = new PreCompressor(anyValConverter, anyValConverter);

function intValConverter(num){
	return num|0;
}
export const intVal = new PreCompressor(intValConverter, intValConverter);

// If a value is constant, we can
// just store it in the decoder.
export function constEncoder() { return 0; }
export function constDecoder(val) {
	return () => { return val; };
}

// a variable that will be one of a constrained number of values
export function oneOf(valArr) {
	// make sure valArr isn't accidentally mutated later
	valArr = valArr.slice();
	// Map lookup is usually faster than indexOf on an array in modern browsers
	let valToIdx = new Map();
	for(let i = 0; i < valArr.length; i++){
		valToIdx.set(valArr[i], i);
	}
	return new PreCompressor(
		(val) => { return valToIdx.get(val); },
		(idx) => { return valArr[idx]; }
	);
}

// a boolean
export const boolVal = oneOf([false, true]);

// a range
export function rangeVal(i, j, step) {
	step = step ? step : 1;
	if (j < i && step > 0) {
		let t = j;
		j = i;
		i = t;
	}
	let values = [];
	while (i < j) {
		values.push(i);
		i += step;
	}
	return oneOf(values);
}

// the keys of an object
export function keysOf(obj) {
	let keys = Object.keys(obj);
	keys.sort();
	return oneOf(keys);
}
/**
 * Arrays in the schema tree will be assumed to represent a
 * fixed size, for variable sizes we use vectorOf()
 * example: an array of variable size, where we know all values
 * will be between 0 and 255:
 *   vectorOf([rangeVal(0, 256)])
 * @param {any[]} patternArr
 */
export function vectorOf(patternArr){
	return new PreCompressor(
		encodeVector(patternArr),
		decodeVector(patternArr)
	);
}

// Arrays in the schema are assumed to be fixed size
// For variable sized arrays, use vectorOf()
export function encodeArray(patternArr) {
	const l = patternArr.length;
	let encoderArr = [];
	for(let i = 0; i < l; i++) {
		encoderArr.push(createEncoder(patternArr[i]));
	}
	return (arr) => {
		if (arr && arr.length) {
			let retArr = [];
			for(let i = 0; i < l; i++) {
				retArr.push(encoderArr[i](arr[i]));
			}
			return retArr;
		} else {
			return 0;
		}
	};
}

export function decodeArray(patternArr) {
	const l = patternArr.length;
	let decoderArr = [];
	for (let i = 0; i < l; i++) {
		decoderArr.push(createDecoder(patternArr[i]));
	}
	return (arr) => {
		if (arr && arr.length) {
			let retArr = [];
			for(let i = 0; i < l ; i++) {
				retArr.push(decoderArr[i](arr[i]));
			}
			return retArr;
		}
		return undefined;
	};
}

export function encodeVector(patternArr){
	const l = patternArr.length;
	let encoderArr = [];
	for(let i = 0; i < l; i++) {
		encoderArr.push(createEncoder(patternArr[i]));
	}
	return (arr) => {
		if (arr && arr.length) {
			let retArr = [];
			for (let i = 0; i < arr.length; i++) {
				retArr.push(encoderArr[i % l](arr[i]));
			}
			return retArr;
		} else {
			return 0;
		}
	};
}

export function decodeVector(patternArr) {
	const l = patternArr.length;
	let decoderArr = [];
	for(let i = 0; i < l; i++) {
		decoderArr.push(createDecoder(patternArr[i]));
	}
	return (arr) => {
		if (arr) {
			let retArr = [];
			for(let i = 0; i < arr.length; i++) {
				retArr.push(decoderArr[i % l](arr[i]));
			}
			return retArr;
		}
		return undefined;
	};
}

/**
 * Creates an encoder that transforms
 * an object matching the passed schema
 * into a positional array.
 */
export function encodeObj(schema) {
	let keys = Object.keys(schema);
	// sort keys to ensure consistent encoding/decoding
	keys.sort();

	let subEncoders = [];
	for(let i = 0; i < keys.length; i++) {
		subEncoders.push(createEncoder(schema[keys[i]]));
	}

	let encoder = (obj) => {
		if (obj) {
			let retArr = [];
			for (let i = 0; i < keys.length; i++) {
				retArr.push(subEncoders[i](obj[keys[i]]));
			}
			return retArr;
		} else {
			return 0;
		}
	};

	// Add subEncoders as properties
	for(let i = 0; i < keys.length; i++) {
		encoder[keys[i]] = subEncoders[i];
	}
	return encoder;

}

export function decodeObj(schema) {
	let keys = Object.keys(schema);
	// sort keys to ensure consistent encoding/decoding
	keys.sort();

	let subDecoders = [];
	for(let i = 0; i < keys.length; i++) {
		subDecoders.push(createDecoder(schema[keys[i]]));
	}

	let decoder = (arr) => {
		if (arr) {
			let retObj = {};
			for(let i = 0; i < keys.length; i++){
				let decoded = subDecoders[i](arr[i]);
				if (decoded !== undefined) {
					retObj[keys[i]] = decoded;
				}
			}
			return retObj;
		}
		return undefined;
	};

	// Add subDecoders as properties
	for(let i = 0; i < keys.length; i++){
		decoder[keys[i]] = subDecoders[i];
	}
	return decoder;
}


export function createEncoder(schema) {
	if (schema) {
		switch (typeof schema) {
			case 'object':
				if (isArray(schema)) {
					return encodeArray(schema);
				} else if (schema.constructor === PreCompressor){
					return schema.encoder;
				} else {
					return encodeObj(schema);
				}
			case 'function':
				// assumed to be object containing custom
				// `encoder` and `decoder` functions
				return schema.encoder;
			case 'string':
			case 'number':
			case 'boolean':
				// assumed to be constant (what is a constant doing in *state*?)
				console.log({
					message: 'createEncoder: constant detected in schema',
					schema,
				});
				return constEncoder;
			default:
				// if we have no clue, play it safe
				console.log({
					message: 'createEncoder: no specific encoder present for schema',
					schema,
				});
				return anyVal.encoder;
		}
	}
	console.log('WARNING: no schema passed to createEncoder!');
	return anyVal.encoder;
}

export function createDecoder(schema) {
	if (schema) {
		switch (typeof schema) {
			case 'object':
				if (isArray(schema)) {
					return decodeArray(schema);
				} else if (schema.constructor === PreCompressor){
					return schema.decoder;
				} else {
					return decodeObj(schema);
				}
			case 'function':
				// assumed to be function object containing custom
				// `encoder` and `decoder` functions
				return schema.decoder;
			case 'string':
			case 'number':
			case 'boolean':
				// assumed to be constant (what are they doing in *state*?)
				console.log({
					message: 'createDecoder: constant detected in schema',
					schema,
				});
				return constDecoder(schema);
			default:
				console.log({
					message: 'createDecoder: no specific decoder present for schema',
					schema,
				});
				return anyVal.decoder;
		}
	}
	console.log('WARNING: no schema passed to createDecoder!');
	return anyVal.decoder;
}

export function makeCompressor(schema){
	return {
		encode: createEncoder(schema),
		decode: createDecoder(schema),
	};
}