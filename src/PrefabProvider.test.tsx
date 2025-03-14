/* eslint-disable max-classes-per-file */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { act } from "react-dom/test-utils";
import { ContextValue, Prefab } from "@prefab-cloud/prefab-cloud-js";
import {
  ContextAttributes,
  PrefabProvider,
  usePrefab,
  usePrefabTypesafe,
  createPrefabHook,
} from "./PrefabProvider";
import { PrefabTestProvider } from "./PrefabTestProvider";

// Simple TypesafeClass for testing
class AppConfig {
  private prefab: Prefab;

  constructor(prefab: Prefab) {
    this.prefab = prefab;
  }

  isFeatureEnabled(): boolean {
    return this.prefab.isEnabled("feature");
  }

  getAppName(): string {
    const name = this.prefab.get("app.name");
    return typeof name === "string" ? name : "Default App";
  }

  getApiUrl(): string {
    const url = this.prefab.get("api.url");
    return typeof url === "string" ? url : "https://api.default.com";
  }

  getThemeColor(): string {
    const color = this.prefab.get("theme.color");
    return typeof color === "string" ? color : "#000000";
  }

  calculateTimeout(multiplier: number): number {
    const baseValue = this.prefab.get("timeout.base");
    const base = typeof baseValue === "number" ? baseValue : 1000;
    return base * multiplier;
  }
}

// Create a typed hook for our test class
const useAppConfig = createPrefabHook(AppConfig);

type Config = { [key: string]: any };

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

// Component using the TypesafeClass
function TypesafeComponent() {
  const { isFeatureEnabled, getAppName, getThemeColor, loading } = usePrefabTypesafe<AppConfig>();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 data-testid="app-name">{getAppName()}</h1>
      <div data-testid="theme-color" style={{ color: getThemeColor() }}>
        Themed content
      </div>
      <div data-testid="raw-theme-color">{getThemeColor()}</div>
      {isFeatureEnabled() && <div data-testid="feature-flag">Feature Enabled</div>}
    </div>
  );
}

// Component using the custom typed hook
function HookComponent() {
  const { getAppName, getApiUrl, calculateTimeout, loading } = useAppConfig();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 data-testid="app-name-hook">{getAppName()}</h1>
      <div data-testid="api-url">{getApiUrl()}</div>
      <div data-testid="timeout">{calculateTimeout(2)}</div>
    </div>
  );
}

let warn: ReturnType<typeof jest.spyOn>;
let error: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  error = jest.spyOn(console, "error").mockImplementation(() => {});
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockReset();
  error.mockReset();
});

