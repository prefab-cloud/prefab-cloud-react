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

export type ProvidedContext = {
  get: (key: string) => any;
  getDuration(key: string): Duration | undefined;
  contextAttributes: ContextAttributes;
  isEnabled: (key: string) => boolean;
  loading: boolean;
  prefab: typeof prefab;
  keys: string[];
  settings: SharedSettings;
};

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

export const PrefabContext = React.createContext(defaultContext);

export const usePrefab = () => React.useContext(PrefabContext);

let globalPrefabIsTaken = false;

export const assignPrefabClient = () => {
  if (globalPrefabIsTaken) {
    return new Prefab();
  }

  globalPrefabIsTaken = true;
  return prefab;
};

export type Props = SharedSettings & {
  contextAttributes?: ContextAttributes;
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

function PrefabProvider({
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
}: PropsWithChildren<Props>) {
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

  const value: ProvidedContext = React.useMemo(
    () => ({
      isEnabled: prefabClient.isEnabled.bind(prefabClient),
      contextAttributes,
      get: prefabClient.get.bind(prefabClient),
      getDuration: prefabClient.getDuration.bind(prefabClient),
      keys: Object.keys(prefabClient.configs),
      prefab: prefabClient,
      loading,
      settings,
    }),
    [loadedContextKey, loading, prefabClient.instanceHash, settings]
  );

  return <PrefabContext.Provider value={value}>{children}</PrefabContext.Provider>;
}

export { PrefabProvider, ConfigValue, ContextAttributes, SharedSettings };
