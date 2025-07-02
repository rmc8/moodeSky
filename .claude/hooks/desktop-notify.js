#!/usr/bin/env node

/**
 * Claude Code Hooks - Desktop Notification Script
 * 処理完了時のデスクトップ通知
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Claude Code conversation logsの場所を推定
const homeDir = process.env.HOME;
const conversationLogsDir = path.join(homeDir, '.claude', 'logs');

function getLatestConversationMessage() {
  try {
    // 最新のログファイルを取得
    const logFiles = fs.readdirSync(conversationLogsDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(conversationLogsDir, a));
        const statB = fs.statSync(path.join(conversationLogsDir, b));
        return statB.mtime - statA.mtime;
      });

    if (logFiles.length === 0) {
      return 'Claude Code task completed';
    }

    const latestLogFile = path.join(conversationLogsDir, logFiles[0]);
    const logContent = JSON.parse(fs.readFileSync(latestLogFile, 'utf8'));
    
    // 最後のメッセージを取得
    const messages = logContent.messages || [];
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.content) {
      // メッセージを短縮（通知用）
      const content = Array.isArray(lastMessage.content) 
        ? lastMessage.content.map(c => c.text || c).join(' ')
        : lastMessage.content;
      
      return content.length > 100 
        ? content.substring(0, 100) + '...'
        : content;
    }
    
    return 'Claude Code task completed';
  } catch (error) {
    console.error('Failed to read conversation logs:', error.message);
    return 'Claude Code task completed';
  }
}

function sendDesktopNotification(message) {
  try {
    const platform = process.platform;
    
    if (platform === 'darwin') {
      // macOS - osascript使用
      const escapedMessage = message.replace(/"/g, '\\"').replace(/'/g, "\\'");
      const title = 'Claude Code';
      
      const script = `
        display notification "${escapedMessage}" with title "${title}"
      `;
      
      execSync(`osascript -e '${script}'`);
      console.log('✅ Desktop notification sent (macOS)');
      
    } else if (platform === 'linux') {
      // Linux - notify-send使用
      execSync(`notify-send "Claude Code" "${message}"`);
      console.log('✅ Desktop notification sent (Linux)');
      
    } else if (platform === 'win32') {
      // Windows - PowerShell使用
      const powershellScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::Information
        $notify.Visible = $true
        $notify.ShowBalloonTip(3000, "Claude Code", "${message}", [System.Windows.Forms.ToolTipIcon]::Info)
      `;
      
      execSync(`powershell -Command "${powershellScript}"`);
      console.log('✅ Desktop notification sent (Windows)');
      
    } else {
      console.log('🟡 Desktop notifications not supported on this platform');
    }
    
  } catch (error) {
    console.error('❌ Failed to send desktop notification:', error.message);
  }
}

function main() {
  console.log('🔔 Sending desktop notification...');
  
  const message = getLatestConversationMessage();
  sendDesktopNotification(message);
}

if (require.main === module) {
  main();
}

module.exports = { sendDesktopNotification, getLatestConversationMessage };