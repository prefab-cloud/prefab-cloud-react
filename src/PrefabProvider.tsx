import React, { PropsWithChildren } from "react";
import {
  prefab,
  type CollectContextModeType,
  type ConfigValue,
  Context,
  type Duration,
  Prefab,
} from "@prefab-cloud/prefab-cloud-js";
import version from "./version";

type ContextValue = number | string | boolean;
type ContextAttributes = { [key: string]: Record<string, ContextValue> };

type EvaluationCallback = (key: string, value: ConfigValue, context: Context | undefined) => void;

type ClassMethods<T> = {
  [K in keyof T]: T[K];
};

type PrefabTypesafeClass<T> = new (prefabInstance: Prefab) => T;

type SharedSettings = {
  apiKey?: string;
  endpoints?: string[];
  apiEndpoint?: string;
  timeout?: number;
  pollInterval?: number;
  onError?: (error: Error) => void;
  afterEvaluationCallback?: EvaluationCallback;
  collectEvaluationSummaries?: boolean;
  collectLoggerNames?: boolean;
  collectContextMode?: CollectContextModeType;
};

export type ProvidedContext<T = Record<string, unknown>> = {
  get: (key: string) => any;
  getDuration(key: string): Duration | undefined;
  contextAttributes: ContextAttributes;
  isEnabled: (key: string) => boolean;
  loading: boolean;
  prefab: typeof prefab;
  keys: string[];
  settings: SharedSettings;
} & ClassMethods<T>; // from PrefabTypesafe

export const defaultContext: ProvidedContext = {
  get: (_: string) => undefined,
  getDuration: (_: string) => undefined,
  isEnabled: (_: string) => false,
  keys: [],
  loading: true,
  contextAttributes: {},
  prefab,
  settings: {},
};

export const PrefabContext = React.createContext<ProvidedContext>(defaultContext);

// This is a factory function that creates a fully typed usePrefab hook for a specific PrefabTypesafe class
export const createPrefabHook =
  <T,>(_typesafeClass: PrefabTypesafeClass<T>) =>
  (): ProvidedContext<T> =>
    React.useContext(PrefabContext) as ProvidedContext<T>;

// Basic hook for general use - requires type parameter
export const useBasePrefab = () => React.useContext(PrefabContext);

// Helper hook for explicit typing
export const usePrefabTypesafe = <T,>(): ProvidedContext<T> =>
  useBasePrefab() as unknown as ProvidedContext<T>;

// General hook that returns the context with any explicit type
export const usePrefab = <T = any,>(): ProvidedContext<T> =>
  useBasePrefab() as unknown as ProvidedContext<T>;

let globalPrefabIsTaken = false;

export const assignPrefabClient = () => {
  if (globalPrefabIsTaken) {
    return new Prefab();
  }

  globalPrefabIsTaken = true;
  return prefab;
};

export type Props<T = Record<string, unknown>> = SharedSettings & {
  contextAttributes?: ContextAttributes;
  PrefabTypesafeClass?: PrefabTypesafeClass<T>;
};

const getContext = (
  contextAttributes: ContextAttributes,
  onError: (e: Error) => void
): [Context, string] => {
  try {
    if (Object.keys(contextAttributes).length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "PrefabProvider: You haven't passed any contextAttributes. See https://docs.prefab.cloud/docs/sdks/react#using-context"
      );
    }

    const context = new Context(contextAttributes);
    const contextKey = context.encode();

    return [context, contextKey];
  } catch (e) {
    onError(e as Error);
    return [new Context({}), ""];
  }
};

// Helper to extract methods from a TypesafeClass instance
export const extractTypesafeMethods = (instance: any): Record<string, any> => {
  const methods: Record<string, any> = {};
  const prototype = Object.getPrototypeOf(instance);

  const descriptors = Object.getOwnPropertyDescriptors(prototype);

  Object.keys(descriptors).forEach((key) => {
    if (key === "constructor") return;

    const descriptor = descriptors[key];

    // Handle regular methods
    if (typeof instance[key] === "function") {
      methods[key] = instance[key].bind(instance);
    }
    // Handle getters - convert to regular properties
    else if (descriptor.get) {
      methods[key] = instance[key];
    }
  });

  return methods;
};

