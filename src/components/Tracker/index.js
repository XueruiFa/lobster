// @flow strict

import React from 'react';
import { connect } from 'react-redux';
import * as actions from '../../actions';
import * as selectors from '../../selectors';

import type { Dispatch } from 'redux';
import type { ReduxState, LogIdentity, Line } from '../../models';
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
  eventMap: Map<Number, String> = new Map();

  constructor(props) {
    super(props);
    this.state = {
      currLineNum: 0
    };
    // this.props.loadLogByIdentity(logIdentity);
    this.parseEvents();
    console.log(this.eventMap);
  }

  parseEvents = () => {
    const { data } = this.props.location;
    return data.forEach(line => {
      const event = this.parseEventFromLine(line);
      if (event) {
        this.eventMap.set(line.lineNumber, event);
      }
    });
  };

  parseEventFromLine = (line: Line) => {
    const blocks = line.text.split(" ");
    return "yes";
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
    const { data } = this.props.location;
    console.log(data);

    return (
      <div>
        <div>Main page</div>
      </div>
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
