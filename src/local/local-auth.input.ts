import z from 'zod'

export const LoginWithUsernameInput = z.object({
  username: z.string(),
  password: z.string(),
})
export type LoginWithUsernameInput = z.infer<typeof LoginWithUsernameInput>
