import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(undefined);

export const ThemeProvider = ({ children }) => {
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem("soundEnabled");
    return saved ? saved === "true" : true;
  });

  useEffect(() => {
    // XO Arena is dark mode only
    document.documentElement.classList.add("dark");
    document.documentElement.style.backgroundColor = "#0F1117";
    document.documentElement.style.color = "#9ca3af";
  }, []);

  const setSoundEnabled = (enabled) => {
    setSoundEnabledState(enabled);
    localStorage.setItem("soundEnabled", String(enabled));
  };

  return (
    <ThemeContext.Provider
      value={{ theme: "dark", soundEnabled, setSoundEnabled }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
