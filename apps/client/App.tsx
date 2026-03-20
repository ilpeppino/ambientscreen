import React, { useState } from "react";
import { AdminHomeScreen } from "./src/features/admin/screens/AdminHomeScreen";
import { DisplayScreen } from "./src/features/display/screens/DisplayScreen";

export default function App() {
  const [mode, setMode] = useState<"admin" | "display">("admin");

  if (mode === "admin") {
    return <AdminHomeScreen onEnterDisplayMode={() => setMode("display")} />;
  }

  return <DisplayScreen />;
}
