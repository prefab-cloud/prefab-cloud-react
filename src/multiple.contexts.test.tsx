import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { render, screen } from "@testing-library/react";
import { Context as PrefabContext } from "@prefab-cloud/prefab-cloud-js";
import fetchMock, { enableFetchMocks } from "jest-fetch-mock";
import { PrefabProvider, usePrefab, defaultContext, ContextAttributes } from "./index";

enableFetchMocks();

const InnerPrefabContext = React.createContext(defaultContext);
InnerPrefabContext.displayName = "InnerPrefabContext";
const useInnerUserPrefab = () => React.useContext(InnerPrefabContext);

function InnerUserComponent() {
  const { get, isEnabled, loading } = useInnerUserPrefab();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 data-testid="inner-greeting">{get("greeting") ?? "Default"}</h1>
      {isEnabled("secretFeature") && (
        <button data-testid="inner-secret-feature" type="submit" title="secret-feature">
          Secret feature
        </button>
      )}
    </div>
  );
}

function OuterUserComponent({ user }: { user: { name: string } }) {
  const { get, isEnabled, loading } = usePrefab();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 data-testid="outer-greeting">{get("greeting") ?? "Default"}</h1>
      {isEnabled("secretFeature") && (
        <button data-testid="outer-secret-feature" type="submit" title="secret-feature">
          Secret feature
        </button>
      )}

      <div>
        <h1>You are looking at {user.name}</h1>
        <InnerUserComponent />
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
  // eslint-disable-next-line no-console
  const onError = console.error;
  const apiKey = "api-key";

  return (
    <PrefabProvider apiKey={apiKey} contextAttributes={outerUserContext} onError={onError}>
      <PrefabProvider
        // Our inner provider will use a different React Context
        ContextToUse={InnerPrefabContext}
        // and its own Prefab context
        contextAttributes={innerUserContext}
        apiKey={apiKey}
        onError={onError}
      >
        <OuterUserComponent user={{ name: "John Doe" }} />
      </PrefabProvider>
    </PrefabProvider>
  );
}

it("allows multiple providers", async () => {
  const outerUserContext = { user: { email: "dr.smith@example.com", doctor: true } };
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
});
