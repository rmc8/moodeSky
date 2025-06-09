// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/shared/models/auth_models.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _useOAuth = true; // Toggle between OAuth and App Password

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      if (_useOAuth) {
        // OAuth sign in
        await ref.read(authNotifierProvider.notifier).signInWithOAuth(
          userIdentifier: _identifierController.text.trim(),
        );
      } else {
        // App password sign in
        await ref.read(authNotifierProvider.notifier).signInWithAppPassword(
          identifier: _identifierController.text.trim(),
          password: _passwordController.text,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    
    // Show loading if auth is in progress
    if (authState is AuthLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Logo
                    Container(
                      height: 80,
                      margin: const EdgeInsets.only(bottom: 32),
                      child: Center(
                        child: Text(
                          'MoodeSky',
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ),
                    ),
                    
                    // Auth method toggle
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Sign in method',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            SegmentedButton<bool>(
                              segments: const [
                                ButtonSegment(
                                  value: true,
                                  label: Text('OAuth'),
                                  icon: Icon(Icons.security),
                                ),
                                ButtonSegment(
                                  value: false,
                                  label: Text('App Password'),
                                  icon: Icon(Icons.key),
                                ),
                              ],
                              selected: {_useOAuth},
                              onSelectionChanged: (selection) {
                                setState(() {
                                  _useOAuth = selection.first;
                                  _passwordController.clear();
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    
                    // Identifier field
                    TextFormField(
                      controller: _identifierController,
                      decoration: InputDecoration(
                        labelText: _useOAuth ? 'Handle or email' : 'Handle or email',
                        hintText: _useOAuth ? 'user.bsky.social' : 'user.bsky.social',
                        prefixIcon: const Icon(Icons.person),
                        border: const OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: _useOAuth ? TextInputAction.done : TextInputAction.next,
                      validator: (value) {
                        if (value?.trim().isEmpty ?? true) {
                          return 'Please enter your handle or email';
                        }
                        return null;
                      },
                    ),
                    
                    // Password field (only for app password)
                    if (!_useOAuth) ...[
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        decoration: InputDecoration(
                          labelText: 'App Password',
                          hintText: 'Enter your app password',
                          prefixIcon: const Icon(Icons.lock),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                            onPressed: () {
                              setState(() => _obscurePassword = !_obscurePassword);
                            },
                          ),
                          border: const OutlineInputBorder(),
                        ),
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        validator: (value) {
                          if (value?.trim().isEmpty ?? true) {
                            return 'Please enter your app password';
                          }
                          return null;
                        },
                      ),
                    ],
                    
                    const SizedBox(height: 24),
                    
                    // Sign in button
                    FilledButton(
                      onPressed: _isLoading ? null : _signIn,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(_useOAuth ? 'Sign in with OAuth' : 'Sign in'),
                      ),
                    ),
                    
                    // Error display
                    if (authState is AuthError) ...[
                      const SizedBox(height: 16),
                      Card(
                        color: Theme.of(context).colorScheme.errorContainer,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Icon(
                                Icons.error_outline,
                                color: Theme.of(context).colorScheme.onErrorContainer,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  authState.message,
                                  style: TextStyle(
                                    color: Theme.of(context).colorScheme.onErrorContainer,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    
                    const SizedBox(height: 32),
                    
                    // Help text
                    Text(
                      _useOAuth
                          ? 'OAuth is the recommended sign-in method for better security.'
                          : 'App passwords can be created in your Bluesky settings.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
