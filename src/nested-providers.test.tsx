import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { render, screen } from "@testing-library/react";
import { Context as PrefabContext } from "@prefab-cloud/prefab-cloud-js";
import fetchMock, { enableFetchMocks } from "jest-fetch-mock";
import {
  prefab as globalPrefab,
  PrefabProvider,
  usePrefab,
  ContextAttributes,
  SharedSettings,
} from "./index";

enableFetchMocks();

// eslint-disable-next-line no-console
const onError = console.error;
const apiKey = "nested-providers-test-api-key";

function InnerUserComponent() {
  const { isEnabled, loading, prefab, settings } = usePrefab();

  if (loading) {
    return <div>Loading inner component...</div>;
  }

  return (
    <div
      data-testid="inner-wrapper"
      data-prefab-instance-hash={prefab.instanceHash}
      data-prefab-settings={JSON.stringify(settings)}
    >
      <h1 data-testid="inner-greeting">{prefab.get("greeting")?.toString() ?? "Default"}</h1>
      {isEnabled("secretFeature") && (
        <button data-testid="inner-secret-feature" type="submit" title="secret-feature">
          Secret feature
        </button>
      )}
    </div>
  );
}

function OuterUserComponent({
  admin,
  innerProviderSettings,
  innerUserContext,
}: {
  admin: { name: string };
  innerUserContext: ContextAttributes;
  innerProviderSettings: SharedSettings;
}) {
  const { get, isEnabled, loading, prefab, settings: parentProviderSettings } = usePrefab();

  let innerSettings = innerProviderSettings;
  if (Object.keys(innerProviderSettings).length === 0) {
    // inherit the parent settings if none are provided
    innerSettings = parentProviderSettings;
  }

  if (loading) {
    return <div>Loading outer component...</div>;
  }

  return (
    <div
      data-testid="outer-wrapper"
      data-prefab-instance-hash={prefab.instanceHash}
      data-prefab-settings={JSON.stringify(parentProviderSettings)}
    >
      <h1 data-testid="outer-greeting">{get("greeting") ?? "Default"}</h1>
      {isEnabled("secretFeature") && (
        <button data-testid="outer-secret-feature" type="submit" title="secret-feature">
          Secret feature
        </button>
      )}

      <div>
        <h1>You are looking at {admin.name}</h1>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <PrefabProvider {...innerSettings} contextAttributes={innerUserContext}>
          <InnerUserComponent />
        </PrefabProvider>
      </div>
    </div>
  );
}
function App({
  outerUserContext,
  innerUserContext,
  innerProviderSettings,
}: {
  outerUserContext: ContextAttributes;
  innerUserContext: ContextAttributes;
  innerProviderSettings?: SharedSettings;
}) {
  return (
    <PrefabProvider
      apiKey={apiKey}
      contextAttributes={outerUserContext}
      onError={onError}
      // eslint-disable-next-line react/jsx-boolean-value
      collectEvaluationSummaries={false}
    >
      <OuterUserComponent
        admin={{ name: "John Doe" }}
        innerUserContext={innerUserContext}
        innerProviderSettings={innerProviderSettings || {}}
      />
    </PrefabProvider>
  );
}

