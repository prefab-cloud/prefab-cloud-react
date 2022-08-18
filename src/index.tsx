import React, {
  createContext, useContext, useState, useEffect, useRef, useMemo,
} from 'react';
import prefab, { Identity } from '@prefab-cloud/prefab-cloud-js';

const PrefabContext = createContext({} as any);

export const usePrefab = () => useContext(PrefabContext);

export type Props = {
  apiKey: string,
  lookupKey: string,
  identityAttributes: {[key:string]: any},
  timeout?: number | undefined,
  onError: Function,
  children: React.ReactNode,
}

function PrefabProvider({
  apiKey, lookupKey, identityAttributes = {}, onError = () => {}, children, timeout,
}: Props) {
  // We use this state to prevent a double-init when useEffect fires due to
  // StrictMode
  const hasStartedLoading = useRef(false);
  // We use this state to pass the loading state to the Provider (updating
  // hasStartedLoading won't trigger an update)
  const [loading, setLoading] = useState(false);
  // Here we track the current identity so we can reload our config when it
  // changes
  const [loadedIdentity, setLoadedIdentity] = useState('');

  useEffect(() => {
    const identity = new Identity(lookupKey, identityAttributes);
    const identityKey = identity.encode();

    if (hasStartedLoading.current) {
      return;
    }

    if (!loading && loadedIdentity !== identityKey) {
      hasStartedLoading.current = true;

      setLoading(true);

      prefab.init({ apiKey, identity, timeout }).then(() => {
        hasStartedLoading.current = false;
        setLoading(false);
        setLoadedIdentity(identityKey);
      })
        .catch((reason) => {
          setLoading(false);
          onError(reason);
        });
    }
  }, [apiKey, loadedIdentity, lookupKey, identityAttributes, loading, setLoading, onError]);

  const value = useMemo(() => ({
    lookupKey,
    identityAttributes,
    isEnabled: prefab.isEnabled.bind(prefab),
    get: prefab.get.bind(prefab),
    loading,
  }), [lookupKey, identityAttributes, loading, prefab]);

  return (
    <PrefabContext.Provider value={value}>
      {children}
    </PrefabContext.Provider>
  );
}

PrefabProvider.defaultProps = {
  timeout: undefined,
};

export type TestProps = {
  config: {[key:string]: any},
  children: React.ReactNode,
}

export function PrefabTestProvider({ config, children }: TestProps) {
  const get = (key:string) => config[key];
  const isEnabled = (key:string) => !!get(key);

  const value = useMemo(() => ({
    isEnabled,
    get,
    loading: false,
  }), [config]);

  return (
    <PrefabContext.Provider value={value}>
      {children}
    </PrefabContext.Provider>
  );
}

export default PrefabProvider;
