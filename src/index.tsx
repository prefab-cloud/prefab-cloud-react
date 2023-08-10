import React, {PropsWithChildren} from 'react';
import {prefab, ConfigValue, Context, Identity} from '@prefab-cloud/prefab-cloud-js';

type IdentityAttributes = undefined | {[key: string]: any};

type ContextAttributes = {[key: string]: Record<string, ConfigValue>};

type ProvidedContext = {
  get: (key: string) => any;
  hasStartedInit: boolean;
  identityAttributes?: IdentityAttributes;
  contextAttributes?: ContextAttributes;
  isEnabled: (key: string) => boolean;
  loading: boolean;
  prefab: typeof prefab;
};

const defaultContext: ProvidedContext = {
  get: (_: string) => undefined,
  hasStartedInit: false,
  isEnabled: (_: string) => false,
  loading: true,
  identityAttributes: {},
  contextAttributes: {},
  prefab,
};

const PrefabContext = React.createContext(defaultContext);

const usePrefab = () => React.useContext(PrefabContext);

type Props = {
  apiKey: string;
  identityAttributes?: IdentityAttributes;
  contextAttributes?: ContextAttributes;
  endpoints?: string[];
  timeout?: number;
  pollInterval?: number;
  onError?: (error: Error) => void;
};

function PrefabProvider({
  apiKey,
  identityAttributes = undefined,
  contextAttributes = {},
  onError = () => {},
  children,
  timeout,
  endpoints,
  pollInterval,
}: PropsWithChildren<Props>) {
  // We use this state to prevent a double-init when useEffect fires due to
  // StrictMode
  const hasStartedInit = React.useRef(false);
  // We use this state to pass the loading state to the Provider (updating
  // hasStartedInit won't trigger an update)
  const [loading, setLoading] = React.useState(true);
  // Here we track the current identity so we can reload our config when it
  // changes
  const [loadedContextKey, setLoadedContextKey] = React.useState('');

  if (!identityAttributes && Object.keys(contextAttributes).length === 0) {
    throw new Error('You must provide contextAttributes');
  }

  React.useEffect(() => {
    if (hasStartedInit.current) {
      return;
    }

    const initOptions: Parameters<typeof prefab.init>[0] = {
      apiKey,
      timeout,
      endpoints,
    };

    if (identityAttributes) {
      // eslint-disable-next-line no-console
      console.warn(
        'identityAttributes is deprecated and will be removed in a future release. Please use contextAttributes instead'
      );
      initOptions.context = new Identity('', identityAttributes).toContext();
    } else {
      initOptions.context = new Context(contextAttributes);
    }

    const contextKey = initOptions.context.encode();

    if (!hasStartedInit.current && loadedContextKey !== contextKey) {
      hasStartedInit.current = true;

      prefab
        .init(initOptions)
        .then(() => {
          hasStartedInit.current = false;
          setLoadedContextKey(contextKey);
          setLoading(false);

          if (pollInterval) {
            prefab.poll({frequencyInMs: pollInterval});
          }
        })
        .catch((reason) => {
          setLoading(false);
          onError(reason);
        });
    }
  }, [apiKey, loadedContextKey, identityAttributes, loading, setLoading, onError]);

  const value: ProvidedContext = React.useMemo(
    () => ({
      identityAttributes,
      isEnabled: prefab.isEnabled.bind(prefab),
      get: prefab.get.bind(prefab),
      prefab,
      loading,
      hasStartedInit: hasStartedInit.current,
    }),
    [identityAttributes, loading, prefab]
  );

  return <PrefabContext.Provider value={value}>{children}</PrefabContext.Provider>;
}

type TestProps = {
  config: Record<string, any>;
};

function PrefabTestProvider({config, children}: PropsWithChildren<TestProps>) {
  const get = (key: string) => config[key];
  const isEnabled = (key: string) => !!get(key);

  const value: ProvidedContext = React.useMemo(
    () => ({
      isEnabled,
      get,
      loading: false,
      identityAttributes: {},
      hasStartedInit: true,
      prefab,
    }),
    [config]
  );

  return <PrefabContext.Provider value={value}>{children}</PrefabContext.Provider>;
}

export {PrefabProvider, PrefabTestProvider, usePrefab, TestProps, Props, prefab};