it("allows nested `PrefabProvider`s that reuse the parent provider's settings", async () => {
  const outerUserContext = {
    user: { email: "dr.smith@example.com", doctor: true },
    outerOnly: { city: "NYC" },
  };
  const innerUserContext = { user: { email: "patient@example.com", doctor: false } };

  const outerUserFetchData = {
    evaluations: {
      greeting: { value: { string: "Greetings, Doctor" } },
      secretFeature: { value: { bool: true } },
    },
  };
  const innerUserFetchData = {
    evaluations: {
      greeting: { value: { string: "Hi" } },
      secretFeature: { value: { bool: false } },
    },
  };

  fetchMock.mockResponse((req) => {
    if (req.url.includes(new PrefabContext(outerUserContext).encode())) {
      return Promise.resolve({
        body: JSON.stringify(outerUserFetchData),
        status: 200,
      });
    }

    return Promise.resolve({
      body: JSON.stringify(innerUserFetchData),
      status: 200,
    });
  });

  render(<App outerUserContext={outerUserContext} innerUserContext={innerUserContext} />);

  const outerGreeting = await screen.findByTestId("outer-greeting");
  const innerGreeting = await screen.findByTestId("inner-greeting");

  expect(outerGreeting).toHaveTextContent("Greetings, Doctor");
  expect(innerGreeting).toHaveTextContent("Hi");

  expect(screen.queryByTestId("outer-secret-feature")).toBeInTheDocument();
  expect(screen.queryByTestId("inner-secret-feature")).not.toBeInTheDocument();

  // Verify that each provider has its own copy of Prefab
  const outerPrefabWrapper = screen.getByTestId("outer-wrapper");
  const innerPrefabWrapper = screen.getByTestId("inner-wrapper");

  const outerPrefabInstanceHash = outerPrefabWrapper.getAttribute("data-prefab-instance-hash");
  const innerPrefabInstanceHash = innerPrefabWrapper.getAttribute("data-prefab-instance-hash");

  expect(outerPrefabInstanceHash).toHaveLength(36);
  expect(innerPrefabInstanceHash).toHaveLength(36);
  expect(outerPrefabInstanceHash).not.toEqual(innerPrefabInstanceHash);
  expect(outerPrefabInstanceHash).toEqual(globalPrefab.instanceHash);

  expect(outerPrefabWrapper.getAttribute("data-prefab-settings")).toStrictEqual(
    JSON.stringify({
      apiKey,
      collectEvaluationSummaries: false,
      onError,
    })
  );

  // These are all inherited
  expect(innerPrefabWrapper.getAttribute("data-prefab-settings")).toStrictEqual(
    JSON.stringify({
      apiKey,
      collectEvaluationSummaries: false,
      onError,
    })
  );
});

it("allows nested `PrefabProvider`s that use new settings", async () => {
  const outerUserContext = {
    user: { email: "dr.smith@example.com", doctor: true },
    outerOnly: { city: "NYC" },
  };
  const innerUserContext = { user: { email: "patient@example.com", doctor: false } };

  const outerUserFetchData = {
    evaluations: {
      greeting: { value: { string: "Greetings, Doctor" } },
      secretFeature: { value: { bool: true } },
    },
  };
  const innerUserFetchData = {
    evaluations: {
      greeting: { value: { string: "Hi" } },
      secretFeature: { value: { bool: false } },
    },
  };

  fetchMock.mockResponse((req) => {
    if (req.url.includes(new PrefabContext(outerUserContext).encode())) {
      return Promise.resolve({
        body: JSON.stringify(outerUserFetchData),
        status: 200,
      });
    }

    return Promise.resolve({
      body: JSON.stringify(innerUserFetchData),
      status: 200,
    });
  });

  const innerProviderSettings = {
    apiKey: "inner-api-key",
    collectLoggerNames: true,
  };

  render(
    <App
      outerUserContext={outerUserContext}
      innerUserContext={innerUserContext}
      innerProviderSettings={innerProviderSettings}
    />
  );

  const outerGreeting = await screen.findByTestId("outer-greeting");
  const innerGreeting = await screen.findByTestId("inner-greeting");

  expect(outerGreeting).toHaveTextContent("Greetings, Doctor");
  expect(innerGreeting).toHaveTextContent("Hi");

  expect(screen.queryByTestId("outer-secret-feature")).toBeInTheDocument();
  expect(screen.queryByTestId("inner-secret-feature")).not.toBeInTheDocument();

  // Verify that each provider has its own copy of Prefab
  const outerPrefabWrapper = screen.getByTestId("outer-wrapper");
  const innerPrefabWrapper = screen.getByTestId("inner-wrapper");

  expect(outerPrefabWrapper.getAttribute("data-prefab-settings")).toStrictEqual(
    JSON.stringify({
      apiKey,
      collectEvaluationSummaries: false,
      onError,
    })
  );

  // These are NOT inherited so we get what we set on the inner provider
  expect(innerPrefabWrapper.getAttribute("data-prefab-settings")).toStrictEqual(
    JSON.stringify({
      apiKey: "inner-api-key",
      collectLoggerNames: true,
    })
  );
});
