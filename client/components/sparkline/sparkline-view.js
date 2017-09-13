import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { SparklineList } from './sparklines';

import { ViewInitialiser } from '../view-initialiser';

import { isEqual } from 'lodash';

import { firstMatchingKey, merge } from '../../js/util';

class SparklineViewComponent extends PureComponent {
	componentWillMount() {
		this.setState({
			indicesChanged: false,
		});
	}

	componentWillReceiveProps(nextProps) {
		const pVS = this.props.dataset.viewState.col,
			nVS = nextProps.dataset.viewState.col;

		const indicesChanged = !isEqual(pVS.order, nVS.order) ||
			!isEqual(pVS.indices, nVS.indices);
		this.setState({
			indicesChanged,
		});

	}

	render() {
		const { dispatch, dataset } = this.props;
		const { col } = dataset;
		const sl = dataset.viewState.sparkline;
		const {
			indices,
			settings,
			scatterPlots,
		} = dataset.viewState.col;
		// The old column attribute values that we displayed in the "legend"
		let legendData = col.attrs[sl.colAttr];
		// if colAttr does not exist (for example, the default values
		// in the Loom interface is not present), pick the first column
		if (legendData === undefined) {
			legendData = col.attrs[col.keys[0]];
		}
		const { indicesChanged } = this.state;

		const scatterPlotSettings = merge(settings, scatterPlots.plots[0]);
		return (
			<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
				<SparklineSidepanel
					dispatch={dispatch}
					dataset={dataset}
					style={{
						overflowX: 'hidden',
						overFlowY: 'hidden',
						minHeight: 0,
						width: '300px',
						margin: '10px',
					}}
				/>
				<SparklineList
					attrs={dataset.col.attrs}
					selection={sl.genes}
					indicesChanged={indicesChanged}
					groupAttr={sl.groupBy ? sl.colAttr : ''}
					indices={indices}
					geneMode={sl.geneMode}
					col={col}
					colAttr={sl.colAttr}
					colMode={sl.colMode}
					path={dataset.path}
					settings={scatterPlotSettings}
					showLabels={sl.showLabels} />
			</div>
		);
	}
}


SparklineViewComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const stateInitialiser = (dataset) => {
	// Initialise sparklineState for this dataset
	const attrs = dataset.col.attrs;
	return {
		landscapeInitialized: true,
		sparkline: {
			colAttr: firstMatchingKey(dataset.col.attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
			colMode: 'Stacked',
			geneMode: 'Bars',
			genes: ['Cdk1', 'Top2a', 'Hexb', 'Mrc1', 'Lum', 'Col1a1', 'Cldn5', 'Acta2', 'Tagln', 'Foxj1', 'Ttr', 'Aqp4', 'Meg3', 'Stmn2', 'Gad2', 'Slc32a1', 'Plp1', 'Sox10', 'Mog', 'Mbp', 'Mpz'],
			showLabels: true,
		},
		col: {
			scatterPlots: {
				selected: 0,
				plots: [
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
					},
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
					},
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1', '_LogMean']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2', '_LogCV']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
					},
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1', '_LogMean']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2', '_LogCV']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
					},
				],
			},
			settings: {
				scaleFactor: 20,
			},
		},
	};
};

export class SparklineViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={SparklineViewComponent}
				stateName={'sparkline'}
				stateInitialiser={stateInitialiser}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

SparklineViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	datasets: PropTypes.object,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		datasets: state.datasets.list,
	};
};

export const SparklineView = connect(mapStateToProps)(SparklineViewInitialiser);
