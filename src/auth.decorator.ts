import {
  ContextType,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export function getContextFromExecutionCtx(context: ExecutionContext) {
  if (context.getType<ContextType | 'graphql'>() === 'graphql') {
    return context.getArgByIndex(2);
  }
  return context.getArgByIndex(0);
}

export const Auth = createParamDecorator(
  (data: unknown, executionContext: ExecutionContext) => {
    const req = getContextFromExecutionCtx(executionContext);
    return req.auth ?? req.user;
  },
);
