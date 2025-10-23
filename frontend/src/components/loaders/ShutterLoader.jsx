import React from "react";
import { Flex, Spin } from "antd";

const App = () => (
  <Flex
    align="center"
    justify="center"
    style={{ height: "100vh", flexDirection: "column", gap: 24 }}
  >
    {/* Custom extra-large spinner */}
    <div style={{ transform: "scale(2)", marginTop: 20 }}>
      <Spin size="large" />
    </div>
  </Flex>
);

export default App;
