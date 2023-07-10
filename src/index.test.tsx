import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import {act} from 'react-dom/test-utils';
import {ConfigValue} from '@prefab-cloud/prefab-cloud-js';
import {PrefabProvider, PrefabTestProvider, usePrefab} from './index';

type Config = {[key: string]: any};

function MyComponent() {
  const {get, isEnabled, loading} = usePrefab();
  const greeting = get('greeting') || 'Default';

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 role="alert">{greeting}</h1>
      {isEnabled('secretFeature') && (
        <button type="submit" title="secret-feature">
          Secret feature
        </button>
      )}
    </div>
  );
}

let warn: ReturnType<typeof jest.spyOn>;
let error: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  error = jest.spyOn(console, 'error').mockImplementation(() => {});
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockReset();
  error.mockReset();
});

describe('Provider', () => {
  const defaultContextAttributes = {user: {email: 'test@example.com'}};

  const renderInProvider = ({
    contextAttributes,
    identityAttributes,
  }: {
    contextAttributes?: {[key: string]: Record<string, ConfigValue>};
    identityAttributes?: {[key: string]: any};
  }) => {
    render(
      <PrefabProvider
        apiKey="api-key"
        contextAttributes={contextAttributes}
        identityAttributes={identityAttributes}
        onError={() => {}}
      >
        <MyComponent />
      </PrefabProvider>
    );
  };

  const stubConfig = (config: Config) =>
    new Promise((resolve) => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => {
            setTimeout(resolve);
            return {values: config};
          },
        })
      ) as jest.Mock;
    });

  const renderWithConfig = async (
    config: Config,
    providerConfig: Parameters<typeof renderInProvider>[0] = {
      contextAttributes: defaultContextAttributes,
    }
  ) => {
    const promise = stubConfig(config);

    renderInProvider(providerConfig);

    await act(async () => {
      await promise;
    });

    // wait for the loading content to go away
    screen.findByRole('alert');
  };

  it('renders without config', async () => {
    await renderWithConfig({});

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('Default');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });

  it('allows providing flag values', async () => {
    await renderWithConfig({greeting: {string: 'CUSTOM'}});

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });

  it('allows providing true flag booleans', async () => {
    await renderWithConfig({
      greeting: {string: 'CUSTOM'},
      secretFeature: {boolean: true},
    });

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).toBeInTheDocument();
  });

  it('allows providing false flag booleans', async () => {
    await renderWithConfig({
      greeting: {string: 'CUSTOM'},
      secretFeature: {boolean: false},
    });

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });

  it('warns when provided identityAttributes', async () => {
    const identityAttributes = {email: 'test@example.com'};

    await renderWithConfig({}, {identityAttributes});

    expect(warn).toHaveBeenCalledWith(
      'identityAttributes is deprecated and will be removed in a future release. Please use contextAttributes instead'
    );
  });

  it('errors when you provide neither contextAttributes or identityAttributes', async () => {
    await expect(async () => {
      await renderWithConfig({}, {});
    }).rejects.toThrowError('You must provide contextAttributes');
  });
});

describe('TestProvider', () => {
  const renderInTestProvider = (config: Config) => {
    render(
      <PrefabTestProvider config={config}>
        <MyComponent />
      </PrefabTestProvider>
    );
  };

  it('renders without config', () => {
    renderInTestProvider({});

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('Default');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });

  it('allows providing flag values', async () => {
    renderInTestProvider({greeting: 'CUSTOM'});

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });

  it('allows providing true flag booleans', async () => {
    renderInTestProvider({greeting: 'CUSTOM', secretFeature: true});

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).toBeInTheDocument();
  });

  it('allows providing false flag booleans', async () => {
    renderInTestProvider({greeting: 'CUSTOM', secretFeature: false});

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });
});
