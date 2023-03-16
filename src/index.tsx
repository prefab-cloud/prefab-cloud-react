import React, {
  createContext, useContext, useState, useEffect, useRef, useMemo,
} from 'react';
import { prefab, Identity } from '@prefab-cloud/prefab-cloud-js';

const PrefabContext = createContext({} as any);

const usePrefab = () => useContext(PrefabContext);

type Props = {
  apiKey: string,
  lookupKey: string,
  identityAttributes: {[key:string]: any},
  endpoints?: string[] | undefined;
  timeout?: number | undefined,
  onError: Function,
  children: React.ReactNode,
}

function PrefabProvider({
  apiKey, lookupKey, identityAttributes = {}, onError = () => {}, children, timeout, endpoints,
}: Props) {
  // We use this state to prevent a double-init when useEffect fires due to
  // StrictMode
  const hasStartedInit = useRef(false);
  // We use this state to pass the loading state to the Provider (updating
  // hasStartedLoading won't trigger an update)
  const [loading, setLoading] = useState(true);
  // Here we track the current identity so we can reload our config when it
  // changes
  const [loadedIdentity, setLoadedIdentity] = useState('');

  useEffect(() => {
    const identity = new Identity(lookupKey, identityAttributes);
    const identityKey = identity.encode();

    if (hasStartedInit.current) {
      return;
    }

    if (!hasStartedInit.current && loadedIdentity !== identityKey) {
      hasStartedInit.current = true;

      prefab.init({
        apiKey, identity, timeout, endpoints,
      }).then(() => {
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

  const value = useMemo(() => ({
    lookupKey,
    identityAttributes,
    isEnabled: prefab.isEnabled.bind(prefab),
    get: prefab.get.bind(prefab),
    prefab,
    loading,
    hasStartedInit,
  }), [lookupKey, identityAttributes, loading, prefab]);

  return (
    <PrefabContext.Provider value={value}>
      {children}
    </PrefabContext.Provider>
  );
}

PrefabProvider.defaultProps = {
  timeout: undefined,
  endpoints: undefined,
};

type TestProps = {
  config: {[key:string]: any},
  children: React.ReactNode,
}

function PrefabTestProvider({ config, children }: TestProps) {
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

export {
  PrefabProvider, PrefabTestProvider, usePrefab, TestProps, Props,
};
