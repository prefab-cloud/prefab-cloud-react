import React, { PropsWithChildren } from "react";
import {
  prefab,
  CollectContextModeType,
  ConfigValue,
  Context,
  Duration,
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

type ProvidedContext = {
  get: (key: string) => any;
  getDuration(key: string): Duration | undefined;
  contextAttributes: ContextAttributes;
  isEnabled: (key: string) => boolean;
  loading: boolean;
  prefab: typeof prefab;
  keys: string[];
  settings: SharedSettings;
};

const defaultContext: ProvidedContext = {
  get: (_: string) => undefined,
  getDuration: (_: string) => undefined,
  isEnabled: (_: string) => false,
  keys: [],
  loading: true,
  contextAttributes: {},
  prefab,
  settings: {},
};

const PrefabContext = React.createContext(defaultContext);

const usePrefab = () => React.useContext(PrefabContext);

let globalPrefabIsTaken = false;

const assignPrefabClient = () => {
  if (globalPrefabIsTaken) {
    return new Prefab();
  }

  globalPrefabIsTaken = true;
  return prefab;
};

type Props = SharedSettings & {
  contextAttributes?: ContextAttributes;
};

function PrefabProvider({
  apiKey,
  contextAttributes = {},
  onError = () => {},
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

  if (Object.keys(contextAttributes).length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "PrefabProvider: You haven't passed any contextAttributes. See https://docs.prefab.cloud/docs/sdks/react#using-context"
    );
  }

  const context = new Context(contextAttributes);
  const contextKey = context.encode();

  React.useEffect(() => {
    if (mostRecentlyLoadingContextKey.current === contextKey) {
      return;
    }

    setLoading(true);

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

type TestProps = {
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

export {
  PrefabProvider,
  PrefabTestProvider,
  usePrefab,
  TestProps,
  Props,
  ConfigValue,
  ContextAttributes,
  prefab,
  SharedSettings,
};
