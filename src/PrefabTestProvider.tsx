import React, { PropsWithChildren } from "react";
import { PrefabContext, assignPrefabClient, ProvidedContext } from "./PrefabProvider";

export type TestProps = {
  config: Record<string, any>;
  apiKey?: string;
};

function PrefabTestProvider({ apiKey, config, children }: PropsWithChildren<TestProps>) {
  const get = (key: string) => config[key];
  const getDuration = (key: string) => config[key];
  const isEnabled = (key: string) => !!get(key);

  const value = React.useMemo((): ProvidedContext => {
    const prefabClient = assignPrefabClient();
    prefabClient.get = get;
    prefabClient.getDuration = getDuration;
    prefabClient.isEnabled = isEnabled;

    return {
      isEnabled,
      contextAttributes: config.contextAttributes,
      get,
      getDuration,
      loading: false,
      prefab: prefabClient,
      keys: Object.keys(config),
      settings: { apiKey: apiKey ?? "fake-api-key-via-the-test-provider" },
    };
  }, [config]);

  return <PrefabContext.Provider value={value}>{children}</PrefabContext.Provider>;
}

export { PrefabTestProvider };
