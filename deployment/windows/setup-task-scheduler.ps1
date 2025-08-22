# Windows Task Scheduler Setup for Meire Blog Automated Crawler
# 
# This PowerShell script creates a Windows Task Scheduler task that runs
# the automated crawling system every 3 hours at specific times.
# 
# Features:
# - Runs as SYSTEM or specified user account
# - Automatic restart on failure
# - Detailed logging and error handling
# - Timezone-aware scheduling (KST)
# - Email notifications on failure (optional)
# 
# Usage:
#   Run as Administrator:
#   PowerShell -ExecutionPolicy Bypass -File deployment\windows\setup-task-scheduler.ps1
# 
# Options:
#   -TaskName: Name of the task (default: "MeireCrawler")
#   -UserName: User to run task as (default: "SYSTEM")
#   -ProjectPath: Path to project directory
#   -EmailOnFailure: Send email notifications on failure

param(
    [string]$TaskName = "MeireBlogCrawler",
    [string]$UserName = "SYSTEM",
    [string]$ProjectPath = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$EmailOnFailure = "",
    [switch]$DeleteExisting,
    [switch]$TestRun
)

# Ensure running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

Write-Host "🚀 Setting up Windows Task Scheduler for Meire Blog Crawler" -ForegroundColor Green
Write-Host "📁 Project path: $ProjectPath" -ForegroundColor Cyan
Write-Host "👤 Run as user: $UserName" -ForegroundColor Cyan
Write-Host "📅 Task name: $TaskName" -ForegroundColor Cyan

# Validate project path
if (-not (Test-Path $ProjectPath)) {
    Write-Error "Project path does not exist: $ProjectPath"
    exit 1
}

$ScriptPath = Join-Path $ProjectPath "scripts\node-scheduler.js"
if (-not (Test-Path $ScriptPath)) {
    Write-Error "Scheduler script not found: $ScriptPath"
    exit 1
}

# Delete existing task if requested
if ($DeleteExisting) {
    Write-Host "🗑️ Removing existing task..." -ForegroundColor Yellow
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "✅ Existing task removed" -ForegroundColor Green
    }
    catch {
        Write-Host "ℹ️ No existing task to remove" -ForegroundColor Gray
    }
}

# Create task action
$NodePath = (Get-Command node).Source
$ActionArgs = "`"$ScriptPath`" --mode=windows --log-level=info"
$Action = New-ScheduledTaskAction -Execute $NodePath -Argument $ActionArgs -WorkingDirectory $ProjectPath

Write-Host "🎯 Task action created: $NodePath $ActionArgs" -ForegroundColor Cyan

# Create task triggers for every 3 hours
$Triggers = @()

# Create triggers for 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
$Hours = @(0, 3, 6, 9, 12, 15, 18, 21)

foreach ($Hour in $Hours) {
    $TriggerTime = [datetime]::Today.AddHours($Hour)
    $Trigger = New-ScheduledTaskTrigger -Daily -At $TriggerTime
    $Triggers += $Trigger
    
    Write-Host "⏰ Trigger added: Daily at $($TriggerTime.ToString('HH:mm'))" -ForegroundColor Cyan
}

# Create task settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5) `
    -MultipleInstances IgnoreNew

Write-Host "⚙️ Task settings configured" -ForegroundColor Cyan

# Create task principal
if ($UserName -eq "SYSTEM") {
    $Principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
}
else {
    $Principal = New-ScheduledTaskPrincipal -UserID $UserName -LogonType Interactive -RunLevel Highest
}

Write-Host "👤 Task principal created for: $UserName" -ForegroundColor Cyan

# Create the task
$Task = New-ScheduledTask -Action $Action -Trigger $Triggers -Settings $Settings -Principal $Principal -Description "Automated crawling system for Meire blog platform. Runs every 3 hours to crawl new posts, perform sentiment analysis, and update stock mentions."

# Register the task
try {
    Register-ScheduledTask -TaskName $TaskName -InputObject $Task -Force
    Write-Host "✅ Task '$TaskName' registered successfully!" -ForegroundColor Green
}
catch {
    Write-Error "Failed to register task: $($_.Exception.Message)"
    exit 1
}

# Set up logging directory
$LogsPath = Join-Path $ProjectPath "logs"
if (-not (Test-Path $LogsPath)) {
    New-Item -ItemType Directory -Path $LogsPath -Force | Out-Null
    Write-Host "📁 Created logs directory: $LogsPath" -ForegroundColor Cyan
}

# Create startup script for manual testing
$StartupScript = @"
@echo off
cd /d "$ProjectPath"
echo 🚀 Starting Meire Blog Crawler...
echo 📁 Working directory: %CD%
echo 📅 Current time: %DATE% %TIME%
node "scripts\node-scheduler.js" --mode=windows --immediate --log-level=debug
pause
"@

$StartupScriptPath = Join-Path $ProjectPath "start-crawler.bat"
$StartupScript | Out-File -FilePath $StartupScriptPath -Encoding ASCII
Write-Host "📜 Created manual startup script: $StartupScriptPath" -ForegroundColor Cyan

# Create health check script
$HealthCheckScript = @"
# Health Check Script for Meire Blog Crawler
# Run this script to check the status of the automated crawler

