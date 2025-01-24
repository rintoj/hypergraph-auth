import { AuthStrategyType } from '../auth.config';

export class LocalAuthConfig {
  type!: AuthStrategyType.Local;
  enableRestAPI?: boolean;
  enableGraphQLAPI?: boolean;
}

export function createLocalStrategy(
  config: Omit<LocalAuthConfig, 'type'>,
): LocalAuthConfig {
  return {
    type: AuthStrategyType.Local,
    ...config,
  };
}
