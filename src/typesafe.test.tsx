/* eslint-disable max-classes-per-file */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Prefab } from "@prefab-cloud/prefab-cloud-js";
import {
  PrefabProvider,
  PrefabTestProvider,
  usePrefabTypesafe,
  createPrefabHook,
  PrefabTypesafeClass,
} from "./index";

// Mock the prefab API responses for testing
jest.mock("@prefab-cloud/prefab-cloud-js", () => {
  const originalModule = jest.requireActual("@prefab-cloud/prefab-cloud-js");
  return {
    ...originalModule,
    prefab: {
      ...originalModule.prefab,
      init: jest.fn().mockResolvedValue(undefined),
      updateContext: jest.fn().mockResolvedValue(undefined),
      isEnabled: jest.fn().mockReturnValue(true),
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "greeting") return "Hello from Prefab";
        if (key === "secretFeature") return true;
        return undefined;
      }),
      getDuration: jest.fn().mockReturnValue(undefined),
      configs: { greeting: "Hello from Prefab", secretFeature: true },
      instanceHash: "mock-instance-hash",
    },
    Prefab: jest.fn().mockImplementation(() => ({
      init: jest.fn().mockResolvedValue(undefined),
      updateContext: jest.fn().mockResolvedValue(undefined),
      isEnabled: jest.fn().mockReturnValue(true),
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "greeting") return "Hello from Prefab";
        if (key === "secretFeature") return true;
        return undefined;
      }),
      getDuration: jest.fn().mockReturnValue(undefined),
      configs: { greeting: "Hello from Prefab", secretFeature: true },
      instanceHash: "mock-instance-hash",
    })),
  };
});

// Create a test TypesafeClass
class TestFeatureFlags {
  private prefab: Prefab;

  constructor(prefab: Prefab) {
    this.prefab = prefab;
  }

  isSecretFeatureEnabled(): boolean {
    return this.prefab.isEnabled("secretFeature");
  }

  getGreeting(): string {
    const greeting = this.prefab.get("greeting");
    return typeof greeting === "string" ? greeting : "Default Greeting";
  }

  calculateValue(multiplier: number): number {
    // Some arbitrary logic that depends on a flag value
    const baseValue = this.prefab.get("baseValue");
    const base = typeof baseValue === "number" ? baseValue : 10;
    return base * multiplier;
  }
}

// Create a typed hook using our TypesafeClass
const useTestFeatureFlags = createPrefabHook(TestFeatureFlags);

// Test component that uses the TypesafeClass via usePrefabTypesafe
function TypesafeComponent() {
  const { isSecretFeatureEnabled, getGreeting, loading } = usePrefabTypesafe<TestFeatureFlags>();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 data-testid="greeting">{getGreeting()}</h1>
      {isSecretFeatureEnabled() && <div data-testid="secret-feature">Secret Feature Enabled</div>}
    </div>
  );
}

// Component that uses the custom typed hook
function CustomHookComponent() {
  const { isSecretFeatureEnabled, getGreeting, loading } = useTestFeatureFlags();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 data-testid="greeting">{getGreeting()}</h1>
      {isSecretFeatureEnabled() && <div data-testid="secret-feature">Secret Feature Enabled</div>}
    </div>
  );
}

