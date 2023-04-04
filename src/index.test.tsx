import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { act } from 'react-dom/test-utils';
import { PrefabProvider, PrefabTestProvider, usePrefab } from './index';

function MyComponent() {
  const { get, isEnabled, loading } = usePrefab();
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

describe('Provider', () => {
  const renderInProvider = () => {
    render(
      <PrefabProvider
        apiKey="api-key"
        lookupKey="user-1234"
        identityAttributes={{}}
        onError={() => {}}
      >
        <MyComponent />
      </PrefabProvider>,
    );
  };

  const stubConfig = (config: { [key: string]: any }) => new Promise((resolve) => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => {
        setTimeout(resolve);
        return { values: config };
      },
    })) as jest.Mock;
  });

  const renderWithConfig = async (config: { [key: string]: any }) => {
    const promise = stubConfig(config);

    renderInProvider();

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
    await renderWithConfig({ greeting: { string: 'CUSTOM' } });

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });

  it('allows providing true flag booleans', async () => {
    await renderWithConfig({ greeting: { string: 'CUSTOM' }, secretFeature: { boolean: true } });

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).toBeInTheDocument();
  });

  it('allows providing false flag booleans', async () => {
    await renderWithConfig({ greeting: { string: 'CUSTOM' }, secretFeature: { boolean: false } });

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });
});

describe('TestProvider', () => {
  const renderInTestProvider = (config: { [key: string]: any }) => {
    render(
      <PrefabTestProvider config={config}>
        <MyComponent />
      </PrefabTestProvider>,
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
    renderInTestProvider({ greeting: 'CUSTOM' });

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });

  it('allows providing true flag booleans', async () => {
    renderInTestProvider({ greeting: 'CUSTOM', secretFeature: true });

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).toBeInTheDocument();
  });

  it('allows providing false flag booleans', async () => {
    renderInTestProvider({ greeting: 'CUSTOM', secretFeature: false });

    const alert = screen.queryByRole('alert');
    expect(alert).toHaveTextContent('CUSTOM');
    const secretFeature = screen.queryByTitle('secret-feature');
    expect(secretFeature).not.toBeInTheDocument();
  });
});
