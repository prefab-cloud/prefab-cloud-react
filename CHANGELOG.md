Changelog

## 0.4.6 - 2025-05-22

- Extra error handling for loader and telemetry uploader

## 0.4.5 - 2025-04-10

- Silently handle Telemetry AbortErrors

## 0.4.4 - 2025-03-12

- Use tsup for better ESM/CJS compatibility

## 0.4.2 - 2025-03-11

- Add ESM support (#59)

## 0.4.1 - 2024-09-12

- Update Prefab JS client to 0.4.2 (for bootstrapping)

## 0.4.0 - 2024-08-21

- Update Prefab JS client to 0.4.0 / global delivery

## 0.3.7 - 2024-08-20

- More robust error handling (#56)

## 0.3.6 - 2024-07-18

- Fixes error when uploading eval telemetry for stringList values

## 0.3.5 - 2024-07-17

- Reduces volume of internal logging done by telemetry uploader

## 0.3.4 - 2024-07-16

- Adds validation console errors for Context object

## 0.3.3 - 2024-7-10

- Adds collectContextMode option to control context telemetry
- Tries to flush telemetry when browser window closes
- Improves prefix for internal logger names

## 0.3.2 - 2024-06-20

- Allow nesting a PrefabProvider in a PrefabTestProvider (#48)

## 0.3.1 - 2024-06-13

- Support for nested PrefabProviders

## 0.3.0 - 2024-06-04

- collectEvaluationSummaries is now opt-out (#42)

## 0.2.7 - 2024-05-31

- Support durations

## 0.2.6 - 2024-05-10

- Export types for ConfigValue and ContextAttributes

## 0.2.5 - 2024-05-07

- Remove `react-dom` from peerDependencies

## 0.2.4 - 2024-05-03

- Support for JSON config values

## 0.2.3 - 2024-04-12

- Expose known keys (#36)

## 0.2.2 - 2024-01-17

- Updates to errors and warnings

## 0.2.1 - 2024-01-11

- Fix default endpoint for telemetry

## 0.2.0 - 2023-12-12

- Remove identity support. Use Context instead. (#30)
- Re-fetch when context attributes change. (#31)

## 0.1.21 - 2023-12-11

- Use correct client version string

## 0.1.20 - 2023-10-31

- Opt-in param for logger telemetry

## 0.1.19 - 2023-10-24

- Start reporting evaluation telemetry when keys are actually used

## 0.1.18 - 2023-10-13

- Warn instead of erroring when no context is provided

## 0.1.17 - 2023-09-20

- Add support for a `afterEvaluationCallback` callback for forwarding evaluation events to analytics
  tools, etc.

## 0.1.16 - 2023-08-10

- Fix race condition (#21)

## 0.1.15 - 2023-07-11

- Update `prefab-cloud-js` to v0.1.14

## 0.1.14 - 2023-07-11

- Update `prefab-cloud-js` to v0.1.13

## 0.1.13 - 2023-07-10

- Update `prefab-cloud-js` to v0.1.12

## 0.1.12 - 2023-07-10

- Update eslint and resolve all existing errors/warnings
- Add and configure prettier
- Add support for passing a pollInterval to the `PrefabProvider`

## [0.1.11] - 2023-07-06

- Update `prefab-cloud-js` to v0.1.11

## [0.1.10] - 2023-06-27

- Update `prefab-cloud-js` to v0.1.10

## [0.1.9] - 2023-06-27

- Update `prefab-cloud-js` to v0.1.9

## [0.1.8] - 2023-06-27

- Initial CHANGELOG (with backdated content)
- Formatting cleanup

## [0.1.7] - 2023-05-01

- Add Context and deprecate `identityAttributes` (#4)

## [0.1.6] - 2023-04-04

- Fix emitted types (#2)

## [0.1.5] - 2023-03-16

- Allow passing endpoints

## [0.1.4] - 2023-03-16

- Update dependencies and use named exports

## [0.1.3] - 2022-09-29

- Bump prefab-cloud-js dependency to 0.1.3

## [0.1.2] - 2022-08-18

- Bump prefab-cloud-js dependency to 0.1.2

## [0.0.1] - 2022-08-15

- Initial release
