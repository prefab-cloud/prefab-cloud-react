import React from 'react';
import { prefab, Identity } from '@prefab-cloud/prefab-cloud-js';

type LookupKey = string;
type IdentityAttributes = { [key: string]: any };

type Context = {
  get: (key: string) => any;
  hasStartedInit: boolean;
  identityAttributes: IdentityAttributes;
  isEnabled: (key: string) => boolean;
  loading: boolean;
  lookupKey: LookupKey;
  prefab: typeof prefab;
};

const defaultContext: Context = {
  get: (_: string) => undefined,
  hasStartedInit: false,
  isEnabled: (_: string) => false,
  loading: true,
  identityAttributes: {},
  lookupKey: '',
  prefab,
};

const PrefabContext = React.createContext(defaultContext);

const usePrefab = () => React.useContext(PrefabContext);

type Props = {
  apiKey: string;
  lookupKey: LookupKey;
  identityAttributes: IdentityAttributes;
  endpoints?: string[] | undefined;
  timeout?: number | undefined;
  onError: Function;
  children: React.ReactNode;
};

function PrefabProvider({
  apiKey,
  lookupKey,
  identityAttributes = {},
  onError = () => {},
  children,
  timeout,
  endpoints,
}: Props) {
  // We use this state to prevent a double-init when useEffect fires due to
  // StrictMode
  const hasStartedInit = React.useRef(false);
  // We use this state to pass the loading state to the Provider (updating
  // hasStartedLoading won't trigger an update)
  const [loading, setLoading] = React.useState(true);
  // Here we track the current identity so we can reload our config when it
  // changes
  const [loadedIdentity, setLoadedIdentity] = React.useState('');

  React.useEffect(() => {
    const identity = new Identity(lookupKey, identityAttributes);
    const identityKey = identity.encode();

    if (hasStartedInit.current) {
      return;
    }

    if (!hasStartedInit.current && loadedIdentity !== identityKey) {
      hasStartedInit.current = true;

      prefab
        .init({
          apiKey,
          identity,
          timeout,
          endpoints,
        })
        .then(() => {
          hasStartedInit.current = false;
          setLoading(false);
          setLoadedIdentity(identityKey);
        })
        .catch((reason) => {
          setLoading(false);
          onError(reason);
        });
    }
  }, [apiKey, loadedIdentity, lookupKey, identityAttributes, loading, setLoading, onError]);

  const value: Context = React.useMemo(
    () => ({
      lookupKey,
      identityAttributes,
      isEnabled: prefab.isEnabled.bind(prefab),
      get: prefab.get.bind(prefab),
      prefab,
      loading,
      hasStartedInit: hasStartedInit.current,
    }),
    [lookupKey, identityAttributes, loading, prefab],
  );

  return <PrefabContext.Provider value={value}>{children}</PrefabContext.Provider>;
}

PrefabProvider.defaultProps = {
  timeout: undefined,
  endpoints: undefined,
};

type TestProps = {
  config: { [key: string]: any };
  children: React.ReactNode;
};

function PrefabTestProvider({ config, children }: TestProps) {
  const get = (key: string) => config[key];
  const isEnabled = (key: string) => !!get(key);

  const value: Context = React.useMemo(
    () => ({
      isEnabled,
      get,
      loading: false,
      lookupKey: 'test',
      identityAttributes: {},
      hasStartedInit: true,
      prefab,
    }),
    [config],
  );

  return <PrefabContext.Provider value={value}>{children}</PrefabContext.Provider>;
}

export {
  PrefabProvider, PrefabTestProvider, usePrefab, TestProps, Props,
};
