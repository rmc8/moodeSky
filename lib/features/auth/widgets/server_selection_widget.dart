// Package imports:
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

// Project imports:
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/features/auth/services/server_discovery_service.dart';

class ServerSelectionWidget extends ConsumerStatefulWidget {
  final Function(ServerConfig) onServerSelected;
  final ServerConfig? initialServer;

  const ServerSelectionWidget({
    super.key,
    required this.onServerSelected,
    this.initialServer,
  });

  @override
  ConsumerState<ServerSelectionWidget> createState() =>
      _ServerSelectionWidgetState();
}

class _ServerSelectionWidgetState extends ConsumerState<ServerSelectionWidget> {
  ServerConfig? _selectedServer;
  final List<ServerConfig> _recentServers = [];
  bool _showCustomInput = false;
  final _customUrlController = TextEditingController();
  ServerConfig? _validatedCustomServer;
  bool _isValidating = false;

  @override
  void initState() {
    super.initState();
    _selectedServer = widget.initialServer ?? ServerPresets.blueskyOfficial;
    _loadRecentServers();
  }

  @override
  void dispose() {
    _customUrlController.dispose();
    super.dispose();
  }

  void _loadRecentServers() {
    // TODO: Load from SharedPreferences
    // For now, add some sample recent servers
  }

  void _saveRecentServer(ServerConfig server) {
    if (!server.isOfficial &&
        !_recentServers.any((s) => s.serviceUrl == server.serviceUrl)) {
      setState(() {
        _recentServers.insert(0, server);
        if (_recentServers.length > 5) {
          _recentServers.removeLast();
        }
      });
      // TODO: Save to SharedPreferences
    }
  }

  Future<void> _validateCustomServer(String url) async {
    if (url.isEmpty) {
      setState(() {
        _validatedCustomServer = null;
        _isValidating = false;
      });
      return;
    }

    setState(() {
      _isValidating = true;
    });

    try {
      final discoveredServer = await ServerDiscoveryService.discoverServer(url);
      final validatedServer = await ServerDiscoveryService.validateServer(
        discoveredServer,
      );

      setState(() {
        _validatedCustomServer = validatedServer;
        _isValidating = false;
      });
    } catch (e) {
      setState(() {
        _validatedCustomServer = ServerPresets.customServer(
          serviceUrl: url,
          displayName: 'Custom Server',
        ).copyWith(status: ServerStatus.error);
        _isValidating = false;
      });
    }
  }

  void _selectServer(ServerConfig server) {
    setState(() {
      _selectedServer = server;
      _showCustomInput = false;
    });
    _saveRecentServer(server);
    widget.onServerSelected(server);
  }

  void _showCustomServerDialog() {
    showDialog(
      context: context,
      builder: (context) => CustomServerDialog(
        onServerAdded: (server) {
          _selectServer(server);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.dns, color: Theme.of(context).primaryColor),
                const SizedBox(width: 8),
                Text(
                  'Server Selection',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Predefined servers dropdown
            DropdownButtonFormField<ServerConfig>(
              value: _selectedServer,
              decoration: const InputDecoration(
                labelText: 'Choose Server',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.cloud),
              ),
              items: [
                // Official servers
                ...ServerPresets.predefinedServers.map(
                  (server) => DropdownMenuItem(
                    value: server,
                    child: ServerListItem(server: server, showStatus: true),
                  ),
                ),

                // Recent servers
                if (_recentServers.isNotEmpty) ...[
                  const DropdownMenuItem<ServerConfig>(
                    enabled: false,
                    value: null,
                    child: Divider(),
                  ),
                  ..._recentServers.map(
                    (server) => DropdownMenuItem(
                      value: server,
                      child: ServerListItem(
                        server: server,
                        showStatus: true,
                        isRecent: true,
                      ),
                    ),
                  ),
                ],

                // Custom server option
                const DropdownMenuItem<ServerConfig>(
                  enabled: false,
                  value: null,
                  child: Divider(),
                ),
                const DropdownMenuItem<ServerConfig>(
                  value: null,
                  child: ListTile(
                    leading: Icon(Icons.add),
                    title: Text('Custom Server...'),
                    dense: true,
                  ),
                ),
              ],
              onChanged: (server) {
                if (server != null) {
                  _selectServer(server);
                } else {
                  _showCustomServerDialog();
                }
              },
            ),

            // Server status and info
            if (_selectedServer != null) ...[
              const SizedBox(height: 12),
              ServerStatusCard(server: _selectedServer!),
            ],
          ],
        ),
      ),
    );
  }
}

