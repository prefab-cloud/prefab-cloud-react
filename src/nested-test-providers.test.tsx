import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { render, screen } from "@testing-library/react";
import { prefab as globalPrefab, PrefabTestProvider, usePrefab, TestProps } from "./index";

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
}: {
  admin: { name: string };
  innerTestConfig: TestProps["config"];
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
        <PrefabTestProvider config={innerTestConfig}>
          <InnerUserComponent />
        </PrefabTestProvider>
      </div>
    </div>
  );
}

function App({
  innerTestConfig,
  outerTestConfig,
}: {
  innerTestConfig: TestProps["config"];
  outerTestConfig: TestProps["config"];
}) {
  return (
    <PrefabTestProvider config={outerTestConfig}>
      <OuterUserComponent admin={{ name: "John Doe" }} innerTestConfig={innerTestConfig} />
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

  render(<App outerTestConfig={outerTestConfig} innerTestConfig={innerTestConfig} />);

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
