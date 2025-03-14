import React from "react";
import { Prefab } from "@prefab-cloud/prefab-cloud-js";
import { usePrefabTypesafe, createPrefabHook } from "../index";

// Simple TypesafeClass for testing
export class AppConfig {
  private prefab: Prefab;

  constructor(prefab: Prefab) {
    this.prefab = prefab;
  }

  get myCoolFeature(): boolean {
    return this.prefab.isEnabled("my.cool.feature");
  }

  get appName(): string {
    const name = this.prefab.get("app.name");
    return typeof name === "string" ? name : "Default App";
  }

  get apiUrl(): string {
    const url = this.prefab.get("api.url");
    return typeof url === "string" ? url : "https://api.default.com";
  }

  get themeColor(): string {
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
export const useAppConfig = createPrefabHook(AppConfig);

// Component using the TypesafeClass
export function TypesafeComponent() {
  const { myCoolFeature, appName, themeColor, loading } = usePrefabTypesafe<AppConfig>();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 data-testid="app-name">{appName}</h1>
      <div data-testid="raw-theme-color">{themeColor}</div>
      {myCoolFeature && <div data-testid="feature-flag">Feature Enabled</div>}
    </div>
  );
}

// Component using the custom typed hook
export function HookComponent() {
  const { appName, apiUrl, calculateTimeout, loading } = useAppConfig();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 data-testid="app-name-hook">{appName}</h1>
      <div data-testid="api-url">{apiUrl}</div>
      <div data-testid="timeout">{calculateTimeout(2)}</div>
    </div>
  );
}

export const typesafeTestConfig = {
  "app.name": "Test App From TestProvider",
  "api.url": "https://test-provider.example.com",
  "theme.color": "#00FF00",
  "my.cool.feature": true,
  "timeout.base": 3000,
};

export const mockEvaluationsResponse = {
  evaluations: {
    "app.name": { value: { string: "Test App" } },
    "api.url": { value: { string: "https://api.test.com" } },
    "theme.color": { value: { string: "#FF5500" } },
    "my.cool.feature": { value: { boolean: true } },
    "timeout.base": { value: { int: 2000 } },
  },
};
