import { execFile } from "node:child_process";
import os from "node:os";

const platform = os.platform();

export interface NotifyOptions {
  title: string;
  body: string;
  subtitle?: string;
}

/**
 * Send a native OS notification. Fails silently if the notification tool is unavailable.
 */
export function sendNotification(opts: NotifyOptions): void {
  switch (platform) {
    case "darwin":
      notifyMacOS(opts);
      break;
    case "linux":
      notifyLinux(opts);
      break;
    case "win32":
      notifyWindows(opts);
      break;
    default:
      // Unsupported platform — silently skip
      break;
  }
}

function notifyMacOS({ title, body, subtitle }: NotifyOptions) {
  // Use osascript — available on all macOS without extra installs
  let script = `display notification ${escapeAppleScript(body)} with title ${escapeAppleScript(title)}`;
  if (subtitle) {
    script += ` subtitle ${escapeAppleScript(subtitle)}`;
  }
  execFile("osascript", ["-e", script], silentCallback);
}

function notifyLinux({ title, body }: NotifyOptions) {
  // notify-send from libnotify — available on most Linux desktops
  execFile("notify-send", [title, body, "--app-name=icqq"], silentCallback);
}

function notifyWindows({ title, body }: NotifyOptions) {
  // PowerShell toast notification — works on Windows 10+
  const ps = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null
    $xml = @"
    <toast>
      <visual>
        <binding template="ToastText02">
          <text id="1">${escapeXml(title)}</text>
          <text id="2">${escapeXml(body)}</text>
        </binding>
      </visual>
    </toast>
"@
    $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
    $doc.LoadXml($xml)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($doc)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("icqq").Show($toast)
  `.trim();
  execFile("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], silentCallback);
}

function escapeAppleScript(str: string): string {
  return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function silentCallback(err: Error | null) {
  if (err) {
    // Notification failed — not critical, just log to daemon output
    console.error(`[notify] ${err.message}`);
  }
}
