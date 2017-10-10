// Radix sort for Uint32, adapted from  Victor J. Duvanenko, taken from
// https://duvanenko.tech.blog/2017/06/15/faster-sorting-in-javascript/

const totalBins = 256;
const byteSize = 8;
function radixUint32(input) {
	const length = input.length;

	let output = new Uint32Array(length);

	const arrayConstr = length < 256 ?
		Uint8Array :
		length < (1<<16) ?
			Uint16Array :
			length < (1<<32) ?
				Uint32Array :
				Float64Array;
	let count = new arrayConstr(totalBins);
	let output_has_result = false;

	let bitMask = 255;
	let shiftRightAmount = 0;

	let startOfBin = new arrayConstr(totalBins);
	let endOfBin = new arrayConstr(totalBins);

	// end processing digits when all the mask bits have
	// been processed and shifted out, leaving no bits
	// set in the bitMask
	while (bitMask !== 0){
		count.fill(0);
		let idx = 0;
		// Scan the array and count the number of times each digit appears
		for (let i = 0; i < length; i++){
			idx = (input[i] & bitMask) >>> shiftRightAmount;
			count[idx]++;
		}

		startOfBin[0] = endOfBin[0] = 0;
		for (let i = 1; i < totalBins; i++){
			startOfBin[i] = endOfBin[i] = startOfBin[i - 1] + count[i - 1];
		}

		for (let i = 0; i < length; i++){
			idx = (input[i] & bitMask) >>> shiftRightAmount;
			output[endOfBin[idx]++] = input[i];
		}

		bitMask <<= byteSize;
		shiftRightAmount += byteSize;
		output_has_result = !output_has_result;

		// swap input and output arrays
		[input, output] = [output, input];
	}

	if (output_has_result){
		input.set(output);
	}

	return input;
}

// Sorts a Float64Array by it's bitmask-and 0xFFFFFFFF value
function radix32Float64(input) {
	const length = input.length;

	let output = new Float64Array(length);

	const arrayConstr = length < 256 ?
		Uint8Array :
		length < (1<<16) ?
			Uint16Array :
			length < (1<<32) ?
				Uint32Array :
				Float64Array;
	let count = new arrayConstr(totalBins);
	let output_has_result = false;

	let bitMask = 255;
	let shiftRightAmount = 0;

	let startOfBin = new arrayConstr(totalBins);
	let endOfBin = new arrayConstr(totalBins);

	// end processing digits when all the mask bits have
	// been processed and shifted out, leaving no bits
	// set in the bitMask
	while (bitMask !== 0){
		count.fill(0);
		let idx = 0;
		// Scan the array and count the number of times each digit appears
		for (let i = 0; i < length; i++){
			idx = (input[i] & bitMask) >>> shiftRightAmount;
			count[idx]++;
		}

		startOfBin[0] = endOfBin[0] = 0;
		for (let i = 1; i < totalBins; i++){
			startOfBin[i] = endOfBin[i] = startOfBin[i - 1] + count[i - 1];
		}

		for (let i = 0; i < length; i++){
			idx = (input[i] & bitMask) >>> shiftRightAmount;
			output[endOfBin[idx]++] = input[i];
		}

		bitMask <<= byteSize;
		shiftRightAmount += byteSize;
		output_has_result = !output_has_result;

		// swap input and output arrays
		[input, output] = [output, input];
	}

	if (output_has_result){
		input.set(output);
	}

	return input;
}

