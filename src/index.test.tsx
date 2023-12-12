import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { act } from "react-dom/test-utils";
import { ConfigValue } from "@prefab-cloud/prefab-cloud-js";
import { PrefabProvider, PrefabTestProvider, usePrefab } from "./index";

type Config = { [key: string]: any };

function MyComponent() {
  const { get, isEnabled, loading } = usePrefab();
  const greeting = get("greeting") || "Default";

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 role="alert">{greeting}</h1>
      {isEnabled("secretFeature") && (
        <button type="submit" title="secret-feature">
          Secret feature
        </button>
      )}
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

describe("Provider", () => {
  const defaultContextAttributes = { user: { email: "test@example.com" } };

  const renderInProvider = ({
    contextAttributes,
  }: {
    contextAttributes?: { [key: string]: Record<string, ConfigValue> };
  }) => {
    render(
      <PrefabProvider apiKey="api-key" contextAttributes={contextAttributes} onError={() => {}}>
        <MyComponent />
      </PrefabProvider>
    );
  };

  const stubConfig = (config: Config) =>
    new Promise((resolve) => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => {
            setTimeout(resolve);
            return { values: config };
          },
        })
      ) as jest.Mock;
    });

  const renderWithConfig = async (
    config: Config,
    providerConfig: Parameters<typeof renderInProvider>[0] = {
      contextAttributes: defaultContextAttributes,
    }
  ) => {
    const promise = stubConfig(config);

    renderInProvider(providerConfig);

    await act(async () => {
      await promise;
    });

    // wait for the loading content to go away
    screen.findByRole("alert");
  };

  it("renders without config", async () => {
    await renderWithConfig({});

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("Default");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("allows providing flag values", async () => {
    await renderWithConfig({ greeting: { string: "CUSTOM" } });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("allows providing true flag booleans", async () => {
    await renderWithConfig({
      greeting: { string: "CUSTOM" },
      secretFeature: { boolean: true },
    });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).toBeInTheDocument();
  });

  it("allows providing false flag booleans", async () => {
    await renderWithConfig({
      greeting: { string: "CUSTOM" },
      secretFeature: { boolean: false },
    });

    const alert = screen.queryByRole("alert");
    expect(alert).toHaveTextContent("CUSTOM");
    const secretFeature = screen.queryByTitle("secret-feature");
    expect(secretFeature).not.toBeInTheDocument();
  });

  it("warns when you do not provide contextAttributes", async () => {
    await renderWithConfig({}, {});

    expect(warn).toHaveBeenCalledWith(
      "PrefabProvider: You haven't passed any contextAttributes. See https://docs.prefab.cloud/docs/sdks/react#using-context"
    );
  });

  it("allows providing an afterEvaluationCallback", async () => {
    const context = { user: { email: "test@example.com" } };

    const callback = jest.fn();

    const promise = stubConfig({ greeting: { string: "afterEvaluationCallback" } });

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
});

describe("TestProvider", () => {
  const renderInTestProvider = (config: Config) => {
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
});
