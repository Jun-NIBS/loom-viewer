
import React, { Component, PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux'
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import loomAppReducer from './reducers'
import { Navbar } from './navbar';
import { HeatmapView } from './heatmap-view';
import { SparklineView } from './sparkline-view';
import { LandscapeView } from './landscape-view';
import { fetchGene } from './actions.js';

// create a store that has redux-thunk middleware enabled
let store = applyMiddleware(thunk)(createStore)(loomAppReducer);


class App extends Component {
  render() {
	// Injected by connect() call:
	const dispatch = this.props.dispatch;

	var view = <div></div>;

	switch(this.props.viewState.view) {
		case "Heatmap":
			view =
				<HeatmapView 
					dataState={this.props.dataState}
					heatmapState={this.props.heatmapState}
					fileInfo={this.props.fileInfo}

					onFindGenesChanged={(genes)=>dispatch({type: 'SET_GENES_TO_FIND', genes: genes })}
					onHeatmapBoundsChanged={(bounds)=>dispatch({ 
						type: 'SET_HEATMAP_BOUNDS', 
						screenBounds: bounds.screenBounds,
						dataBounds: bounds.dataBounds,
						center: bounds.center,
						zoom: bounds.zoom
					})}
					onSelectedRowAttrChange={(attr)=>dispatch({type:'SET_SELECTED_ROW_ATTR', attr: attr})}
					onSelectedColAttrChange={(attr)=>dispatch({type: 'SET_SELECTED_COL_ATTR', attr: attr})}
					onSelectedRowModeChange={(mode)=>dispatch({type: 'SET_SELECTED_ROW_MODE', mode: mode})}
					onSelectedColModeChange={(mode)=>dispatch({type: 'SET_SELECTED_COL_MODE', mode: mode})}
				/>
			break;
		case "Sparkline":
			view =
				<SparklineView 
					dataState={this.props.dataState}
					sparklineState={this.props.sparklineState}
					fileInfo={this.props.fileInfo}

					onFindGenesChange={(genes)=>dispatch({type: 'SPARKLINE_SET_GENES_TO_FIND', genes: genes })}
					onColAttrChange={(attr)=>dispatch({type: 'SPARKLINE_SET_COL_ATTR', attr: attr})}
					onColModeChange={(mode)=>dispatch({type: 'SPARKLINE_SET_COL_MODE', mode: mode})}
					onColorByAttrChange={(attr)=>dispatch({type: 'SPARKLINE_SET_COLOR_ATTR', attr: attr})}
					onColorByModeChange={(mode)=>dispatch({type: 'SPARKLINE_SET_COLOR_MODE', mode: mode})}
					onOrderByAttrChange={(attr)=>dispatch({type: 'SPARKLINE_SET_ORDER_ATTR', attr: attr})}
				/>
			break;
		case "Landscape":
			view = <LandscapeView
				dataState={this.props.dataState}
				landscapeState={this.props.landscapeState}
				fileInfo={this.props.fileInfo}

				onXCoordinateChange={(x)=>dispatch({type: 'SET_LANDSCAPE_X', xCoordinate: x})}
				onYCoordinateChange={(y)=>dispatch({type: 'SET_LANDSCAPE_Y', yCoordinate: y})}
				onColorAttrChange={(c)=>dispatch({type: 'SET_LANDSCAPE_COLOR_ATTR', color: c})}
				onColorModeChange={(mode)=>dispatch({type: 'SET_LANDSCAPE_COLOR_MODE', mode: mode})}
				onColorGeneChange={(gene)=>{
					dispatch({type: 'SET_LANDSCAPE_COLOR_GENE', gene: gene});
					dispatch(fetchGene(this.props.fileInfo.rowAttrs, gene));
				}}
				onXGeneChange={(gene)=>{
					dispatch({type: 'SET_LANDSCAPE_X_GENE', gene: gene});
					dispatch(fetchGene(this.props.fileInfo.rowAttrs, gene));
				}}
				onYGeneChange={(gene)=>{
					dispatch({type: 'SET_LANDSCAPE_Y_GENE', gene: gene})
					dispatch(fetchGene(this.props.fileInfo.rowAttrs, gene));
				}}
			/>
			break;
		default:
			view = <div>{"Unknown view: " + this.props.viewState.view}</div>;		
			break;
	}
	return (
		<div>
			<Navbar 
				fileName={this.props.fileInfo.fileName}
				viewState={this.props.viewState.view}

				onSetViewState={(state)=>dispatch({type: 'SET_VIEW_STATE', state: state})}
			/>
			{view}
		</div>
	)
  }
}
App.propTypes = {
	dataState: PropTypes.object,
	heatmapState: PropTypes.object,
	landscapeState: PropTypes.object,
	fileInfo: PropTypes.object,
	viewState: PropTypes.object
}

// Which props do we want to inject, given the global state?
// Note: use https://github.com/faassen/reselect for better performance.
function select(state) {
	return state
}

// Wrap the component to inject dispatch and state into it
App = connect(select)(App)



render(
	<Provider store={store}>
		<App/>
	</Provider>
, document.getElementById('react-root'));