describe("PrefabProvider", () => {
  const defaultContextAttributes = { user: { email: "test@example.com" } };

  const renderInProvider = ({
    contextAttributes,
    onError,
  }: {
    contextAttributes?: { [key: string]: Record<string, ContextValue> };
    onError?: (err: Error) => void;
  }) =>
    render(
      <PrefabProvider apiKey="api-key" contextAttributes={contextAttributes} onError={onError}>
        <MyComponent />
      </PrefabProvider>
    );

  const stubConfig = (config: Config) =>
    new Promise((resolve) => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => {
            setTimeout(resolve);
            return { evaluations: config };
          },
        })
      ) as jest.Mock;
    });

  const renderWithConfig = async (
    config: Config,
    providerConfig: Parameters<typeof renderInProvider>[0] = {
      contextAttributes: defaultContextAttributes,
      onError: (e) => {
        throw e;
      },
    }
  ) => {
    const promise = stubConfig(config);

    const rendered = renderInProvider(providerConfig);

    await act(async () => {
      await promise;
    });

    // wait for the loading content to go away
    screen.findByRole("alert");

    return rendered;
  };

  it("renders without config", async () => {
    await renderWithConfig({});

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("Default");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("allows providing flag values", async () => {
    await renderWithConfig({ greeting: { value: { string: "CUSTOM" } } });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("allows providing true flag booleans", async () => {
    await renderWithConfig({
      greeting: { value: { string: "CUSTOM" } },
      secretFeature: { value: { boolean: true } },
    });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).toBeInTheDocument();
  });

  it("allows providing false flag booleans", async () => {
    await renderWithConfig({
      greeting: { value: { string: "CUSTOM" } },
      secretFeature: { value: { boolean: false } },
    });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("allows providing json configs", async () => {
    await renderWithConfig({
      subtitle: { value: { json: '{ "actualSubtitle": "Json Subtitle" }' } },
    });

    const alert = screen.queryByRole("banner");
    expect(alert).toHaveTextContent("Json Subtitle");
  });

  it("warns when you do not provide contextAttributes", async () => {
    const rendered = await renderWithConfig(
      {
        greeting: { value: { string: "CUSTOM" } },
        secretFeature: { value: { boolean: true } },
      },
      { contextAttributes: { user: { email: "old@example.com" } } }
    );

    let alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");

    const newConfigPromise = stubConfig({
      greeting: { value: { string: "ANOTHER" } },
      secretFeature: { value: { boolean: false } },
    });

    act(() => {
      rendered.rerender(
        <PrefabProvider
          apiKey="api-key"
          contextAttributes={{ user: { email: "test@example.com" } }}
          onError={() => {}}
        >
          <MyComponent />
        </PrefabProvider>
      );
    });

    await newConfigPromise;

    // wait for re-render
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((r) => setTimeout(r, 1));

    alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("ANOTHER");
  });

  it("re-fetches when you update the contextAttributes prop on the provider", async () => {
    let setContextAttributes: (attributes: ContextAttributes) => void = () => {
      // eslint-disable-next-line no-console
      console.warn("setContextAttributes not set");
    };

    const promise = stubConfig({ greeting: { value: { string: "CUSTOM" } } });

    function Wrapper({ context }: { context: ContextAttributes }) {
      const [contextAttributes, innerSetContextAttributes] = React.useState(context);

      setContextAttributes = innerSetContextAttributes;

      return (
        <PrefabProvider apiKey="api-key" contextAttributes={contextAttributes} onError={() => {}}>
          <MyComponent />
        </PrefabProvider>
      );
    }

    render(<Wrapper context={{ user: { email: "test@example.com" } }} />);

    await act(async () => {
      await promise;
    });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");

    const newRequestPromise = stubConfig({
      greeting: { value: { string: "UPDATED FROM CONTEXT" } },
    });

    setContextAttributes({ user: { email: "foo@example.com" } });

    await newRequestPromise;
    // wait for render
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((r) => setTimeout(r, 1));

    const updatedAlert = screen.queryByRole("alert");
    expect(updatedAlert).toHaveTextContent("UPDATED FROM CONTEXT");
  });

  it("allows providing an afterEvaluationCallback", async () => {
    const context = { user: { email: "test@example.com" } };

    const callback = jest.fn();

    const promise = stubConfig({ greeting: { value: { string: "afterEvaluationCallback" } } });

    render(
      <PrefabProvider
        apiKey="api-key"
        contextAttributes={context}
        afterEvaluationCallback={callback}
        onError={() => {}}
      >
        <MyComponent />
      </PrefabProvider>
    );

    await act(async () => {
      await promise;
    });

    // wait for async callback to be called
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((r) => setTimeout(r, 1));

    expect(callback).toHaveBeenCalledWith("greeting", "afterEvaluationCallback", {
      contexts: context,
    });
  });

  it("triggers onError if something goes wrong", async () => {
    const context = { user: { name: "🥰", phone: "(555) 555–5555" } };
    const onError = jest.fn();

    await renderWithConfig({}, { contextAttributes: context, onError });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        // NOTE: While context-encoding bug is fixed in the in-browser version
        // of prefab-cloud-js since
        // https://github.com/prefab-cloud/prefab-cloud-js/pull/65 the Node
        // version (which is only intended to be run in unit-tests) still
        // exhibits the bug. It is convenient for us to test this onError.
        name: "InvalidCharacterError",
        message: "The string to be encoded contains invalid characters.",
      })
    );

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("Default");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });
});

