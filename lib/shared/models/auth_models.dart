// Package imports:
import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_models.freezed.dart';
part 'auth_models.g.dart';

// OAuth Session data model
@freezed
class OAuthSessionData with _$OAuthSessionData {
  const factory OAuthSessionData({
    required String accessToken,
    required String refreshToken,
    required String dpopPublicKey,
    required String dpopPrivateKey,
    required String dpopNonce,
    required String tokenType,
    required DateTime expiresAt,
    required String sub, // Subject (user DID)
    String? scope,
  }) = _OAuthSessionData;

  factory OAuthSessionData.fromJson(Map<String, dynamic> json) =>
      _$OAuthSessionDataFromJson(json);
}

// App Password session data model
@freezed
class AppPasswordSessionData with _$AppPasswordSessionData {
  const factory AppPasswordSessionData({
    required String accessJwt,
    required String refreshJwt,
    required String did,
    required String handle,
    String? email,
    String? sessionString,
  }) = _AppPasswordSessionData;

  factory AppPasswordSessionData.fromJson(Map<String, dynamic> json) =>
      _$AppPasswordSessionDataFromJson(json);
}

// Authentication result
@freezed
class AuthResult with _$AuthResult {
  const factory AuthResult.success({
    required AuthSessionData session,
    required String accountDid,
  }) = AuthSuccess;
  
  const factory AuthResult.failure({
    required String error,
    String? errorDescription,
    AuthErrorType? errorType,
  }) = AuthFailure;
  
  const factory AuthResult.cancelled() = AuthCancelled;
}

// Combined session data
@freezed
class AuthSessionData with _$AuthSessionData {
  const factory AuthSessionData.oauth({
    required OAuthSessionData oauthSession,
    required UserProfile profile,
  }) = OAuthSession;
  
  const factory AuthSessionData.appPassword({
    required AppPasswordSessionData appPasswordSession,
    required UserProfile profile,
  }) = AppPasswordSession;
}

// User profile data
@freezed
class UserProfile with _$UserProfile {
  const factory UserProfile({
    required String did,
    required String handle,
    String? displayName,
    String? description,
    String? avatar,
    String? banner,
    String? email,
    bool? isVerified,
    int? followersCount,
    int? followsCount,
    int? postsCount,
    DateTime? createdAt,
  }) = _UserProfile;

  factory UserProfile.fromJson(Map<String, dynamic> json) =>
      _$UserProfileFromJson(json);
}

// Authentication error types
enum AuthErrorType {
  networkError,
  invalidCredentials,
  tokenExpired,
  serverError,
  userCancelled,
  unknownError,
  dpopError,
  refreshError,
}

// Authentication state
@freezed
class AuthState with _$AuthState {
  const factory AuthState.initial() = AuthInitial;
  const factory AuthState.loading() = AuthLoading;
  const factory AuthState.authenticated({
    required String activeAccountDid,
    required List<UserProfile> accounts,
  }) = AuthAuthenticated;
  const factory AuthState.unauthenticated() = AuthUnauthenticated;
  const factory AuthState.error({
    required String message,
    AuthErrorType? errorType,
  }) = AuthError;
}

// Account switching request
@freezed
class AccountSwitchRequest with _$AccountSwitchRequest {
  const factory AccountSwitchRequest({
    required String targetAccountDid,
    bool? maintainCurrentState,
  }) = _AccountSwitchRequest;
}

// Multi-account status
@freezed
class MultiAccountStatus with _$MultiAccountStatus {
  const factory MultiAccountStatus({
    required String activeAccountDid,
    required List<String> availableAccountDids,
    required int totalAccounts,
    required Map<String, UserProfile> accountProfiles,
    required Map<String, bool> accountTokenStatus, // true if token is valid
  }) = _MultiAccountStatus;

  factory MultiAccountStatus.fromJson(Map<String, dynamic> json) =>
      _$MultiAccountStatusFromJson(json);
}

// Authentication configuration
@freezed
class AuthConfig with _$AuthConfig {
  const factory AuthConfig({
    required String clientMetadataUrl,
    required String callbackUrlScheme,
    required String defaultPdsHost,
    @Default(Duration(minutes: 5)) Duration tokenRefreshThreshold,
    @Default(true) bool enableAutoRefresh,
    @Default(true) bool enableSecureStorage,
  }) = _AuthConfig;

  factory AuthConfig.fromJson(Map<String, dynamic> json) =>
      _$AuthConfigFromJson(json);
}

// Login request
@freezed
class LoginRequest with _$LoginRequest {
  const factory LoginRequest.oauth({
    String? userIdentifier,
    String? pdsHost,
  }) = OAuthLoginRequest;
  
  const factory LoginRequest.appPassword({
    required String identifier,
    required String password,
    String? pdsHost,
  }) = AppPasswordLoginRequest;
}

// Token refresh result
@freezed
class TokenRefreshResult with _$TokenRefreshResult {
  const factory TokenRefreshResult.success({
    required OAuthSessionData newSession,
  }) = TokenRefreshSuccess;
  
  const factory TokenRefreshResult.failure({
    required String error,
    required bool requiresReauth,
  }) = TokenRefreshFailure;
}
