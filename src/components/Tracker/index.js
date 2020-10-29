// @flow strict

import React, { Fragments } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as actions from '../../actions';
import * as selectors from '../../selectors';

import type { Dispatch } from 'redux';
import type { ReduxState, LogIdentity, Line, TrackerData, NodeState } from '../../models';
import type { ContextRouter } from 'react-router-dom';
import NodeTable from './NodeTable';

import './style.css';

import { LineChart, Label, ResponsiveContainer, XAxis, YAxis, ReferenceLine, Tooltip, Brush, Line as PlotLine} from 'recharts';
import {
  Col
} from 'react-bootstrap';

type Props = {
  lines: Line[],
  selectedLineNum: Number,
  // logIdentity: LogIdentity,
  // loadLogByIdentity: (LogIdentity) => void,
} & ContextRouter;

type PlotDot = {
 line: number,
 state: string,
};

type State = {
  currLineNum: number,
  diagramData: PlotDot[],
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
      currLineNum: 0,
      diagramData: []
    };
    // this.props.loadLogByIdentity(logIdentity);
    this.parseLogs();
    this.parseDiagramData();

    console.log(this.configMap);
    console.log(this.memberDataMap);
    console.log(this.state.diagramData);
  }


  parseDiagramData = () => {
      for (let [port, entries] of this.memberDataMap)  {
          for (let [line, value] of entries) {
              let entry = {}; 
              let ylabel = "d" + port.toString();
              if (value.state === 'PRIMARY' || value.state === 'SECONDARY') {
                entry[ylabel] = port.toString() + "UP";
              }
              else {
                entry[ylabel] = port.toString() + "DOWN";
              }
              entry[port] = port;
              entry['line'] = line;
              entry['pid'] = value.pid;
              entry['state'] = value.state;
              entry['bin'] = value.bin;
              entry['fcv'] = value.fcv;
              entry['syncSource'] - value.syncSource;
              this.state.diagramData.push(entry);
          }
      }
  }

  parseLogs = () => {
    const data = this.props.lines;
    return data.forEach(line => {
      const port = line.port;
      const lineNum = line.lineNumber;
      if (!port) {
        return;
      }

      const memberData = this.parseLogLine(port, line.originalText, lineNum);
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
        return { ...currNodeData, state: 'DOWN', syncSource: '', granularity: 1 };
      case 23403:
        // Binary version.
        const shortBin = attr.buildInfo.version.split("-")[0];
        return { ...currNodeData, bin: shortBin, granularity: 1 };
      case 20459:
        // FCV version.
        return { ...currNodeData, fcv: attr.newVersion, granularity: 1 };
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
      // case 21392:
      //   // Node is using new config.
      //   return { ...currNodeData, rsConfig: attr.config, granularity: 1 };
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

  filterData = (targetLineNum, map) => {
    const filteredMap = new Map();
    for (const [ port, dataMap ] of map) {
      filteredMap.set(port, new Map());
      for (const [ lineNum, memberData ] of dataMap) {
        if (lineNum > targetLineNum) {
          break;
        }

        filteredMap.get(port).set(lineNum, memberData);
      }
    }

    return filteredMap;
  }

  filterMemberData = targetLineNum => {
    return this.filterData(targetLineNum, this.memberDataMap);
  }

  filterConfigData = targetLineNum => {
    return this.filterData(targetLineNum, this.configMap);
  }

  getLastData = targetLineNum => {
    const lastData = [];
    const filteredData = this.filterMemberData(targetLineNum);
    for (const [ port, dataMap ] of filteredData) {
      let lastObj = {};
      for (const [ lineNum, memberData ] of dataMap) {
        lastObj = { ...memberData, port, lineNum };
      }
      lastData.push(lastObj);
    }
    return lastData;
  }

  getDiagramData = targetLineNum => {
     return this.state.diagramData;
  }

  generateDiagram = lineNum => {
    return (<div>{lineNum}</div>);
  }

  componentDidUpdate() {
    // Adding this in to prevent some redness.
    // TODO: Remove/replace this.
    this.generateDiagram(this.state.currLineNum);
  }


  render() {
    const { selectedLineNum } = this.props;
    const filteredMap = this.filterMemberData(selectedLineNum);
    const keys = Array.from(filteredMap.keys());

    return (
      <div
        style={{
          maxWidth: '80%',
          maxHeight: '1500px',
          padding: '30px',
          alignContent: 'center'
        }}
      >
        <NodeTable
          name={`Each Node State By Line ${selectedLineNum}`}
          data={this.getLastData(selectedLineNum)}
          style={{width: "50%", height: "1500px"}}
        />
        {keys.map((port) => {
          const dataMap = filteredMap.get(port);
          const data = [];
          for (const [ lineNum, memberData ] of dataMap) {
            data.push({ ...memberData, lineNum, port });
          }
          return (
            <div>
              <NodeTable
                name={`Node History for ${port}`}
                data={data}
                style={{width: "50%", height: "1500px"}}
              />
              <br />
            </div>
          );
        })}
      <div>History</div>
      <div>
      <ResponsiveContainer minWidth={800} minHeight={400}>
      <LineChart 
        data={this.getDiagramData(selectedLineNum)}
        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        {keys.map((port) => {
            let ylabel = "d" + port.toString();
            return (
                <PlotLine 
                type="stepAfter" 
                activeDot={{ stroke: "green", strokeWidth: 2, r: 5 }}  
                strokeWidth="2"
                dataKey={`${ylabel}`} 
                stroke="#8884d8" /> 
            );
        })}
        <XAxis type="category" dataKey="line">
            <Label value="Line#" offset={0} position="insideBottomLeft" />
        </XAxis>
        <YAxis hide="true" type="category" label="Node"/>
        <ReferenceLine x={`${selectedLineNum}`} stroke="green" label="Current" />
        <Tooltip
            wrapperStyle={{ backgroundColor: "red" }}
            labelStyle={{ color: "green" }}
            itemStyle={{ color: "blue" }}
            formatter={function(value, name, props) {
              const { state, pid, bin, fcv, syncSource } = props.payload;
              let propsString = JSON.stringify(props);
              return `[State: ${state}\n
                       PID: ${pid}\n
                       Bin Version: ${bin}\n
                       FCV Version: ${fcv}\n
                       Sync Source: ${syncSource}]`;
            }}
            labelFormatter={function(value) {
              return `log line: ${value}`;
            }}
          />
        <Brush/>
      </LineChart>
       </ResponsiveContainer>
      </div>
      </div>
    );
  }
}

function mapStateToProps(state: ReduxState, ownProps: $Shape<Props>): $Shape<Props> {
  console.log("ReduxState");
  console.log(state);
  const lines = selectors.getFilteredLineData(state);
  console.log(lines);
  return {
    ...ownProps,
    lines: lines,
  };
}

function mapDispatchToProps(dispatch: Dispatch<*>, ownProps) {
   return {
     ...ownProps,
     loadLogByIdentity: (identity: LogIdentity) => dispatch(actions.loadLog(identity))
   };
}

export default connect(mapStateToProps, mapDispatchToProps)(Tracker);
