export type GetSessionRequest =
  | {
      code: string
      type: 'authorization_code'
      redirectUri: string
    }
  | {
      refreshToken: string
      type: 'refresh_token'
    }

export type ExchangeCodeForSessionRequest = {
  code: string | undefined
  redirectUri: string | undefined
}

export interface GoogleAuthSession {
  /**
   * The token that your application sends to authorize a Google API request.
   */
  access_token: string

  /**
   * The remaining lifetime of the access token in seconds.
   * For example, a value of 3600 means that the token will expire in one hour.
   */
  expires_in: number

  /**
   * The type of token returned. At this time, this field's value is always 'Bearer'.
   */
  token_type: 'Bearer'

  /**
   * A token that you can use to obtain a new access token.
   * Refresh tokens are returned only if you requested offline access
   * by setting the `access_type` parameter to `offline` in the initial
   * authorization request.
   */
  refresh_token?: string

  /**
   * The space-delimited list of scopes that the access token is valid for.
   */
  scope: string

  /**
   * A JSON Web Token (JWT) that contains digitally signed identity
   * information about the user. This is only present if the `openid`
   * scope was requested.
   */
  id_token?: string
}

export interface GoogleUserInfo {
  /**
   * An identifier for the user, unique among all Google accounts and
   * never reused. A Google account can have multiple email addresses at
   * different points in time, but the sub value is never changed.
   * Use sub within your application as the unique identifier for the user.
   */
  sub: string

  /**
   * The user's full name, in a displayable format. Might be absent if
   * the user has not shared this information.
   */
  name?: string

  /**
   * The user's given name or first name. Might be absent.
   */
  given_name?: string

  /**
   * The user's family name or last name. Might be absent.
   */
  family_name?: string

  /**
   * The URL of the user's profile picture. Might be absent.
   */
  picture?: string

  /**
   * The user's primary email address. This field is only present if the
   * "email" scope was requested.
   */
  email?: string

  /**
   * True if the user's email address has been verified; otherwise false.
   */
  email_verified?: boolean

  /**
   * The user's locale, represented as a BCP 47 language tag.
   * Example: "en-US" or "fr-CA".
   */
  locale?: string

  /**
   * The hosted G Suite domain of the user. Provided only if the user
   * belongs to a G Suite domain and the 'hd' parameter was included
   * in the authorization request.
   */
  hd?: string
}
