# Focusr Desktop Bridge Foreground Window Poller
$ErrorActionPreference = 'SilentlyContinue'

$sig = @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinApiHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
'@

$hasWinApi = $false
try {
    Add-Type -TypeDefinition $sig -Language CSharp -ErrorAction Stop | Out-Null
    $hasWinApi = $true
} catch {
    $hasWinApi = $false
}

$lastPid = -1
$lastTitle = ""
$lastProcName = ""

while ($true) {
    try {
        $found = $false

        if ($hasWinApi) {
            $hwnd = [WinApiHelper]::GetForegroundWindow()
            if ($hwnd -and $hwnd -ne [IntPtr]::Zero) {
                $pidOut = 0
                [WinApiHelper]::GetWindowThreadProcessId($hwnd, [ref]$pidOut) | Out-Null
                if ($pidOut -gt 0) {
                    $sb = New-Object System.Text.StringBuilder 512
                    [WinApiHelper]::GetWindowText($hwnd, $sb, 512) | Out-Null
                    $title = $sb.ToString()
                    
                    $proc = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
                    if ($proc) {
                        $pName = $proc.ProcessName + ".exe"
                        if ($pidOut -ne $lastPid -or $title -ne $lastTitle -or $pName -ne $lastProcName) {
                            $obj = @{
                                type = "ACTIVE_WINDOW"
                                processName = $pName
                                windowTitle = $title
                                pid = $pidOut
                            }
                            [Console]::WriteLine((ConvertTo-Json -Compress -InputObject $obj))
                            $lastPid = $pidOut
                            $lastTitle = $title
                            $lastProcName = $pName
                        }
                        $found = $true
                    }
                }
            }
        }

        # Fallback if WinApi returned no foreground window (e.g. background session or lock screen)
        if (-not $found) {
            $windowed = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } | Select-Object -First 1
            if ($windowed) {
                $pName = $windowed.ProcessName + ".exe"
                $title = $windowed.MainWindowTitle
                $wPid = $windowed.Id
                if ($wPid -ne $lastPid -or $title -ne $lastTitle) {
                    $obj = @{
                        type = "ACTIVE_WINDOW"
                        processName = $pName
                        windowTitle = $title
                        pid = $wPid
                    }
                    [Console]::WriteLine((ConvertTo-Json -Compress -InputObject $obj))
                    $lastPid = $wPid
                    $lastTitle = $title
                    $lastProcName = $pName
                }
            }
        }
    } catch {
        # ignore loop error
    }
    Start-Sleep -Milliseconds 1200
}
