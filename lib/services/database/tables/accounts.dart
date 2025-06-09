// Package imports:
import 'package:drift/drift.dart';

@DataClassName('Account')
class Accounts extends Table {
  // Primary key
  IntColumn get id => integer().autoIncrement()();
  
  // Basic AT Protocol identifiers
  TextColumn get did => text().withLength(min: 1, max: 500)();
  TextColumn get handle => text().withLength(min: 1, max: 253)();
  
  // Profile information
  TextColumn get displayName => text().nullable()();
  TextColumn get description => text().nullable()();
  TextColumn get avatar => text().nullable()();
  TextColumn get banner => text().nullable()();
  TextColumn get email => text().nullable()();
  
  // OAuth/Session information
  TextColumn get accessJwt => text().nullable()();
  TextColumn get refreshJwt => text().nullable()();
  TextColumn get sessionString => text().nullable()(); // For app password compatibility
  
  // OAuth DPoP specific fields
  TextColumn get dpopPublicKey => text().nullable()();
  TextColumn get dpopPrivateKey => text().nullable()(); // Encrypted/secured
  TextColumn get dpopNonce => text().nullable()();
  TextColumn get tokenType => text().withDefault(const Constant('DPoP'))();
  TextColumn get scope => text().nullable()();
  
  // Server/Service information  
  TextColumn get pdsUrl => text().withLength(min: 1, max: 2048)();
  TextColumn get serviceUrl => text().withDefault(const Constant('https://bsky.social'))();
  
  // Authentication method and status
  TextColumn get loginMethod => text().withDefault(const Constant('oauth'))(); // 'oauth' or 'app_password'
  DateTimeColumn get tokenExpiry => dateTime().nullable()();
  BoolColumn get isVerified => boolean().withDefault(const Constant(false))();
  TextColumn get accountStatus => text().withDefault(const Constant('active'))(); // 'active', 'suspended', 'limited'
  
  // Multi-account management
  BoolColumn get isActive => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastUsed => dateTime().nullable()();
  IntColumn get accountOrder => integer().withDefault(const Constant(0))();
  TextColumn get accountLabel => text().nullable()(); // User-defined label
  
  // User preferences and settings (JSON format)
  TextColumn get preferences => text().nullable()();
  TextColumn get notificationSettings => text().nullable()();
  
  // Sync and offline support
  DateTimeColumn get lastSyncTime => dateTime().nullable()();
  BoolColumn get syncEnabled => boolean().withDefault(const Constant(true))();
  BoolColumn get offlineMode => boolean().withDefault(const Constant(false))();
  
  // Terms and privacy
  TextColumn get inviteCode => text().nullable()();
  DateTimeColumn get termsAccepted => dateTime().nullable()();
  DateTimeColumn get privacyAccepted => dateTime().nullable()();
  
  // Timestamps
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  
  @override
  List<Set<Column>> get uniqueKeys => [
    {did}, // DID must be unique
    {handle}, // Handle must be unique
  ];
}

// TODO: Extension for additional functionality (uncomment when Drift code generation is fixed)
// extension AccountExtensions on Account {
//   // Check if OAuth session is valid
//   bool get hasValidOAuthSession {
//     return accessJwt != null && 
//            refreshJwt != null && 
//            dpopPrivateKey != null &&
//            (tokenExpiry == null || tokenExpiry!.isAfter(DateTime.now()));
//   }
//   
//   // Check if access token needs refresh (expires within 5 minutes)
//   bool get needsTokenRefresh {
//     if (tokenExpiry == null) return false;
//     return tokenExpiry!.isBefore(DateTime.now().add(const Duration(minutes: 5)));
//   }
//   
//   // Check if account uses OAuth
//   bool get isOAuthAccount => loginMethod == 'oauth';
//   
//   // Check if account uses app password
//   bool get isAppPasswordAccount => loginMethod == 'app_password';
//   
//   // Get display identifier (displayName or handle)
//   String get displayIdentifier => displayName?.isNotEmpty == true ? displayName! : handle;
// }
