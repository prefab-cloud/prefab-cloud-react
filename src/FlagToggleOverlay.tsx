import React, { useEffect, useState } from "react";
import { ConfigValue } from "@prefab-cloud/prefab-cloud-js";
import { act } from "@testing-library/react";

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
    <div
      className="flag-toggle-overlay fixed bg-white border-2 rounded-xl flex flex-col"
      style={{
        bottom: "48px",
        right: "48px",
        borderColor: "#4352D1",
        boxShadow: "0px 0px 35px rgba(67,82,209,0.35)",
      }}
    >
      <div className="p-4 rounded-xl" style={{ backgroundColor: "#4352D1" }}>
        <svg
          className="h-10 w-auto"
          width="703"
          height="191"
          viewBox="0 0 703 191"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_1_79)">
            <path
              d="M0 20.77H60.69C106.69 20.77 113.97 51.81 113.97 72.67C113.97 93.53 103.84 122.33 63.34 122.33H51.94V166.29H0V20.77ZM57.23 86.51C67 86.51 71.88 82.24 71.88 73.69V72.88C71.88 64.53 67.2 60.87 57.43 60.87H51.93V86.52H57.22L57.23 86.51Z"
              fill="white"
            />
            <path
              d="M120.73 20.77H177.63C220.98 20.77 232.13 48.52 232.13 69.82C232.13 91.12 223.79 101.16 210.76 108.29L240.68 166.3H193.31L170.72 120.1H167.67V166.3H120.74V20.77H120.73ZM173.77 86.11C184.35 86.11 189.04 81.84 189.04 73.29V72.48C189.04 64.54 184.36 61.08 174.18 61.08H167.67V86.12H173.78L173.77 86.11Z"
              fill="white"
            />
            <path
              d="M245.48 20.77H340.16V62.09H295.42V74.51H328.56V111.96H295.42V124.99H343.22V166.31H245.49V20.77H245.48Z"
              fill="white"
            />
            <path
              d="M673.41 90.0499C689.49 86.5899 699.46 76.4099 699.46 58.4999V57.6899C699.46 38.1499 687.45 19.4299 649.19 19.4299H555.61C574.51 56.5899 585.07 113.24 592.13 164.96H646.96C686.65 164.96 702.53 149.9 702.53 124.46V123.65C702.53 102.89 689.5 92.3099 673.42 90.0699L673.41 90.0499ZM625.99 54.2299H636.57C645.32 54.2299 648.58 57.6899 648.58 64.1999V65.0099C648.58 71.5199 645.12 74.3699 636.57 74.3699H625.99V54.2199V54.2299ZM649.19 118.14C649.19 125.47 644.92 129.95 635.76 129.95H625.99V105.73H635.15C645.33 105.73 649.19 110 649.19 117.33V118.14Z"
              fill="white"
            />
            <path
              d="M454.05 81.2999H408.95V60.9499H459.52C467.1 34.6799 475.41 19.4299 475.41 19.4299H354.61V164.96H408.95V120.59H445.74C450.02 97.0199 454.05 81.3099 454.05 81.3099V81.2999Z"
              fill="white"
            />
            <path
              d="M515.48 0C473.24 0 453.85 155.27 450.01 188.47C449.82 190.09 451.92 190.86 452.84 189.52C461.3 177.22 484.27 143.7 515.48 143.7C546.69 143.7 569.66 177.21 578.12 189.52C579.04 190.86 581.14 190.08 580.95 188.47C577.11 155.27 557.72 0 515.48 0ZM531.59 81.56H499.38V70.87C499.38 66.98 502.54 63.82 506.43 63.82H524.55C528.44 63.82 531.6 66.98 531.6 70.87V81.56H531.59Z"
              fill="white"
            />
          </g>
          <defs>
            <clipPath id="clip0_1_79">
              <rect width="702.51" height="190.21" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>
      <div className="p-8 flex flex-col font-sm">
        <div className="font-bold text-lg">Feature Flags</div>
        <ul>
          {requestedFlags().map(({ key, value }) => {
            const actualValue = overrides.has(key) ? overrides.get(key) : value;

            return (
              <li key={key} className="flex gap-4 mt-4">
                {typeof actualValue === "boolean" ? (
                  <label className="inline-flex items-center cursor-pointer gap-2">
                    <input
                      type="checkbox"
                      value=""
                      className="sr-only peer"
                      checked={
                        overrides.has(key) ? (overrides.get(key) as boolean) : (value as boolean)
                      }
                      onChange={() => {
                        addOverride(key, overrides.has(key) ? !overrides.get(key) : !value);
                      }}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                      {key}
                    </span>
                  </label>
                ) : (
                  <>
                    <strong>{key}</strong>
                    <em>{actualValue?.toString()}</em>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default FlagToggleOverlay;
