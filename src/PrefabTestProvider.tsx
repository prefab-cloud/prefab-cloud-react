import React, { PropsWithChildren } from "react";
import {
  PrefabContext,
  assignPrefabClient,
  ProvidedContext,
  PrefabTypesafeClass,
  extractTypesafeMethods,
} from "./PrefabProvider";

export type TestProps = {
  config: Record<string, any>;
  apiKey?: string;
};

function PrefabTestProvider<T = any>({
  apiKey,
  config,
  children,
  PrefabTypesafeClass: TypesafeClass,
}: PropsWithChildren<TestProps & { PrefabTypesafeClass?: PrefabTypesafeClass<T> }>) {
  const get = (key: string) => config[key];
  const getDuration = (key: string) => config[key];
  const isEnabled = (key: string) => !!get(key);

  const prefabClient = React.useMemo(() => assignPrefabClient(), []);

  // Memoize typesafe instance separately
  const typesafeInstance = React.useMemo(() => {
    if (TypesafeClass && prefabClient) {
      return new TypesafeClass(prefabClient);
    }
    return null;
  }, [TypesafeClass, prefabClient]);

  const value = React.useMemo(() => {
    prefabClient.get = get;
    prefabClient.getDuration = getDuration;
    prefabClient.isEnabled = isEnabled;

    const baseContext: ProvidedContext = {
      isEnabled,
      contextAttributes: config.contextAttributes,
      get,
      getDuration,
      loading: false,
      prefab: prefabClient,
      keys: Object.keys(config),
      settings: { apiKey: apiKey ?? "fake-api-key-via-the-test-provider" },
    };

    if (typesafeInstance) {
      const methods = extractTypesafeMethods(typesafeInstance);
      return { ...baseContext, ...methods };
    }

    return baseContext;
  }, [config, prefabClient, typesafeInstance, apiKey]);

  return <PrefabContext.Provider value={value}>{children}</PrefabContext.Provider>;
}

export { PrefabTestProvider };
