// Package imports:
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';

// Project imports:
import 'connection_io.dart' as impl;

DatabaseConnection openConnection() {
  return impl.openIOConnection();
}