/*

TODO: Figure out why the above breaks scatterplot

import {
	arraySubset,
	attrSubset,
	attrToColorFactory,
	attrToColorIndexFactory,
	clipRange,
	constrain,
	getPalette,
	logProject,
	logProjectArray,
	nullFunc,
	rndNorm,
} from '../js/util';

import {
	drawText,
	textSize,
	textStyle,
} from './canvas';

// "global" array of sprite canvases.
// Dots will be drawn in later (depends on colour settings)
// Multiple radii; no need to draw a 256x256 image for a 8x8 dot
const {
	allSprites,
	contexts,
} = (() => {
	let i = 257,
		j = 8;
	const allSprites = new Array(j),
		contexts = new Array(i);
	while (j--) {
		i = 257;
		const _sprites = new Array(i);
		while (i--) {
			_sprites[i] = document.createElement('canvas');
			_sprites[i].id = `dot_sprite_${j}_${i}`;
			_sprites[i].width = 4 << j;
			_sprites[i].height = 4 << j;
		}
		allSprites[j] = _sprites;
	}
	return {
		allSprites,
		contexts,
	};
})();

const { log2 } = Math;

export function scatterPlot(attrs, indices, settings) {
	// only render if all required settings are supplied
	if (!(indices && settings)) {
		return nullFunc;
	}

	const xAttr = attrs[settings.x.attr],
		yAttr = attrs[settings.y.attr],
		colorAttr = attrs[settings.colorAttr];

	// only render if all required data is supplied
	if (!(xAttr && yAttr && colorAttr && indices)) {
		return nullFunc;
	}

	let {
		colorMode,
	} = settings;
	const dataToIdx = attrToColorIndexFactory(colorAttr, colorMode, settings);

	return (context) => {
		context.save();

		// Erase previous paint
		context.clearRect(0, 0, context.width, context.height);

		const {
			spriteLayout,
			labelLayout,
		} = calcLayout(context, settings);

		// ==================================================
		// == Prepare Palette & pre-render dots to sprites ==
		// ==================================================
		prepareSprites(colorMode, spriteLayout);

		// =====================================
		// == Convert x, y to pixel positions ==
		// =====================================

		// Avoid accidentally mutating source arrays.
		// Arrays of (indexed) strings are converted to
		// numerical arrays representing the twenty most
		// common strings as categories, plus one "other"
		// for all remaining values
		let xy = convertCoordinates(xAttr, yAttr, indices, spriteLayout, settings);
		// ======================================================
		// == Convert color data to lookup indices for sprites ==
		// ======================================================

		let { cIdx } = convertColorData(colorAttr, indices, dataToIdx);

		// ==============================
		// == Sort for tiling purposes ==
		// ==============================

		// Sort so that we render zero values first, and then from back-to-front.
		// This has to be done after jittering to maintain the tiling behaviour
		// that is desired.
		const sorted = sortByAxes(xy, cIdx, spriteLayout.sprites);

		// ============================
		// == blit sprites to canvas ==
		// ============================

		// Now that we converted the coordinates, prepared the sprites
		// and the colour indices to look them up, we can blit them
		// to the canvas.
		blitSprites(context, spriteLayout, sorted);

		// =================
		// == draw labels ==
		// =================

		drawLabels(context, xAttr, yAttr, colorAttr, labelLayout);

		// Heatmap scale, if necessary
		if (colorMode === 'Heatmap') {
			drawHeatmapScale(context, colorAttr, labelLayout, colorMode, settings);
		}

		context.restore();
	};
}

function calcLayout(context, settings) {
	const {
		min, sqrt,
	} = Math;
	const scaleFactor = settings.scaleFactor || 50;

	let {
		width, height, pixelRatio,
	} = context;
	const shortEdge = min(width, height);

	// Suitable radius of the markers
	// - smaller canvas size -> smaller points
	let radius = log2(shortEdge) * scaleFactor / 50 * pixelRatio | 0;
	radius = constrain(radius, 1, 254);

	let spriteIdx = 0,
		spriteRadius = 2;
	while (spriteRadius < radius + 1) {
		spriteIdx++;
		spriteRadius = 2 << spriteIdx;
	}
	const sprites = allSprites[spriteIdx];

	let labelTextSize = constrain(sqrt(shortEdge), 12, 64) * pixelRatio * 0.75 | 0;
	let labelMargin = (labelTextSize * 1.8) | 0;

	const spriteLayout = {
		x: labelMargin,
		y: 0,
		width: width - labelMargin - radius * 2,
		height: height - labelMargin - radius * 2,
		radius,
		spriteRadius,
		sprites,
	};

	const xLabel = {
		x: labelMargin * 1.5 | 0,
		y: height - labelTextSize | 0,
	};
	// yLabel will be translated and rotated so (x,y) origin
	// will point to lower left
	const yLabel = {
		x: labelMargin * 1.5 | 0,
		y: labelTextSize | 0,
	};

	const gradientSize = constrain(shortEdge / 10, 16, 256 * context.pixelRatio) | 0;
	const labelOffset = labelTextSize * 3 | 0;

	const colorLabel = {
		x: (width - gradientSize - labelOffset) | 0,
		y: height - labelTextSize | 0,
		gradientSize,
		width: 0, // width of heatmap scale, if plotted
	};

	return {
		spriteLayout,
		labelLayout: {
			labelTextSize,
			xLabel,
			yLabel,
			colorLabel,
		},
	};
}

function convertCoordinates(xAttr, yAttr, indices, spriteLayout, settings) {
	// For small value ranges (happens with PCA a lot),
	// jittering needs to be scaled down
	let xDelta = xAttr.max - xAttr.min,
		xJitter = 1,
		yDelta = yAttr.max - yAttr.min,
		yJitter = 1;

	if (xDelta / xJitter < 8) {
		xJitter = ((log2(xDelta) * 8) | 0) / 32;
	}
	if (yDelta / yJitter < 8) {
		yJitter = ((log2(yDelta) * 8) | 0) / 32;
	}

	// If we have an string array, convert it
	// to numbers as a form of categorization.
	// Similarly, if we need to jitter the data
	// we must ensure the data array is a floating
	// point typed array, not an integer array.
	let xData = convertAttr(xAttr, indices, settings.x.jitter);
	let yData = convertAttr(yAttr, indices, settings.y.jitter);
	// Jitter if requested
	maybeJitterData(xData, yData, settings, xJitter, yJitter);
	// Scale to screen dimensions with margins
	return scaleToContext(xData, yData, xAttr, yAttr, spriteLayout, settings);
}

function convertAttr(attr, indices, jitter) {
	// In practice, having text data that is not indexed
	// only happens if all strings are unique,
	// so it's kind of pointless
	if (attr.arrayType === 'string' && !attr.indexedVal) {
		let i = indices.length;
		let retVal = new Float32Array(i);
		while (i--) {
			retVal[i] = indices[i] + 1;
		}
		return retVal;
	}
	// If we jitter later, we need to return a float32,
	// Otherwise we can keep the more compact typed arrays
	// if our data is integers
	const convertedType = jitter ? 'float32' : attr.arrayType;
	return arraySubset(attr.data, convertedType, indices);
}

function maybeJitterData(xData, yData, settings, xJitter, yJitter) {
	const {
		PI, random, sin, cos,
	} = Math;
	const TAU = 2 * PI;
	let i = xData.length;
	if (settings.x.jitter && settings.y.jitter) {
		// if jittering both axes, do so in a
		// circle around the data
		while (i--) {
			const r = rndNorm();
			const t = TAU * random();
			xData[i] += xJitter * r * sin(t);
			yData[i] += yJitter * r * cos(t);
		}
	} else if (settings.x.jitter) {
		while (i--) {
			xData[i] += xJitter * rndNorm();
		}
	} else if (settings.y.jitter) {
		while (i--) {
			yData[i] += yJitter * rndNorm();
		}
	}
}

// returns a uint32 array `xy` that contains y and x bitpacked into it,
// as `((y & 0xFFFF)<<16) + (x & 0xFFFF)`. Supposedly faster than using
// separate uint16 arrays. Also sorts a bit quicker.
function scaleToContext(xData, yData, xAttr, yAttr, spriteLayout, settings) {
	let xMin = xAttr.min,
		xMax = xAttr.max,
		yMin = yAttr.min,
		yMax = yAttr.max;

	if (settings.x.logScale) {
		logProjectArray(xData);
		xMin = logProject(xMin);
		xMax = logProject(xMax);
	}
	if (settings.y.logScale) {
		logProjectArray(yData);
		yMin = logProject(yMin);
		yMax = logProject(yMax);
	}

	const xMargin = (xMax - xMin) * 0.0625;
	const yMargin = (yMax - yMin) * 0.0625;

	let xy = new Uint32Array(xData.length);
	// we add xMargin/yMargin in the divisor here
	// (and compensate further on with 0.5) to
	// *also* add a margin *before* the normalization.
	// We also subtract the radius to avoid any points
	// from going over the edge of the canvas.
	const {
		width, height, radius,
	} = spriteLayout;
	let xScale = ((width - 4 * radius)) / (xMax - xMin + xMargin);
	let yScale = ((height - 4 * radius)) / (yMax - yMin + yMargin);
	let i = xData.length;
	while (i--) {
		let x = (xData[i] - xMin + 0.5 * xMargin) * xScale + 2 * radius;
		let y = (yData[i] - yMin + 0.5 * yMargin) * yScale + 2 * radius;
		// packing x and y into one 32-bit integer is currently faster
		// than using two arrays. As long as our screen dimension do
		// not exceed 32k pixels in either dimension we should be fine
		xy[i] = ((y & 0x7FFF) << 16) + (x & 0x7FFF);
	}
	return xy;
}

function convertColorData(colorAttr, indices, dataToIdx) {
	const colData = attrSubset(colorAttr, indices);
	// Largest palettes are 256 entries in size,
	// so we can safely Uint8Array for cIdx
	let cIdx = new Uint8Array(colData.length);
	let i = cIdx.length;
	while (i--) {
		cIdx[i] = dataToIdx(colData[i]);
	}
	return { cIdx };
}

function prepareSprites(colorMode, spriteLayout) {
	const {
		radius, sprites,
	} = spriteLayout;

	let palette = getPalette(colorMode);
	const spriteW = sprites[0].width,
		spriteH = sprites[0].height;
	const lineW = constrain(radius / 10, 0.125, 0.5);
	// reset all sprites to empty circles
	let i = sprites.length;
	while (i--) {
		let ctx = sprites[i].getContext('2d');
		ctx.save();
		ctx.clearRect(0, 0, spriteW, spriteH);
		ctx.beginPath();
		ctx.arc(spriteW * 0.5, spriteH * 0.5, radius, 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.globalAlpha = 0.3;
		ctx.strokeStyle = 'black';
		ctx.lineWidth = lineW;
		ctx.stroke();
		ctx.restore();
		contexts[i] = ctx;
	}
	// fill the _sprites that have a palette
	// note the prefix decrement to skip index zero
	i = palette.length;
	while (--i) {
		let ctx = contexts[i];
		ctx.save();
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = palette[i];
		ctx.fill();
		ctx.restore();
	}
}

function sortByAxes(xy, cIdx, sprites) {

	// Note that at this point xy contains the x,y coordinates
	// packed as 0x YYYY XXXX, so sorting by that value
	// automatically sorts by Y first, X second
	// However, we want to draw the zero-values underneath the
	// non-zero values, so we make a copy of this array
	// with 0x7FFFFFFF if cIdx is zero, and sort by that copy.
	// (we want zero values at the end because we use while(i--)
	// instead of for loops as a micro-optimization)


	// Strategy:
	// - Pack indexes and xy into one Float64.
	// - radix sort lower 32 bytes (xy)
	// - extract xy and index values without
	//   extra layers of indirection of above method
	// Doubles can store all integers up to 2**53+1,
	// so for any indices < 2**21 we're fine (two million)
	// Above has ben tested to be correct with the following snippet:
	// let mul = 0x100000000,
	// 	div = 1 / mul;
	// for (let i = 0; i < (1 << 22); i++) {
	// 	let j = i * mul;
	// 	j *= div;
	// 	if (i !== j) {
	// 		console.log({ i, j });
	// 		break;
	// 	}
	// }

	const l = cIdx.length;
	let zeros = 0,
		compVal = Float64Array.from(xy),
		cSprites = new Array(l),
		i = l;
	while(i--) {
		let idx =  cIdx[i];
		if (idx === 0){
			compVal[i] = compVal[i] & 0x80008000;
			zeros++;
		} else {
			compVal[i] += idx * 0x100000000;
		}
	}

	radix32Float64(compVal);

	// copy sprites;
	i = l;
	while(i--){
		// x2.3283064365386963e-10 ===  / 0x100000000
		let idx = (compVal[i] * 2.3283064365386963e-10) | 0;
		cSprites[i] = sprites[idx];
	}

	return {
		xy: compVal,
		cSprites,
		zeros,
	};
}

// Sorts a Float64Array by it's bitmask-and 0xFFFFFFFF value
function radix32Float64(input) {
	const totalBins = 256;
	const byteSize = 8;
	const length = input.length;

	let output = new Float64Array(length);

	const arrayConstr = length < 256 ?
		Uint8Array :
		length < (1 << 16) ?
			Uint16Array :
			length < (1 << 32) ?
				Uint32Array :
				Float64Array;
	let count = new arrayConstr(totalBins);
	let output_has_result = false;

	let bitMask = 255;
	let shiftRightAmount = 0;

	let startOfBin = new arrayConstr(totalBins);
	let endOfBin = new arrayConstr(totalBins);

	// end processing digits when all the mask bits have
	// been processed and shifted out, leaving no bits
	// set in the bitMask
	while (bitMask !== 0) {
		count.fill(0);
		let idx = 0;
		// Scan the array and count the number of times each digit appears
		for (let i = 0; i < length; i++) {
			idx = (input[i] & bitMask) >>> shiftRightAmount;
			count[idx]++;
		}

		startOfBin[0] = endOfBin[0] = 0;
		for (let i = 1; i < totalBins; i++) {
			startOfBin[i] = endOfBin[i] = startOfBin[i - 1] + count[i - 1];
		}

		for (let i = 0; i < length; i++) {
			idx = (input[i] & bitMask) >>> shiftRightAmount;
			output[endOfBin[idx]++] = input[i];
		}

		bitMask <<= byteSize;
		shiftRightAmount += byteSize;
		output_has_result = !output_has_result;

		// swap input and output arrays
		[input, output] = [output, input];
	}

	if (output_has_result) {
		input.set(output);
	}

	return input;
}

function blitSprites(context, spriteLayout, sorted) {
	const {
		x,
		y,
		height,
		sprites,
		spriteRadius,
	} = spriteLayout;

	let {
		cSprites,
		zeros,
		xy,
	} = sorted;

	let zeroSprite = sprites[0],
		_xy = 0,
		_x = 0,
		_y = 0,
		i = cSprites.length - zeros;
	// draw zero values first
	while (zeros--) {
		_xy = xy[i + zeros];
		// Even though xy is a Float64, bitmasking and
		// shifting forces it to a 32-bit uint value.
		_x = x + (_xy & 0x7FFF) - spriteRadius | 0;
		_y = y + (height - ((_xy >>> 16) & 0x7FFF)) - spriteRadius | 0;
		context.drawImage(zeroSprite, _x, _y);
	}
	while (i--) {
		_xy = xy[i];
		_x = x + (_xy & 0x7FFF) - spriteRadius | 0;
		_y = y + (height - ((_xy >>> 16) & 0x7FFF)) - spriteRadius | 0;
		context.drawImage(cSprites[i], _x, _y);
	}
}

function drawLabels(context, xAttr, yAttr, colorAttr, labelLayout) {
	const {
		labelTextSize, xLabel, yLabel, colorLabel,
	} = labelLayout;
	textStyle(context);
	textSize(context, labelTextSize);

	// X attribute name
	drawText(context, xAttr.name, xLabel.x, xLabel.y);

	// Y attribute name
	context.translate(0, context.height);
	context.rotate(-Math.PI / 2);
	drawText(context, yAttr.name, yLabel.x, yLabel.y);
	context.rotate(Math.PI / 2);
	context.translate(0, -context.height);

	// Color attribute name
	context.textAlign = 'end';
	drawText(context, colorAttr.name, colorLabel.x - labelTextSize * 6 - 5 | 0, colorLabel.y);
	context.textAlign = 'start';
}

function drawHeatmapScale(context, colorAttr, labelLayout, colorMode, settings) {
	const {
		min, max,
	} = colorAttr;
	const { labelTextSize } = labelLayout;
	const {
		x, y, gradientSize,
	} = labelLayout.colorLabel;
	const { pixelRatio } = context;

	// label for min value
	const lblMin = min !== (min | 0) ? min.toExponential(2) : min | 0;
	context.textAlign = 'end';
	drawText(context, lblMin, (x - 5) | 0, y);

	// label for max value
	const lblMax = max !== (max | 0) ? max.toExponential(2) : max | 0;
	context.textAlign = 'start';
	drawText(context, lblMax, (x + gradientSize + 5) | 0, y);

	// border for colour gradient
	const cY = (y - labelTextSize) | 0;
	context.fillRect(
		x - pixelRatio,
		cY - pixelRatio,
		gradientSize + 2 * pixelRatio,
		labelTextSize * 1.25 + 2 * pixelRatio
	);

	const range = clipRange(colorAttr, settings);
	const cDelta = colorAttr.max - colorAttr.min;
	// draw clipping points, if required
	if (range.min !== range.clipMin) {
		const clipMin = settings.logScale ? Math.pow(2, range.clipMin) : range.clipMin;
		const clipMinX = ((clipMin - range.min) * gradientSize / cDelta) | 0;
		context.fillRect(
			x + clipMinX,
			cY - pixelRatio * 3,
			pixelRatio | 0,
			labelTextSize * 1.25 + 6 * pixelRatio | 0
		);
	}
	if (range.max !== range.clipMax) {
		const clipMax = settings.logScale ? Math.pow(2, range.clipMax) : range.clipMax;
		const clipMaxX = ((clipMax - range.min) * gradientSize / cDelta) | 0;
		context.fillRect(
			x + clipMaxX,
			cY - pixelRatio * 3,
			pixelRatio,
			labelTextSize * 1.25 + 6 * pixelRatio | 0
		);
	}
	// colour gradient
	const cScaleFactor = cDelta / gradientSize;
	const valToColor = attrToColorFactory(colorAttr, colorMode, settings);
	let i = gradientSize;
	while (i--) {
		context.fillStyle = valToColor(colorAttr.min + i * cScaleFactor);
		context.fillRect(x + i, cY, 1, labelTextSize * 1.25 | 0);
	}
}



*/