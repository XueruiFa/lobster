// @flow strict

import React, { Fragment } from 'react';
// import { connect } from 'react-redux';
// import * as actions from '../../actions';
// import * as selectors from '../../selectors';

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
  // Map of config ID fields to (line number, list of members) pairs.
  configMap: Map<String, Map<Number, Set>> = new Map();
  lastConfigMap: Map<String, Set> = new Map();

  memberDataMap: Map<String, Map<Number, MemberData>> = new Map();
  // Keep track of the last log data so that we can continue propagating fields that weren't
  // changed.
  lastMemberDataMap: Map<String, MemberData> = new Map();

  constructor(props) {
    super(props);
    this.state = {
      currLineNum: 0
    };
    // this.props.loadLogByIdentity(logIdentity);
    this.parseLogs();
    console.log(this.configMap);
    console.log(this.memberDataMap);
  }

  parseLogs = () => {
    const { data } = this.props.location;
    return data.forEach(line => {
      const port = line.port;
      const lineNum = line.lineNumber;
      if (!port) {
        return;
      }

      const memberData = this.parseLogLine(port, line.text, lineNum);
      if (memberData) {
        if (!this.memberDataMap.get(port)) {
          this.memberDataMap.set(port, new Map());
        }

        this.memberDataMap.get(port).set(lineNum, memberData);
        this.lastMemberDataMap.set(port, memberData);
      }
    });
  };

  parseLogLine = (port, lineText, lineNum) => {
    const start = lineText.indexOf('{');
    const obj = JSON.parse(lineText.slice(start));

    const logLineID = obj.id;
    if (!logLineID || isNaN(logLineID)) {
      return;
    }

    const attr = obj.attr;
    // Last data for the node.
    const currNodeData = this.lastMemberDataMap.get(port) || {};

    switch (logLineID) {
      case 4615611:
        // Node starting up.
        return { state: 'STARTUP', pid: attr.pid, syncSource: '', rsConfig: {}, granularity: 1 };
      case 23138:
        // Node shutting down.
        return { ...currNodeData, state: 'DOWN', granularity: 1 };
      case 21358:
        // State transition.
        return { ...currNodeData, state: attr.newState, granularity: 1 };
      case 21799:
        // Sync source candidate chosen.
        const syncSourcePort = attr.syncSource.split(':')[1];
        return { ...currNodeData, syncSource: syncSourcePort, granularity: 1 };
      case 21106:
        // Resetting sync source to empty.
        return { ...currNodeData, syncSource: '', granularity: 1 };
      case 21392:
        // Node is using new config.
        return { ...currNodeData, rsConfig: attr.config, granularity: 1 };
      case 21393:
      case 21394:
        // Node found itself in new config.
        // Add the member's port into the current config members. Should be a no-op
        // if it is already in the set.

        const config = currNodeData.rsConfig;
        const configId = config._id;
        const currConfigMembers = new Set(this.lastConfigMap.get(configId));

        if (logLineID === 21393) { // Node found itself in new config.
            // Add the member's port into the current config members. Should be a no-op
            // if it is already in the set.
          currConfigMembers.add(port);
        } else { // Node could not find itself in new config.
          currConfigMembers.delete(port);
        }

        if (!this.configMap.get(configId)) {
          this.configMap.set(configId, new Map());
        }

        this.configMap.get(configId).set(lineNum, currConfigMembers);
        this.lastConfigMap.set(configId, currConfigMembers);
        return;
      default:
        return;
    }
  };

  generateDiagram = lineNum => {
    return (<div>{lineNum}</div>);
  }

  componentDidUpdate() {
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
          {this.memberDataMap.forEach((map, port) => (
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
