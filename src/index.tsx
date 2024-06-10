import React, { PropsWithChildren } from "react";
import { prefab, ConfigValue, Context, Duration, Prefab } from "@prefab-cloud/prefab-cloud-js";
import version from "./version";

type ContextValue = number | string | boolean;
type ContextAttributes = { [key: string]: Record<string, ContextValue> };

type ProvidedContext = {
  get: (key: string) => any;
  getDuration(key: string): Duration | undefined;
  contextAttributes: ContextAttributes;
  isEnabled: (key: string) => boolean;
  loading: boolean;
  prefab: typeof prefab;
  keys: string[];
};

const defaultContext: ProvidedContext = {
  get: (_: string) => undefined,
  getDuration: (_: string) => undefined,
  isEnabled: (_: string) => false,
  keys: [],
  loading: true,
  contextAttributes: {},
  prefab,
};

const PrefabContext = React.createContext(defaultContext);
PrefabContext.displayName = "PrefabContext";

const usePrefab = () => React.useContext(PrefabContext);

type EvaluationCallback = (key: string, value: ConfigValue, context: Context | undefined) => void;

type Props = {
  apiKey: string;
  contextAttributes?: ContextAttributes;
  endpoints?: string[];
  apiEndpoint?: string;
  timeout?: number;
  pollInterval?: number;
  onError?: (error: Error) => void;
  afterEvaluationCallback?: EvaluationCallback;
  collectEvaluationSummaries?: boolean;
  collectLoggerNames?: boolean;
  ContextToUse?: React.Context<ProvidedContext>;
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
  collectEvaluationSummaries = false,
  collectLoggerNames = false,
  ContextToUse = PrefabContext,
}: PropsWithChildren<Props>) {
  // We use this state to prevent a double-init when useEffect fires due to
  // StrictMode
  const mostRecentlyLoadingContextKey = React.useRef<string | undefined>(undefined);
  // We use this state to pass the loading state to the Provider (updating
  // currentLoadingContextKey won't trigger an update)
  const [loading, setLoading] = React.useState(true);
  // Here we track the current identity so we can reload our config when it
  // changes
  const [loadedContextKey, setLoadedContextKey] = React.useState("");

  const prefabClient: Prefab = React.useMemo(
    () => (ContextToUse.displayName === PrefabContext.displayName ? prefab : new Prefab()),
    [ContextToUse.displayName]
  );

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

      const initOptions: Parameters<typeof prefabClient.init>[0] = {
        context,
        apiKey,
        timeout,
        endpoints,
        apiEndpoint,
        afterEvaluationCallback,
        collectEvaluationSummaries,
        collectLoggerNames,
        clientVersionString: `prefab-cloud-react-${version}`,
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
  }, [apiKey, loadedContextKey, contextKey, loading, setLoading, onError]);

  const value: ProvidedContext = React.useMemo(
    () => ({
      isEnabled: prefabClient.isEnabled.bind(prefabClient),
      contextAttributes,
      get: prefabClient.get.bind(prefabClient),
      getDuration: prefabClient.getDuration.bind(prefabClient),
      keys: Object.keys(prefabClient.configs),
      prefab: prefabClient,
      loading,
    }),
    [loadedContextKey, loading, prefabClient]
  );

  return <ContextToUse.Provider value={value}>{children}</ContextToUse.Provider>;
}

type TestProps = {
  config: Record<string, any>;
};

// TODO: would need to update this to allow for multiple instances as well
function PrefabTestProvider({ config, children }: PropsWithChildren<TestProps>) {
  const get = (key: string) => config[key];
  const getDuration = (key: string) => config[key];
  const isEnabled = (key: string) => !!get(key);

  const value = React.useMemo(
    (): ProvidedContext => ({
      isEnabled,
      contextAttributes: config.contextAttributes,
      get,
      getDuration,
      loading: false,
      prefab,
      keys: Object.keys(config),
    }),
    [config]
  );

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
  defaultContext,
};