class ServerListItem extends StatelessWidget {
  final ServerConfig server;
  final bool showStatus;
  final bool isRecent;

  const ServerListItem({
    super.key,
    required this.server,
    this.showStatus = false,
    this.isRecent = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Server icon or fallback
        if (server.icon != null)
          CircleAvatar(
            radius: 12,
            backgroundImage: NetworkImage(server.icon!),
            onBackgroundImageError: (_, __) {},
            child: server.icon == null
                ? Icon(server.isOfficial ? Icons.verified : Icons.dns, size: 12)
                : null,
          )
        else
          CircleAvatar(
            radius: 12,
            child: Icon(
              server.isOfficial ? Icons.verified : Icons.dns,
              size: 12,
            ),
          ),

        const SizedBox(width: 8),

        // Server name and URL
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      server.displayName,
                      style: TextStyle(
                        fontWeight: server.isOfficial
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (server.isOfficial) ...[
                    const SizedBox(width: 4),
                    Icon(Icons.verified, size: 14, color: Colors.blue),
                  ],
                  if (isRecent) ...[
                    const SizedBox(width: 4),
                    Icon(Icons.history, size: 14, color: Colors.grey),
                  ],
                ],
              ),
              Text(
                Uri.parse(server.serviceUrl).host,
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),

        // Status indicator
        if (showStatus) ...[
          const SizedBox(width: 4),
          ServerStatusIndicator(status: server.status),
        ],
      ],
    );
  }
}

class ServerStatusCard extends StatelessWidget {
  final ServerConfig server;

