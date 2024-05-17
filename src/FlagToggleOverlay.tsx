import React, { useEffect, useState } from "react";
import { ConfigValue } from "@prefab-cloud/prefab-cloud-js";

interface Props {
  requestedFlags: () => { key: string; value: ConfigValue }[];
  overrides: Map<string, ConfigValue>;
  addOverride: (key: string, value: ConfigValue) => void;
}

function FlagToggleOverlay({ requestedFlags, overrides, addOverride }: Props) {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "f") {
        setShowOverlay((prev) => !prev);
        console.log("Toggled overlay:", !showOverlay);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!showOverlay) return null;

  return (
    <div className="flag-toggle-overlay fixed top-0 bottom-0 right-0 bg-white p-8 border-l flex flex-col gap-8">
      <h3 className="font-bold">Feature Flags</h3>
      <ul>
        {requestedFlags().map(({ key, value }) => (
          <li key={key} className="flex gap-4 mb-4">
            <strong>{key}</strong>
            <em>{overrides.has(key) ? overrides.get(key)?.toString() : value?.toString()}</em>
            <input
              type="checkbox"
              checked={overrides.has(key) ? (overrides.get(key) as boolean) : (value as boolean)}
              onChange={() => {
                addOverride(key, overrides.has(key) ? !overrides.get(key) : !value);
              }}
              className="form-checkbox h-6 w-6 text-indigo-600 transition duration-150 ease-in-out"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FlagToggleOverlay;
