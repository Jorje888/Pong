import React from "react";
import logo from "./logo.svg";
import "./App.css";
import WelcomeScreen from "./components/WelcomeScreen";

function App() {
  const [currentPage, setCurrentPage] = React.useState<
    "welcome" | "game" | "endgame"
  >("welcome");

  return (
    <div className="App">
      <header className="App-header">
        {currentPage === "welcome" && <WelcomeScreen />}
      </header>
    </div>
  );
}

export default App;