  const ServerStatusCard({super.key, required this.server});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Server info header
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      server.displayName,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (server.description != null)
                      Text(
                        server.description!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                  ],
                ),
              ),
              ServerStatusIndicator(status: server.status),
            ],
          ),

          const SizedBox(height: 8),

          // Server capabilities
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              if (server.supportsOAuth)
                _buildCapabilityChip(
                  context,
                  Icons.security,
                  'OAuth',
                  Colors.green,
                ),
              if (server.supportsAppPasswords)
                _buildCapabilityChip(
                  context,
                  Icons.password,
                  'App Password',
                  Colors.blue,
                ),
              if (server.supportsChat)
                _buildCapabilityChip(
                  context,
                  Icons.chat,
                  'Chat',
                  Colors.orange,
                ),
              if (server.supportsNotifications)
                _buildCapabilityChip(
                  context,
                  Icons.notifications,
                  'Notifications',
                  Colors.purple,
                ),
            ],
          ),

          // Latency info
          if (server.latencyMs != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.speed, size: 14, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  '${server.latencyMs}ms',
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCapabilityChip(
    BuildContext context,
    IconData icon,
    String label,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class ServerStatusIndicator extends StatelessWidget {
  final ServerStatus status;

  const ServerStatusIndicator({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    IconData icon;

    switch (status) {
      case ServerStatus.online:
        color = Colors.green;
        icon = Icons.check_circle;
        break;
      case ServerStatus.offline:
        color = Colors.red;
        icon = Icons.error;
        break;
      case ServerStatus.error:
        color = Colors.orange;
        icon = Icons.warning;
        break;
      case ServerStatus.checking:
        color = Colors.blue;
        icon = Icons.sync;
        break;
      case ServerStatus.unknown:
        color = Colors.grey;
        icon = Icons.help;
        break;
    }

    return Tooltip(
      message: status.name.toUpperCase(),
      child: Icon(icon, size: 16, color: color),
    );
  }
}

class CustomServerDialog extends StatefulWidget {
  final Function(ServerConfig) onServerAdded;

  const CustomServerDialog({super.key, required this.onServerAdded});

  @override
  State<CustomServerDialog> createState() => _CustomServerDialogState();
}

class _CustomServerDialogState extends State<CustomServerDialog> {
  final _urlController = TextEditingController();
  final _nameController = TextEditingController();
  ServerConfig? _validatedServer;
  bool _isValidating = false;
  bool _allowSelfSigned = false;
  int _timeout = 30;

  @override
  void dispose() {
    _urlController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _validateUrl() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) {
      setState(() {
        _validatedServer = null;
      });
      return;
    }

    setState(() {
      _isValidating = true;
    });

    try {
      final discoveredServer = await ServerDiscoveryService.discoverServer(url);
      final validatedServer = await ServerDiscoveryService.validateServer(
        discoveredServer.copyWith(
          allowSelfSigned: _allowSelfSigned,
          timeoutSeconds: _timeout,
        ),
      );

      setState(() {
        _validatedServer = validatedServer;
        _nameController.text = validatedServer.displayName;
        _isValidating = false;
      });
    } catch (e) {
      setState(() {
        _validatedServer =
            ServerPresets.customServer(
              serviceUrl: url,
              displayName: _nameController.text.trim().isEmpty
                  ? 'Custom Server'
                  : _nameController.text.trim(),
            ).copyWith(
              status: ServerStatus.error,
              allowSelfSigned: _allowSelfSigned,
              timeoutSeconds: _timeout,
            );
        _isValidating = false;
      });
    }
  }

  void _addServer() {
    if (_validatedServer != null) {
      final finalServer = _validatedServer!.copyWith(
        displayName: _nameController.text.trim().isEmpty
            ? _validatedServer!.displayName
            : _nameController.text.trim(),
      );
      widget.onServerAdded(finalServer);
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.add),
          SizedBox(width: 8),
          Text('Add Custom Server'),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // URL input
            TextField(
              controller: _urlController,
              decoration: const InputDecoration(
                labelText: 'Server URL',
                hintText: 'https://your-server.com',
                prefixIcon: Icon(Icons.link),
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => _validateUrl(),
            ),

            const SizedBox(height: 16),

            // Server name input
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Display Name (Optional)',
                hintText: 'My Custom Server',
                prefixIcon: Icon(Icons.label),
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 16),

            // Validation status
            if (_isValidating)
              const Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    SizedBox(width: 8),
                    Text('Validating server...'),
                  ],
                ),
              )
            else if (_validatedServer != null)
              ServerValidationResult(server: _validatedServer!),

            const SizedBox(height: 16),

            // Advanced options
            ExpansionTile(
              title: const Text('Advanced Options'),
              children: [
                CheckboxListTile(
                  title: const Text('Allow self-signed certificates'),
                  subtitle: const Text(
                    '⚠️ Less secure, use only for development',
                  ),
                  value: _allowSelfSigned,
                  onChanged: (value) {
                    setState(() {
                      _allowSelfSigned = value ?? false;
                    });
                    _validateUrl();
                  },
                ),

                ListTile(
                  title: const Text('Request timeout'),
                  subtitle: Slider(
                    value: _timeout.toDouble(),
                    min: 5,
                    max: 60,
                    divisions: 11,
                    label: '${_timeout}s',
                    onChanged: (value) {
                      setState(() {
                        _timeout = value.round();
                      });
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _validatedServer?.isHealthy == true ? _addServer : null,
          child: const Text('Add Server'),
        ),
      ],
    );
  }
}

class ServerValidationResult extends StatelessWidget {
  final ServerConfig server;

  const ServerValidationResult({super.key, required this.server});

  @override
  Widget build(BuildContext context) {
    final isHealthy = server.isHealthy;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (isHealthy ? Colors.green : Colors.red).withOpacity(0.1),
        border: Border.all(
          color: (isHealthy ? Colors.green : Colors.red).withOpacity(0.3),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isHealthy ? Icons.check_circle : Icons.error,
                color: isHealthy ? Colors.green : Colors.red,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isHealthy
                      ? 'Server validation successful!'
                      : 'Server validation failed',
                  style: TextStyle(
                    color: isHealthy ? Colors.green : Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          if (isHealthy) ...[
            const SizedBox(height: 8),
            Text('Protocol: ${server.protocolVersion}'),
            if (server.latencyMs != null)
              Text('Latency: ${server.latencyMs}ms'),

            const SizedBox(height: 4),
            Text(
              'Supports: ${[if (server.supportsOAuth) 'OAuth', if (server.supportsAppPasswords) 'App Passwords'].join(', ')}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}