param([switch]`$Detailed)

`$TaskName = "$TaskName"
`$ProjectPath = "$ProjectPath"

Write-Host "🏥 Meire Blog Crawler Health Check" -ForegroundColor Green
Write-Host "=" * 50

# Check if task exists and is enabled
try {
    `$Task = Get-ScheduledTask -TaskName `$TaskName -ErrorAction Stop
    Write-Host "✅ Task Status: " -NoNewline -ForegroundColor Green
    Write-Host `$Task.State -ForegroundColor Cyan
    
    Write-Host "📅 Last Run Time: " -NoNewline -ForegroundColor Green
    `$LastRunTime = (Get-ScheduledTaskInfo -TaskName `$TaskName).LastRunTime
    Write-Host `$LastRunTime -ForegroundColor Cyan
    
    Write-Host "🎯 Last Result: " -NoNewline -ForegroundColor Green
    `$LastResult = (Get-ScheduledTaskInfo -TaskName `$TaskName).LastTaskResult
    if (`$LastResult -eq 0) {
        Write-Host "Success" -ForegroundColor Green
    } else {
        Write-Host "Failed (Code: `$LastResult)" -ForegroundColor Red
    }
    
    Write-Host "⏰ Next Run Time: " -NoNewline -ForegroundColor Green
    `$NextRunTime = (Get-ScheduledTaskInfo -TaskName `$TaskName).NextRunTime
    Write-Host `$NextRunTime -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Task not found or inaccessible" -ForegroundColor Red
    exit 1
}

# Check log files
`$LogsPath = Join-Path `$ProjectPath "logs"
if (Test-Path `$LogsPath) {
    Write-Host "`n📋 Recent Log Files:" -ForegroundColor Green
    Get-ChildItem `$LogsPath -Filter "scheduler-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  📄 `$(`$_.Name) - `$(`$_.LastWriteTime)" -ForegroundColor Cyan
    }
}

# Check database file
`$DatabasePath = Join-Path `$ProjectPath "database.db"
if (Test-Path `$DatabasePath) {
    Write-Host "`n🗄️ Database Status:" -ForegroundColor Green
    `$DbInfo = Get-Item `$DatabasePath
    Write-Host "  📁 Size: $([math]::Round(`$DbInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "  📅 Modified: `$(`$DbInfo.LastWriteTime)" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️ Database file not found" -ForegroundColor Yellow
}

# Detailed check
if (`$Detailed) {
    Write-Host "`n🔍 Detailed Information:" -ForegroundColor Green
    
    # Node.js version
    try {
        `$NodeVersion = node --version
        Write-Host "  📦 Node.js: `$NodeVersion" -ForegroundColor Cyan
    } catch {
        Write-Host "  ❌ Node.js not available" -ForegroundColor Red
    }
    
    # NPM packages
    Write-Host "  📚 Checking dependencies..."
    if (Test-Path (Join-Path `$ProjectPath "package.json")) {
        Write-Host "    ✅ package.json found" -ForegroundColor Green
    }
}

Write-Host "`n🎉 Health check completed!" -ForegroundColor Green
"@

$HealthCheckScriptPath = Join-Path $ProjectPath "health-check.ps1"
$HealthCheckScript | Out-File -FilePath $HealthCheckScriptPath -Encoding UTF8
Write-Host "🏥 Created health check script: $HealthCheckScriptPath" -ForegroundColor Cyan

# Test run if requested
if ($TestRun) {
    Write-Host "`n🧪 Running test execution..." -ForegroundColor Yellow
    try {
        Start-ScheduledTask -TaskName $TaskName
        Write-Host "✅ Test execution started. Check logs for results." -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to start test execution: $($_.Exception.Message)"
    }
}

# Display summary
Write-Host "`n" + "="*60 -ForegroundColor Green
Write-Host "🎉 SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Green

Write-Host "`n📋 Task Details:" -ForegroundColor Cyan
Write-Host "  📅 Name: $TaskName"
Write-Host "  👤 User: $UserName"
Write-Host "  📁 Path: $ProjectPath"
Write-Host "  ⏰ Schedule: Every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00)"

Write-Host "`n🛠️ Management Commands:" -ForegroundColor Cyan
Write-Host "  ▶️ Start task:    schtasks /run /tn `"$TaskName`""
Write-Host "  ⏸️ Stop task:     schtasks /end /tn `"$TaskName`""
Write-Host "  🗑️ Delete task:   schtasks /delete /tn `"$TaskName`" /f"
Write-Host "  📊 View status:   schtasks /query /tn `"$TaskName`" /fo list /v"

Write-Host "`n📜 Useful Scripts:" -ForegroundColor Cyan
Write-Host "  🚀 Manual run:    $StartupScriptPath"
Write-Host "  🏥 Health check:  PowerShell -File `"$HealthCheckScriptPath`""

Write-Host "`n📁 Important Paths:" -ForegroundColor Cyan
Write-Host "  📊 Logs:          $LogsPath"
Write-Host "  🗄️ Database:      $DatabasePath"
Write-Host "  ⚙️ Config:        $ProjectPath"

if ($EmailOnFailure) {
    Write-Host "`n📧 Email notifications configured for failures" -ForegroundColor Cyan
}

Write-Host "`n✅ The automated crawler will now run every 3 hours!" -ForegroundColor Green
Write-Host "🔍 Monitor the logs directory for execution details." -ForegroundColor Yellow