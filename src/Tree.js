import React, { Component } from "react";
import { render } from "react-dom";
import SortableTree from "react-sortable-tree";

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      treeData: [
        {
          title: "FS",
          expanded: true,
          children: [
            {
              title: "Balance Sheet",
              expanded: true,
              children: [
                { title: "Cash" },
                { title: "AR" },
                { title: "Revenue" }
              ]
            },
            { title: "P&L" },
            { title: "Cash Flows" }
          ]
        }
      ]
    };
  }

  render() {
    return (
      <div style={{ height: 500 }}>
        <SortableTree
          treeData={this.state.treeData}
          onChange={treeData => this.setState({ treeData })}
        />
      </div>
    );
  }
}

render(<App />, document.getElementById("root"));
