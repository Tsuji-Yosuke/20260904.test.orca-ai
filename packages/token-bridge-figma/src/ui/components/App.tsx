import { state, setScreen } from "../state.js";
import { ConfigScreen } from "./ConfigScreen.js";
import { MainScreen } from "./MainScreen.js";

export function App() {
  const { screen } = state.value;

  if (screen === "config") {
    return <ConfigScreen onBack={() => setScreen("main")} />;
  }

  return <MainScreen onOpenConfig={() => setScreen("config")} />;
}
