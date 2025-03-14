/* eslint-disable max-classes-per-file */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Prefab } from "@prefab-cloud/prefab-cloud-js";
import { PrefabTestProvider, usePrefab, createPrefabHook } from "../index";
import { AppConfig, TypesafeComponent, HookComponent, typesafeTestConfig } from "./test-helpers";

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

describe("PrefabTestProvider with TypesafeClass", () => {
  it("makes TypesafeClass methods available in test environment", () => {
    render(
      <PrefabTestProvider config={typesafeTestConfig} PrefabTypesafeClass={AppConfig}>
        <TypesafeComponent />
        <HookComponent />
      </PrefabTestProvider>
    );

    // No need to wait for loading since PrefabTestProvider is synchronous
    expect(screen.getByTestId("app-name")).toHaveTextContent("Test App From TestProvider");
    expect(screen.getByTestId("api-url")).toHaveTextContent("https://test-provider.example.com");
    expect(screen.getByTestId("raw-theme-color")).toHaveTextContent("#00FF00");
    expect(screen.getByTestId("feature-flag")).toBeInTheDocument();
    expect(screen.getByTestId("timeout")).toHaveTextContent("6000"); // 3000 * 2
  });

  it("uses default values when configs are not provided in test provider", () => {
    render(
      <PrefabTestProvider
        config={{
          // Only provide some configs
          "app.name": "Only App Name Set",
        }}
        PrefabTypesafeClass={AppConfig}
      >
        <TypesafeComponent />
        <HookComponent />
      </PrefabTestProvider>
    );

    expect(screen.getByTestId("app-name")).toHaveTextContent("Only App Name Set");
    expect(screen.getByTestId("api-url")).toHaveTextContent("https://api.default.com");
    expect(screen.getByTestId("raw-theme-color")).toHaveTextContent("#000000");
    expect(screen.queryByTestId("feature-flag")).not.toBeInTheDocument();
    expect(screen.getByTestId("timeout")).toHaveTextContent("2000"); // 1000 (default) * 2
  });
});

// Adding explicit tests for createPrefabHook functionality
describe("createPrefabHook functionality with PrefabTestProvider", () => {
  // Custom TypesafeClass for testing
  class CustomFeatureFlags {
    private prefab: Prefab;

    constructor(prefab: Prefab) {
      this.prefab = prefab;
    }

    isCustomFeatureEnabled(): boolean {
      return this.prefab.isEnabled("custom.feature");
    }

    getCustomMessage(): string {
      const message = this.prefab.get("custom.message");
      return typeof message === "string" ? message : "Default Message";
    }

    calculateCustomValue(multiplier: number): number {
      const baseValue = this.prefab.get("custom.base.value");
      const base = typeof baseValue === "number" ? baseValue : 5;
      return base * multiplier;
    }
  }

  // Create a typed hook using our TypesafeClass
  const useCustomFeatureFlags = createPrefabHook(CustomFeatureFlags);

  // Component that uses the custom typed hook
  function CustomHookComponent() {
    const { isCustomFeatureEnabled, getCustomMessage, calculateCustomValue } =
      useCustomFeatureFlags();

    return (
      <div>
        <h1 data-testid="custom-message">{getCustomMessage()}</h1>
        {isCustomFeatureEnabled() && <div data-testid="custom-feature">Custom Feature Enabled</div>}
        <div data-testid="custom-calculated-value">{calculateCustomValue(3)}</div>
      </div>
    );
  }

  it("creates a working custom hook with createPrefabHook", () => {
    render(
      <PrefabTestProvider
        config={{
          "custom.message": "Hello from Test Custom Hook",
          "custom.feature": true,
          "custom.base.value": 10,
        }}
        PrefabTypesafeClass={CustomFeatureFlags}
      >
        <CustomHookComponent />
      </PrefabTestProvider>
    );

    expect(screen.getByTestId("custom-message")).toHaveTextContent("Hello from Test Custom Hook");
    expect(screen.getByTestId("custom-feature")).toBeInTheDocument();
    expect(screen.getByTestId("custom-calculated-value")).toHaveTextContent("30"); // 10 * 3
  });

  it("provides default values when configs are not provided", () => {
    render(
      <PrefabTestProvider
        config={{
          // Only specify some values
          "custom.message": "Only Message Set",
        }}
        PrefabTypesafeClass={CustomFeatureFlags}
      >
        <CustomHookComponent />
      </PrefabTestProvider>
    );

    expect(screen.getByTestId("custom-message")).toHaveTextContent("Only Message Set");
    expect(screen.queryByTestId("custom-feature")).not.toBeInTheDocument();
    expect(screen.getByTestId("custom-calculated-value")).toHaveTextContent("15"); // 5 (default) * 3
  });

  it("memoizes TypesafeClass instance when used with custom hook", async () => {
    // Create a class with spies
    const constructorSpy = jest.fn();
    const methodSpy = jest.fn().mockReturnValue("memoized result");

    class SpiedClass {
      private prefab: Prefab;

      constructor(prefab: Prefab) {
        constructorSpy(prefab);
        this.prefab = prefab;
      }

      // eslint-disable-next-line class-methods-use-this
      testMethod(): string {
        return methodSpy();
      }
    }

    const useSpiedHook = createPrefabHook(SpiedClass);

    // Component that forces re-renders
    function ReRenderingComponent() {
      const [counter, setCounter] = React.useState(0);
      const { testMethod } = useSpiedHook();

      // Call the method on each render
      const result = testMethod();

      React.useEffect(() => {
        // Force multiple re-renders
        if (counter < 3) {
          setTimeout(() => setCounter(counter + 1), 10);
        }
      }, [counter]);

      return (
        <div data-testid="test-result">
          {result} (Count: {counter})
        </div>
      );
    }

    render(
      <PrefabTestProvider config={{}} PrefabTypesafeClass={SpiedClass}>
        <ReRenderingComponent />
      </PrefabTestProvider>
    );

    // Wait for all re-renders to complete
    await waitFor(() => {
      expect(screen.getByTestId("test-result")).toHaveTextContent("(Count: 3)");
    });

    // Constructor should be called only once, method called for each render
    expect(constructorSpy).toHaveBeenCalledTimes(1);
    expect(methodSpy).toHaveBeenCalledTimes(4); // Initial render + 3 updates
  });
});