function PrefabProvider<T = any>({
  apiKey,
  contextAttributes = {},
  onError = (e: unknown) => {
    // eslint-disable-next-line no-console
    console.error(e);
  },
  children,
  timeout,
  endpoints,
  apiEndpoint,
  pollInterval,
  afterEvaluationCallback = undefined,
  collectEvaluationSummaries,
  collectLoggerNames,
  collectContextMode,
  PrefabTypesafeClass: TypesafeClass,
}: PropsWithChildren<Props<T>>) {
  const settings = {
    apiKey,
    endpoints,
    apiEndpoint,
    timeout,
    pollInterval,
    onError,
    afterEvaluationCallback,
    collectEvaluationSummaries,
    collectLoggerNames,
    collectContextMode,
  };

  // We use this state to prevent a double-init when useEffect fires due to
  // StrictMode
  const mostRecentlyLoadingContextKey = React.useRef<string | undefined>(undefined);
  // We use this state to pass the loading state to the Provider (updating
  // currentLoadingContextKey won't trigger an update)
  const [loading, setLoading] = React.useState(true);
  // Here we track the current identity so we can reload our config when it
  // changes
  const [loadedContextKey, setLoadedContextKey] = React.useState("");

  const prefabClient: Prefab = React.useMemo(() => assignPrefabClient(), []);

  const [context, contextKey] = getContext(contextAttributes, onError);

  React.useEffect(() => {
    if (mostRecentlyLoadingContextKey.current === contextKey) {
      return;
    }

    setLoading(true);
    try {
      if (mostRecentlyLoadingContextKey.current === undefined) {
        mostRecentlyLoadingContextKey.current = contextKey;

        if (!apiKey) {
          throw new Error("PrefabProvider: apiKey is required");
        }

        const initOptions: Parameters<typeof prefabClient.init>[0] = {
          context,
          ...settings,
          apiKey, // this is in the settings object too, but passing it separately satisfies a type issue
          clientNameString: "prefab-cloud-react",
          clientVersionString: version,
        };

        prefabClient
          .init(initOptions)
          .then(() => {
            setLoadedContextKey(contextKey);
            setLoading(false);

            if (pollInterval) {
              prefabClient.poll({ frequencyInMs: pollInterval });
            }
          })
          .catch((reason: any) => {
            setLoading(false);
            onError(reason);
          });
      } else {
        mostRecentlyLoadingContextKey.current = contextKey;

        prefabClient
          .updateContext(context)
          .then(() => {
            setLoadedContextKey(contextKey);
            setLoading(false);
          })
          .catch((reason: any) => {
            setLoading(false);
            onError(reason);
          });
      }
    } catch (e) {
      setLoading(false);
      onError(e as Error);
    }
  }, [
    apiKey,
    loadedContextKey,
    contextKey,
    loading,
    setLoading,
    onError,
    prefabClient.instanceHash,
  ]);

  // Memoize typesafe instance separately
  const typesafeInstance = React.useMemo(() => {
    if (TypesafeClass && prefabClient) {
      return new TypesafeClass(prefabClient);
    }
    return null;
  }, [TypesafeClass, prefabClient.instanceHash, loading]);

  const value = React.useMemo(() => {
    const baseContext: ProvidedContext = {
      isEnabled: prefabClient.isEnabled.bind(prefabClient),
      contextAttributes,
      get: prefabClient.get.bind(prefabClient),
      getDuration: prefabClient.getDuration.bind(prefabClient),
      keys: Object.keys(prefabClient.configs),
      prefab: prefabClient,
      loading,
      settings,
    };

    if (typesafeInstance) {
      const methods = extractTypesafeMethods(typesafeInstance);
      return { ...baseContext, ...methods };
    }

    return baseContext;
  }, [loadedContextKey, loading, prefabClient.instanceHash, settings, typesafeInstance]);

  return <PrefabContext.Provider value={value}>{children}</PrefabContext.Provider>;
}

export { PrefabProvider, ConfigValue, ContextAttributes, SharedSettings, PrefabTypesafeClass };
