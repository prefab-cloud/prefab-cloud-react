import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { render, screen } from "@testing-library/react";
import { Context as PrefabContext } from "@prefab-cloud/prefab-cloud-js";
import fetchMock, { enableFetchMocks } from "jest-fetch-mock";
import { prefab as globalPrefab, PrefabProvider, usePrefab, ContextAttributes } from "./index";

enableFetchMocks();

// eslint-disable-next-line no-console
const onError = console.error;
const apiKey = "api-key";

function InnerUserComponent() {
  const { isEnabled, loading, prefab } = usePrefab();

  if (loading) {
    return <div>Loading inner component...</div>;
  }

  return (
    <div data-testid="inner-wrapper" data-prefab-instance-hash={prefab.instanceHash}>
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
  innerUserContext,
}: {
  admin: { name: string };
  innerUserContext: ContextAttributes;
}) {
  const { get, isEnabled, loading, prefab } = usePrefab();

  if (loading) {
    return <div>Loading outer component...</div>;
  }

  return (
    <div data-testid="outer-wrapper" data-prefab-instance-hash={prefab.instanceHash}>
      <h1 data-testid="outer-greeting">{get("greeting") ?? "Default"}</h1>
      {isEnabled("secretFeature") && (
        <button data-testid="outer-secret-feature" type="submit" title="secret-feature">
          Secret feature
        </button>
      )}

      <div>
        <h1>You are looking at {admin.name}</h1>
        <PrefabProvider apiKey={apiKey} contextAttributes={innerUserContext} onError={onError}>
          <InnerUserComponent />
        </PrefabProvider>
      </div>
    </div>
  );
}
function App({
  outerUserContext,
  innerUserContext,
}: {
  outerUserContext: ContextAttributes;
  innerUserContext: ContextAttributes;
}) {
  return (
    <PrefabProvider apiKey={apiKey} contextAttributes={outerUserContext} onError={onError}>
      <OuterUserComponent admin={{ name: "John Doe" }} innerUserContext={innerUserContext} />
    </PrefabProvider>
  );
}

it("allows nested `PrefabProvider`s", async () => {
  const outerUserContext = {
    user: { email: "dr.smith@example.com", doctor: true },
    outerOnly: { city: "NYC" },
  };
  const innerUserContext = { user: { email: "patient@example.com", doctor: false } };

  const outerUserFetchData = {
    values: { greeting: { string: "Greetings, Doctor" }, secretFeature: { bool: true } },
  };
  const innerUserFetchData = {
    values: { greeting: { string: "Hi" }, secretFeature: { bool: false } },
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
  const outerPrefabInstanceHash = screen
    .getByTestId("outer-wrapper")
    .getAttribute("data-prefab-instance-hash");
  const innerPrefabInstanceHash = screen
    .getByTestId("inner-wrapper")
    .getAttribute("data-prefab-instance-hash");

  expect(outerPrefabInstanceHash).toHaveLength(36);
  expect(innerPrefabInstanceHash).toHaveLength(36);
  expect(outerPrefabInstanceHash).not.toEqual(innerPrefabInstanceHash);
  expect(outerPrefabInstanceHash).toEqual(globalPrefab.instanceHash);
});