describe("TypesafeClass and usePrefabTypesafe functionality", () => {
  let consoleError: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;

  // Default context attributes to use in all tests
  const defaultContextAttributes = { user: { id: "test-user" } };

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  describe("PrefabProvider with TypesafeClass", () => {
    it("makes TypesafeClass methods available through usePrefabTypesafe", async () => {
      render(
        <PrefabProvider
          apiKey="test-api-key"
          PrefabTypesafeClass={TestFeatureFlags}
          contextAttributes={defaultContextAttributes}
        >
          <TypesafeComponent />
        </PrefabProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("greeting")).toHaveTextContent("Hello from Prefab");
      expect(screen.getByTestId("secret-feature")).toBeInTheDocument();
    });

    it("correctly passes context to TypesafeClass methods", async () => {
      render(
        <PrefabProvider
          apiKey="test-api-key"
          PrefabTypesafeClass={TestFeatureFlags}
          contextAttributes={{ user: { id: "123" } }}
        >
          <TypesafeComponent />
        </PrefabProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("greeting")).toHaveTextContent("Hello from Prefab");
    });

    it("works with the createPrefabHook factory", async () => {
      render(
        <PrefabProvider
          apiKey="test-api-key"
          PrefabTypesafeClass={TestFeatureFlags}
          contextAttributes={defaultContextAttributes}
        >
          <CustomHookComponent />
        </PrefabProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("greeting")).toHaveTextContent("Hello from Prefab");
      expect(screen.getByTestId("secret-feature")).toBeInTheDocument();
    });
  });

  describe("PrefabTestProvider with TypesafeClass", () => {
    it("makes TypesafeClass methods available in test environment", () => {
      render(
        <PrefabTestProvider
          config={{
            greeting: "Hello from Test",
            secretFeature: true,
            contextAttributes: defaultContextAttributes,
          }}
          PrefabTypesafeClass={TestFeatureFlags}
        >
          <TypesafeComponent />
        </PrefabTestProvider>
      );

      expect(screen.getByTestId("greeting")).toHaveTextContent("Hello from Test");
      expect(screen.getByTestId("secret-feature")).toBeInTheDocument();
    });

    it("uses test configuration for TypesafeClass methods", () => {
      // Create a component that uses the hook properly
      function TestComponent() {
        const { calculateValue, getGreeting } = usePrefabTypesafe<TestFeatureFlags>();
        return (
          <div>
            <h1 data-testid="test-greeting">{getGreeting()}</h1>
            <span data-testid="calculated-value">{calculateValue(5)}</span>
          </div>
        );
      }

      render(
        <PrefabTestProvider
          config={{
            greeting: "Custom Greeting",
            secretFeature: false,
            baseValue: 20,
            contextAttributes: defaultContextAttributes,
          }}
          PrefabTypesafeClass={TestFeatureFlags}
        >
          <TypesafeComponent />
          <TestComponent />
        </PrefabTestProvider>
      );

      expect(screen.getAllByTestId("greeting")[0]).toHaveTextContent("Custom Greeting");
      expect(screen.queryByTestId("secret-feature")).not.toBeInTheDocument();
      expect(screen.getByTestId("calculated-value")).toHaveTextContent("100"); // 20 * 5
    });
  });

  describe("TypesafeClass instance memoization", () => {
    it("memoizes the TypesafeClass instance properly", async () => {
      // Create a class with a method we can spy on
      class TestClass {
        // eslint-disable-next-line no-useless-constructor
        constructor(private prefab: Prefab) {}

        // eslint-disable-next-line class-methods-use-this
        testMethod() {
          return "test-result";
        }
      }

      // Mock the constructor
      const constructorSpy = jest.fn();
      const OriginalTestClass = TestClass;

      // Create a wrapper class with the same interface but with a spied constructor
      const MockedTestClass = function MockedTestClass(this: any, prefab: Prefab) {
        constructorSpy();
        return new OriginalTestClass(prefab);
      } as unknown as typeof TestClass;

      MockedTestClass.prototype = OriginalTestClass.prototype;

      const testMethodSpy = jest.spyOn(TestClass.prototype, "testMethod");

      // Component that forces re-renders
      function TestComponent() {
        const [counter, setCounter] = React.useState(0);
        const { testMethod } = usePrefabTypesafe<TestClass>();

        // Call the method on each render
        const result = testMethod();

        React.useEffect(() => {
          // Force multiple re-renders
          if (counter < 3) {
            setCounter((c) => c + 1);
          }
        }, [counter]);

        return (
          <div data-testid="result">
            {result} ({counter})
          </div>
        );
      }

      render(
        <PrefabProvider
          apiKey="test-api-key"
          contextAttributes={defaultContextAttributes}
          PrefabTypesafeClass={MockedTestClass as unknown as PrefabTypesafeClass<TestClass>}
        >
          <TestComponent />
        </PrefabProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("result")).toHaveTextContent("test-result (3)");
      });

      // The instance should be memoized, so even though we rendered 4 times,
      // the constructor should be called only once, and our method bind
      // should maintain identity across renders
      expect(testMethodSpy).toHaveBeenCalledTimes(4);
      expect(constructorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
