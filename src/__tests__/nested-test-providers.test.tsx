import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { act, render, screen } from "@testing-library/react";
import {
  prefab as globalPrefab,
  PrefabProvider,
  usePrefab,
  PrefabTestProvider,
  TestProps,
} from "../index";

type Provider = typeof PrefabTestProvider | typeof PrefabProvider;

type Config = { [key: string]: any };

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
  innerTestConfig,
  InnerProvider,
}: {
  admin: { name: string };
  innerTestConfig: TestProps["config"];
  InnerProvider: Provider;
}) {
  const { get, isEnabled, loading, prefab, settings } = usePrefab();

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
        <InnerProvider
          config={innerTestConfig}
          /* eslint-disable-next-line react/jsx-props-no-spreading */
          {...settings}
          contextAttributes={{ user: { email: "test@example.com" } }}
        >
          <InnerUserComponent />
        </InnerProvider>
      </div>
    </div>
  );
}

function App({
  innerTestConfig,
  outerTestConfig,
  InnerProvider,
}: {
  innerTestConfig: TestProps["config"];
  outerTestConfig: TestProps["config"];
  InnerProvider: Provider;
}) {
  return (
    <PrefabTestProvider config={outerTestConfig}>
      <OuterUserComponent
        admin={{ name: "John Doe" }}
        innerTestConfig={innerTestConfig}
        InnerProvider={InnerProvider}
      />
    </PrefabTestProvider>
  );
}

it("allows nested test `PrefabTestProvider`s", async () => {
  const outerUserContext = {
    user: { email: "dr.smith@example.com", doctor: true },
    outerOnly: { city: "NYC" },
  };
  const innerUserContext = { user: { email: "patient@example.com", doctor: false } };

  const outerTestConfig = {
    contextAttributes: outerUserContext,
    greeting: "Greetings, Doctor",
    secretFeature: true,
  };

  const innerTestConfig = {
    contextAttributes: innerUserContext,
    greeting: "Hi",
    secretFeature: false,
  };

  render(
    <App
      outerTestConfig={outerTestConfig}
      innerTestConfig={innerTestConfig}
      InnerProvider={PrefabTestProvider}
    />
  );

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

it("can nest a real provider within a test provider", async () => {
  const outerUserContext = {
    user: { email: "dr.smith@example.com", doctor: true },
    outerOnly: { city: "NYC" },
  };

  const outerTestConfig = {
    contextAttributes: outerUserContext,
    greeting: "Greetings, Doctor",
    secretFeature: true,
  };

  const innerTestConfig = {
    greeting: { value: { string: "Hi" } },
    secretFeature: { value: { bool: false } },
  };

  const promise = stubConfig(innerTestConfig);

  render(
    <App outerTestConfig={outerTestConfig} innerTestConfig={{}} InnerProvider={PrefabProvider} />
  );

  await act(async () => {
    await promise;
  });

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
});
