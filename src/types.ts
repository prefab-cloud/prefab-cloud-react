import { createContext } from "react";
import { prefab } from "@prefab-cloud/prefab-cloud-js";

type ContextValue = number | string | boolean;

export type ContextAttributes = { [key: string]: Record<string, ContextValue> };

export type ProvidedContext = {
  get: (key: string) => any;
  contextAttributes: ContextAttributes;
  isEnabled: (key: string) => boolean;
  loading: boolean;
  prefab: typeof prefab;
  keys: string[];
};

const defaultContext: ProvidedContext = {
  get: (_: string) => undefined,
  isEnabled: (_: string) => false,
  keys: [],
  loading: true,
  contextAttributes: {},
  prefab,
};

export const PrefabContext = createContext(defaultContext);
