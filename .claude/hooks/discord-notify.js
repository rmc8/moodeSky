#!/usr/bin/env node

/**
 * Claude Code Hooks - Discord Webhook Notification Script
 * Discord Webhook経由での処理完了通知
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Discord Webhook URLを設定ファイルから取得
function getWebhookUrl() {
  try {
    const settingsPath = path.join(__dirname, '..', 'settings.local.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return settings.discordWebhookUrl;
  } catch (error) {
    console.error('Failed to read Discord webhook URL from settings:', error.message);
    return null;
  }
}

function getSystemInfo() {
  const os = require('os');
  return {
    platform: os.platform(),
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
    user: os.userInfo().username
  };
}

function sendDiscordNotification(webhookUrl, message, systemInfo) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    
    const embed = {
      title: "🤖 Claude Code Task Completed",
      description: message,
      color: 0x00ff00, // Green
      fields: [
        {
          name: "Platform",
          value: systemInfo.platform,
          inline: true
        },
        {
          name: "Hostname", 
          value: systemInfo.hostname,
          inline: true
        },
        {
          name: "User",
          value: systemInfo.user,
          inline: true
        }
      ],
      timestamp: systemInfo.timestamp,
      footer: {
        text: "Claude Code Hooks"
      }
    };

    const payload = JSON.stringify({
      embeds: [embed]
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Discord notification sent successfully');
          resolve(data);
        } else {
          console.error(`❌ Discord webhook failed with status ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Discord webhook request failed:', error.message);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

function getLatestConversationMessage() {
  try {
    const homeDir = process.env.HOME;
    const conversationLogsDir = path.join(homeDir, '.claude', 'logs');
    
    if (!fs.existsSync(conversationLogsDir)) {
      return 'Claude Code task completed (no logs found)';
    }

    const logFiles = fs.readdirSync(conversationLogsDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(conversationLogsDir, a));
        const statB = fs.statSync(path.join(conversationLogsDir, b));
        return statB.mtime - statA.mtime;
      });

    if (logFiles.length === 0) {
      return 'Claude Code task completed (no conversation logs)';
    }

    const latestLogFile = path.join(conversationLogsDir, logFiles[0]);
    const logContent = JSON.parse(fs.readFileSync(latestLogFile, 'utf8'));
    
    const messages = logContent.messages || [];
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.content) {
      const content = Array.isArray(lastMessage.content) 
        ? lastMessage.content.map(c => c.text || c).join(' ')
        : lastMessage.content;
      
      return content.length > 500 
        ? content.substring(0, 500) + '...'
        : content;
    }
    
    return 'Claude Code task completed';
  } catch (error) {
    console.error('Failed to read conversation logs:', error.message);
    return 'Claude Code task completed (error reading logs)';
  }
}

async function main() {
  console.log('🔔 Checking Discord webhook configuration...');
  
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.log('🟡 Discord webhook URL not configured in settings.local.json');
    console.log('💡 Add "discordWebhookUrl": "your-webhook-url" to enable Discord notifications');
    return;
  }

  const message = getLatestConversationMessage();
  const systemInfo = getSystemInfo();
  
  try {
    await sendDiscordNotification(webhookUrl, message, systemInfo);
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { sendDiscordNotification, getLatestConversationMessage };