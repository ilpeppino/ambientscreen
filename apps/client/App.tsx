import React, { useState } from "react";
import { AdminHomeScreen } from "./src/features/admin/screens/AdminHomeScreen";
import { DisplayScreen } from "./src/features/display/screens/DisplayScreen";
import {
  enterDisplayMode,
  exitDisplayMode,
  getInitialAppMode,
  type AppMode,
} from "./src/features/navigation/appMode.logic";

export default function App() {
  const [mode, setMode] = useState<AppMode>(getInitialAppMode);

  if (mode === "admin") {
    return <AdminHomeScreen onEnterDisplayMode={() => setMode(enterDisplayMode())} />;
  }

  return <DisplayScreen onExitDisplayMode={() => setMode(exitDisplayMode())} />;
}