describe("PrefabProvider with TypesafeClass", () => {
  const defaultContextAttributes = { user: { email: "test@example.com" } };

  // Mock prefab client responses for typesafe tests
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => ({
          evaluations: {
            "app.name": { value: { string: "Test App" } },
            "api.url": { value: { string: "https://api.test.com" } },
            "theme.color": { value: { string: "#FF5500" } },
            feature: { value: { boolean: true } },
            "timeout.base": { value: { int: 2000 } },
          },
        }),
      })
    ) as jest.Mock;
  });

  it("makes TypesafeClass methods available through usePrefabTypesafe", async () => {
    render(
      <PrefabProvider
        apiKey="test-api-key"
        contextAttributes={defaultContextAttributes}
        PrefabTypesafeClass={AppConfig}
      >
        <TypesafeComponent />
      </PrefabProvider>
    );

    // Wait for loading to finish
    await act(async () => {
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(screen.getByTestId("app-name")).toHaveTextContent("Test App");
    expect(screen.getByTestId("raw-theme-color")).toHaveTextContent("#FF5500");
    expect(screen.getByTestId("feature-flag")).toBeInTheDocument();
  });

  it("provides typesafe methods through the custom hook", async () => {
    render(
      <PrefabProvider
        apiKey="test-api-key"
        contextAttributes={defaultContextAttributes}
        PrefabTypesafeClass={AppConfig}
      >
        <HookComponent />
      </PrefabProvider>
    );

    // Wait for loading to finish
    await act(async () => {
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(screen.getByTestId("app-name-hook")).toHaveTextContent("Test App");
    expect(screen.getByTestId("api-url")).toHaveTextContent("https://api.test.com");
    expect(screen.getByTestId("timeout")).toHaveTextContent("4000"); // 2000 * 2
  });

  it("uses default values when configs are not available", async () => {
    // Override the mock to return empty configs
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => ({ evaluations: {} }),
      })
    ) as jest.Mock;

    render(
      <PrefabProvider
        apiKey="test-api-key"
        contextAttributes={defaultContextAttributes}
        PrefabTypesafeClass={AppConfig}
      >
        <TypesafeComponent />
        <HookComponent />
      </PrefabProvider>
    );

    // Wait for loading to finish
    await act(async () => {
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(screen.getByTestId("app-name")).toHaveTextContent("Default App");
    expect(screen.getByTestId("timeout")).toHaveTextContent("2000"); // 1000 * 2 (default)
    expect(screen.queryByTestId("feature-flag")).not.toBeInTheDocument();
  });
});

describe("PrefabProvider TypesafeClass with PrefabTestProvider", () => {
  it("makes TypesafeClass methods available in test environment", async () => {
    render(
      <PrefabTestProvider
        config={{
          "app.name": "Test App From TestProvider",
          "api.url": "https://test-provider.example.com",
          "theme.color": "#00FF00",
          feature: true,
          "timeout.base": 3000,
        }}
        PrefabTypesafeClass={AppConfig}
      >
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

  it("uses default values when configs are not provided in test provider", async () => {
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

describe("TypesafeClass instance memoization", () => {
  it("memoizes the TypesafeClass instance across renders", async () => {
    // Create a mocked version of our TypesafeClass with constructor and method spies
    const constructorSpy = jest.fn();
    const methodSpy = jest.fn();

    class TrackedAppConfig {
      constructor(prefab: Prefab) {
        constructorSpy(prefab);
        this.prefab = prefab;
      }

      private prefab: Prefab;

      getAppName(): string {
        methodSpy();
        const name = this.prefab.get("app.name");
        return typeof name === "string" ? name : "Default App";
      }
    }

    // Component that forces re-renders and tracks calls
    function ReRenderingComponent() {
      const [counter, setCounter] = React.useState(0);
      const { getAppName } = usePrefabTypesafe<TrackedAppConfig>();

      // Force a re-render after mounting
      React.useEffect(() => {
        if (counter < 3) {
          setTimeout(() => setCounter(counter + 1), 10);
        }
      }, [counter]);

      // Call the method on each render
      const result = getAppName();

      return (
        <div data-testid="counter">
          {result} (Render count: {counter})
        </div>
      );
    }

    render(
      <PrefabTestProvider
        config={{
          "app.name": "Memoization Test",
        }}
        PrefabTypesafeClass={TrackedAppConfig}
      >
        <ReRenderingComponent />
      </PrefabTestProvider>
    );

    // Wait for all re-renders to complete
    await waitFor(() => {
      expect(screen.getByTestId("counter")).toHaveTextContent("(Render count: 3)");
    });

    // Constructor should only be called once, but the method should be called on each render
    expect(constructorSpy).toHaveBeenCalledTimes(1);
    expect(methodSpy).toHaveBeenCalledTimes(4); // Initial render + 3 updates
  });
});
