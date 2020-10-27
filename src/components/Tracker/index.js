// @flow strict

import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import * as actions from '../../actions';
import * as selectors from '../../selectors';

import type { Dispatch } from 'redux';
import type { ReduxState, LogIdentity, Line, TrackerData, NodeState } from '../../models';
import type { ContextRouter } from 'react-router-dom';


type Props = {
  // lines: Line[],
  // logIdentity: LogIdentity,
  // loadLogByIdentity: (LogIdentity) => void,
} & ContextRouter;

type State = {
  currLineNum: number,
};

class Tracker extends React.Component<Props, State> {
  trackerMap: Map<String, Map<Number, TrackerData>> = new Map();
  // Keep track of the last log data so that we can continue propagating fields that weren't
  // changed.
  currMap: Map<String, TrackerData> = new Map();

  constructor(props) {
    super(props);
    this.state = {
      currLineNum: 0
    };
    // this.props.loadLogByIdentity(logIdentity);
    this.parseLogs();
    console.log(this.trackerMap);
  }

  parseLogs = () => {
    const { data } = this.props.location;
    return data.forEach(line => {
      const port = line.port;
      if (!port) {
        return;
      }

      const trackerData = this.parseLogLine(port, line.text);
      if (trackerData) {
        if (!this.trackerMap.get(port)) {
          this.trackerMap.set(port, new Map());
        }

        this.trackerMap.get(port).set(line.lineNumber, trackerData);
        this.currMap.set(port, trackerData);
      }
    });
  };

  parseLogLine = (port, lineText) => {
    const start = lineText.indexOf('{');
    const obj = JSON.parse(lineText.slice(start));

    const logLineID = obj.id;
    if (!logLineID || isNaN(logLineID)) {
      return;
    }

    const attr = obj.attr;
    const currNodeData = this.currMap.get(port) || {};
    switch (logLineID) {
      case 4615611:
        // Node starting up.
        return {state: "STARTUP", pid: attr.pid};
      case 23138:
        // Node shutting down.
        return {...currNodeData, state: "STOPPED"};
      case 21358:
        // State transition.
        return {...currNodeData, state: attr.newState};
      default:
        return;
    }
  };

  generateDiagram = lineNum => {
    return (<div>{lineNum}</div>);
  }

  componentDidUpdate(prevProps: Prop, prevState: State) {
    // Adding this in to prevent some redness.
    // TODO: Remove/replace this.
    this.generateDiagram(this.state.currLineNum);
  }

  render() {
    return (
      // WIP
      <Fragment>
        <div>Node List</div>
        <ul>
          {this.trackerMap.forEach((map, port) => (
            <p>
              Port: {port}
              <ul>
                {map.forEach((node, lineNumber) => (
                    <Fragment>
                      <p> Line number: {lineNumber} </p>
                      <p> State: {node.state} </p>
                      <p> PID: {node.pid} </p>
                    </Fragment>
                ))}
              </ul>
            </p>
          ))}
        </ul>
      </Fragment>
    );
  }
}

// Tracker.defaultProps = {
//   logIdentity: null,
// }

// function mapStateToProps(state: ReduxState, ownProps: $Shape<Props>): $Shape<Props> {
//   console.log(state);
//   const lines = selectors.getFilteredLineData(state);
//   console.log(lines);
//   return {
//     ...ownProps,
//     lines: lines,
//   };
// }

// function mapDispatchToProps(dispatch: Dispatch<*>, ownProps) {
//   return {
//     ...ownProps,
//     loadLogByIdentity: (identity: LogIdentity) => dispatch(actions.loadLog(identity))
//   };
// }

// export default connect(mapStateToProps, mapDispatchToProps)(Tracker);

export default Tracker;
