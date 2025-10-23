"use client";

import React from "react";
import { Flex, Spin } from "antd";

export default function App() {
    return (
        <Flex
            align="center"
            justify="center"
            style={{
                height: "100vh",
                flexDirection: "column",
                gap: 24,
                backgroundColor: "#fff", // match your site background
            }}
        >
            {/* Extra-large spinner */}
            <div style={{ transform: "scale(2)" }}>
                <Spin size="large" />
            </div>

            {/* Optional text below */}
            <p style={{ marginTop: 16, color: "#666", fontWeight: 500 }}>
                Loading...
            </p>
        </Flex>
    );
}
