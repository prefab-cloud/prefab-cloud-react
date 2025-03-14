import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { usePrefab } from "./PrefabProvider";
import { PrefabTestProvider } from "./PrefabTestProvider";

function MyComponent() {
  const { get, isEnabled, loading, keys } = usePrefab();
  const greeting = get("greeting") || "Default";
  const subtitle = get("subtitle")?.actualSubtitle || "Default Subtitle";

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 role="alert">{greeting}</h1>
      <h2 role="banner">{subtitle}</h2>
      {isEnabled("secretFeature") && (
        <button type="submit" title="secret-feature">
          Secret feature
        </button>
      )}

      <pre data-testid="known-keys">{JSON.stringify(keys)}</pre>
    </div>
  );
}

describe("PrefabTestProvider", () => {
  const renderInTestProvider = (config: Record<string, any>) => {
    render(
      <PrefabTestProvider config={config}>
        <MyComponent />
      </PrefabTestProvider>
    );
  };

  it("renders without config", () => {
    renderInTestProvider({});

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("Default");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("allows providing flag values", async () => {
    renderInTestProvider({ greeting: "CUSTOM" });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("allows providing true flag booleans", async () => {
    renderInTestProvider({ greeting: "CUSTOM", secretFeature: true });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).toBeInTheDocument();
  });

  it("allows providing false flag booleans", async () => {
    renderInTestProvider({ greeting: "CUSTOM", secretFeature: false });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("allows access to the known keys", () => {
    renderInTestProvider({ magic: "true", keanu: "whoa" });

    const keys = screen.getByTestId("known-keys");
    expect(keys).toHaveTextContent('["magic","keanu"]');
  });
});
