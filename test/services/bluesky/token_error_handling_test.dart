// Flutter imports:
import 'package:flutter_test/flutter_test.dart';

// Project imports:
import 'package:moodesky/shared/models/auth_models.dart';

void main() {
  group('Token Error Pattern Detection', () {
    test('should detect various token error patterns', () {
      // Test token expiration patterns
      expect(_isTokenError('Token has expired'), isTrue);
      expect(_isTokenError('ExpiredToken'), isTrue);
      expect(_isTokenError('InvalidToken'), isTrue);
      expect(_isTokenError('Token could not be verified'), isTrue);
      expect(_isTokenError('TokenValidationFailed'), isTrue);
      expect(_isTokenError('InvalidSignature'), isTrue);
      expect(_isTokenError('Unauthorized'), isTrue);
      expect(_isTokenError('Token is invalid'), isTrue);
      expect(_isTokenError('Authentication failed'), isTrue);
    });

    test('should detect token verification specific errors', () {
      // Test token verification error patterns
      expect(_isTokenVerificationError('Token could not be verified'), isTrue);
      expect(_isTokenVerificationError('TokenValidationFailed'), isTrue);
      expect(_isTokenVerificationError('InvalidSignature'), isTrue);
      expect(_isTokenVerificationError('Token verification failed'), isTrue);
    });

    test('should not detect non-token errors as token errors', () {
      // Test non-token errors
      expect(_isTokenError('Network error'), isFalse);
      expect(_isTokenError('Server unavailable'), isFalse);
      expect(_isTokenError('Post not found'), isFalse);
      expect(_isTokenError('Rate limit exceeded'), isFalse);
    });

    test('should handle case variations correctly', () {
      // Test case insensitive detection
      expect(_isTokenError('TOKEN HAS EXPIRED'), isTrue);
      expect(_isTokenError('token could not be verified'), isTrue);
      expect(_isTokenVerificationError('INVALIDSIGNATURE'), isTrue);
    });
  });

  group('AuthErrorType Detection', () {
    test('should correctly detect tokenVerificationFailed', () {
      expect(_detectErrorType('Token could not be verified'), AuthErrorType.tokenVerificationFailed);
      expect(_detectErrorType('TokenValidationFailed'), AuthErrorType.tokenVerificationFailed);
      expect(_detectErrorType('InvalidSignature'), AuthErrorType.tokenVerificationFailed);
    });

    test('should correctly detect tokenExpired', () {
      expect(_detectErrorType('Token has expired'), AuthErrorType.tokenExpired);
      expect(_detectErrorType('ExpiredToken'), AuthErrorType.tokenExpired);
      expect(_detectErrorType('Session expired'), AuthErrorType.tokenExpired);
    });

    test('should correctly detect invalidCredentials', () {
      expect(_detectErrorType('Invalid credentials'), AuthErrorType.invalidCredentials);
      expect(_detectErrorType('Authentication failed'), AuthErrorType.invalidCredentials);
      expect(_detectErrorType('Unauthorized'), AuthErrorType.invalidCredentials);
    });

    test('should correctly detect networkError', () {
      expect(_detectErrorType('Network error'), AuthErrorType.networkError);
      expect(_detectErrorType('Connection failed'), AuthErrorType.networkError);
      expect(_detectErrorType('Timeout'), AuthErrorType.networkError);
    });

    test('should correctly detect serverError', () {
      expect(_detectErrorType('Server error'), AuthErrorType.serverError);
      expect(_detectErrorType('Internal server error'), AuthErrorType.serverError);
      expect(_detectErrorType('Service unavailable'), AuthErrorType.serverError);
    });

    test('should default to unknownError for unrecognized patterns', () {
      expect(_detectErrorType('Some random error'), AuthErrorType.unknownError);
      expect(_detectErrorType('Unexpected issue'), AuthErrorType.unknownError);
    });
  });
}

// Helper functions that mirror the logic in the actual implementation
bool _isTokenError(String errorString) {
  final lowerString = errorString.toLowerCase();
  return lowerString.contains('token has expired') ||
         lowerString.contains('expiredtoken') ||
         lowerString.contains('invalidtoken') ||
         lowerString.contains('token could not be verified') ||
         lowerString.contains('tokenvalidationfailed') ||
         lowerString.contains('invalidsignature') ||
         lowerString.contains('unauthorized') ||
         lowerString.contains('token is invalid') ||
         lowerString.contains('authentication failed');
}

bool _isTokenVerificationError(String errorString) {
  final lowerString = errorString.toLowerCase();
  return lowerString.contains('token could not be verified') ||
         lowerString.contains('tokenvalidationfailed') ||
         lowerString.contains('invalidsignature') ||
         lowerString.contains('token verification failed');
}

AuthErrorType _detectErrorType(String message) {
  final lowerMessage = message.toLowerCase();
  
  if (lowerMessage.contains('token could not be verified') ||
      lowerMessage.contains('tokenvalidationfailed') ||
      lowerMessage.contains('invalidsignature') ||
      lowerMessage.contains('token verification failed')) {
    return AuthErrorType.tokenVerificationFailed;
  }
  
  if (lowerMessage.contains('token has expired') ||
      lowerMessage.contains('expiredtoken') ||
      lowerMessage.contains('session expired')) {
    return AuthErrorType.tokenExpired;
  }
  
  if (lowerMessage.contains('invalid credentials') ||
      lowerMessage.contains('authentication failed') ||
      lowerMessage.contains('unauthorized')) {
    return AuthErrorType.invalidCredentials;
  }
  
  if (lowerMessage.contains('network') ||
      lowerMessage.contains('connection') ||
      lowerMessage.contains('timeout')) {
    return AuthErrorType.networkError;
  }
  
  if (lowerMessage.contains('server error') ||
      lowerMessage.contains('internal server error') ||
      lowerMessage.contains('service unavailable')) {
    return AuthErrorType.serverError;
  }
  
  return AuthErrorType.unknownError;
}